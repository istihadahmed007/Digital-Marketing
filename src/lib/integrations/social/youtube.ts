import { safeFetch } from '@/lib/security/ssrf';

export interface YouTubeCredentials {
  accessToken?: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
}

export interface YouTubeUploadParams {
  title: string;
  description: string;
  tags?: string[];
  privacyStatus?: 'public' | 'unlisted' | 'private';
  categoryId?: string;
  publishAt?: string; // Scheduled release timestamp in ISO-8601
  videoBuffer?: Buffer | Uint8Array;
  videoUrl?: string;
  idempotencyKey?: string;
}

export interface YouTubePublishResult {
  success: boolean;
  videoId?: string;
  videoUrl?: string;
  uploadStatus?: 'uploaded' | 'processed' | 'failed' | 'rejected';
  rejectionReason?: string;
  error?: string;
}

export interface BulkPublishItem {
  id: string; // Clip ID
  title: string;
  description?: string;
  tags?: string[];
  privacyStatus?: 'public' | 'unlisted' | 'private';
  categoryId?: string;
  publishAt?: string;
  videoUrl?: string;
  videoBuffer?: Buffer | Uint8Array;
  idempotencyKey?: string;
}

export interface BulkPublishProgress {
  total: number;
  completed: number;
  failed: number;
  results: Record<string, YouTubePublishResult>;
}

export class YouTubeDataApiClient {
  private credentials: YouTubeCredentials;

  constructor(credentials: YouTubeCredentials = {}) {
    this.credentials = credentials;
  }

  /**
   * Resolves a valid OAuth2 Access Token using direct token or refresh exchange.
   */
  async getAccessToken(): Promise<string | null> {
    if (this.credentials.accessToken) {
      return this.credentials.accessToken;
    }

    const clientId = this.credentials.clientId || process.env.GOOGLE_CLIENT_ID;
    const clientSecret = this.credentials.clientSecret || process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = this.credentials.refreshToken || process.env.GOOGLE_REFRESH_TOKEN;

    if (refreshToken && clientId && clientSecret) {
      try {
        const res = await safeFetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
          }).toString(),
          timeoutMs: 10000,
        });

        if (res.ok) {
          const data = await res.json();
          return data.access_token || null;
        }
      } catch (err) {
        console.error('YouTube OAuth refresh error:', err);
      }
    }

    return null;
  }

  /**
   * Verifies connection and retrieves authenticated channel information.
   */
  async verifyConnection(): Promise<{
    valid: boolean;
    channelTitle?: string;
    channelId?: string;
    error?: string;
  }> {
    const token = await this.getAccessToken();
    if (!token) {
      return {
        valid: false,
        error: 'No active Google/YouTube OAuth token available. Connect YouTube channel in Settings.',
      };
    }

    try {
      const res = await safeFetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        timeoutMs: 8000,
      });

      if (!res.ok) {
        if (res.status === 401) {
          return { valid: false, error: 'YouTube OAuth token has expired or is unauthorized. Please reconnect.' };
        }
        if (res.status === 403) {
          const errData = await res.json().catch(() => ({}));
          const reason = errData.error?.errors?.[0]?.reason;
          if (reason === 'quotaExceeded') {
            return { valid: false, error: 'YouTube Data API daily quota limit reached for this Google Cloud project.' };
          }
          return { valid: false, error: 'YouTube upload permission missing. Please authorize with YouTube upload scope.' };
        }
        return { valid: false, error: `YouTube API returned HTTP ${res.status}` };
      }

      const data = await res.json();
      const channel = data.items?.[0];
      if (!channel) {
        return { valid: false, error: 'No YouTube channel found for this Google account. Please create a channel at youtube.com.' };
      }

      return {
        valid: true,
        channelTitle: channel.snippet?.title || 'YouTube Channel',
        channelId: channel.id,
      };
    } catch (err: any) {
      return { valid: false, error: err.message || 'Failed to verify YouTube connection' };
    }
  }

  /**
   * Checks real-time transcoding and processing status of an uploaded video on YouTube.
   */
  async checkProcessingStatus(videoId: string): Promise<{
    status: 'uploaded' | 'processed' | 'processing' | 'failed' | 'rejected';
    rejectionReason?: string;
    error?: string;
  }> {
    const token = await this.getAccessToken();
    if (!token) {
      return { status: 'failed', error: 'Authentication token required.' };
    }

    try {
      const res = await safeFetch(
        `https://www.googleapis.com/youtube/v3/videos?part=status,processingDetails&id=${encodeURIComponent(videoId)}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
          timeoutMs: 10000,
        }
      );

      if (!res.ok) {
        return { status: 'processing', error: `Status check HTTP ${res.status}` };
      }

      const data = await res.json();
      const videoItem = data.items?.[0];
      if (!videoItem) {
        return { status: 'failed', error: 'Video not found on YouTube.' };
      }

      const uploadStatus = videoItem.status?.uploadStatus; // 'uploaded' | 'processed' | 'failed' | 'rejected'
      const rejectionReason = videoItem.status?.rejectionReason;
      const processingStatus = videoItem.processingDetails?.processingStatus; // 'processing' | 'succeeded' | 'failed' | 'terminated'

      if (uploadStatus === 'rejected') {
        return { status: 'rejected', rejectionReason: rejectionReason || 'Video rejected by YouTube' };
      }
      if (uploadStatus === 'failed' || processingStatus === 'failed') {
        return { status: 'failed', error: 'YouTube processing failed during transcoding.' };
      }
      if (uploadStatus === 'processed' || processingStatus === 'succeeded') {
        return { status: 'processed' };
      }

      return { status: 'uploaded' };
    } catch (err: any) {
      return { status: 'processing', error: err.message };
    }
  }

  /**
   * Uploads a 9:16 vertical video as a YouTube Short via YouTube Data API v3 Resumable Upload.
   */
  async publishShort(params: YouTubeUploadParams): Promise<YouTubePublishResult> {
    const token = await this.getAccessToken();
    if (!token) {
      return {
        success: false,
        error: 'YouTube authentication token required. Connect your YouTube channel in Settings.',
      };
    }

    // Ensure title includes #Shorts for algorithmic discovery
    let finalTitle = params.title.trim();
    if (!finalTitle.toLowerCase().includes('#shorts')) {
      finalTitle = `${finalTitle} #Shorts`.slice(0, 100);
    }

    let finalDescription = (params.description || '').trim();
    if (!finalDescription.toLowerCase().includes('#shorts')) {
      finalDescription = `${finalDescription}\n\n#Shorts #Viral #Trending`;
    }

    const privacy = params.privacyStatus || 'public';
    const statusPayload: Record<string, any> = {
      privacyStatus: params.publishAt ? 'private' : privacy,
      selfDeclaredMadeForKids: false,
    };

    if (params.publishAt) {
      statusPayload.publishAt = params.publishAt;
    }

    const metadata = {
      snippet: {
        title: finalTitle,
        description: finalDescription,
        tags: params.tags && params.tags.length > 0 ? params.tags : ['Shorts', 'Video', 'Marketing'],
        categoryId: params.categoryId || '22', // People & Blogs default
      },
      status: statusPayload,
    };

    try {
      // Step 1: Initiate Resumable Upload Session
      const initRes = await safeFetch(
        'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json; charset=UTF-8',
            'X-Upload-Content-Type': 'video/mp4',
          },
          body: JSON.stringify(metadata),
          timeoutMs: 15000,
        }
      );

      if (!initRes.ok) {
        const errJson = await initRes.json().catch(() => ({}));
        const errReason = errJson.error?.errors?.[0]?.reason;
        if (errReason === 'quotaExceeded') {
          return {
            success: false,
            error: 'YouTube API daily upload quota exceeded for this Google Cloud project. You can request a quota extension in Google Cloud Console or retry after quota reset (midnight PT).',
          };
        }
        return {
          success: false,
          error: errJson.error?.message || `YouTube upload initiation failed with HTTP ${initRes.status}`,
        };
      }

      const uploadUrl = initRes.headers.get('location');
      if (!uploadUrl) {
        return {
          success: false,
          error: 'YouTube API did not return a valid upload location header.',
        };
      }

      // Step 2: Upload Video Binary Stream
      let binaryPayload: BodyInit = '';
      let contentLength = 0;

      if (params.videoBuffer) {
        binaryPayload = params.videoBuffer as any;
        contentLength = params.videoBuffer.length;
      } else if (params.videoUrl) {
        const fetchVideo = await safeFetch(params.videoUrl, { method: 'GET', timeoutMs: 45000 });
        if (!fetchVideo.ok) {
          return { success: false, error: 'Could not download rendered video buffer for upload.' };
        }
        const arrayBuf = await fetchVideo.arrayBuffer();
        binaryPayload = arrayBuf;
        contentLength = arrayBuf.byteLength;
      } else {
        return {
          success: false,
          error: 'No video stream or accessible file provided for YouTube upload.',
        };
      }

      const uploadRes = await safeFetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Length': contentLength.toString(),
        },
        body: binaryPayload,
        timeoutMs: 90000,
      });

      if (!uploadRes.ok) {
        const errText = await uploadRes.text().catch(() => '');
        return {
          success: false,
          error: `YouTube video transfer failed: HTTP ${uploadRes.status} ${errText}`,
        };
      }

      const resultData = await uploadRes.json();
      const videoId = resultData.id;

      return {
        success: true,
        videoId,
        videoUrl: `https://www.youtube.com/shorts/${videoId}`,
        uploadStatus: 'uploaded',
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Unexpected failure uploading video to YouTube.',
      };
    }
  }

  /**
   * Publishes multiple Shorts with bounded concurrency to prevent quota burst and timeouts.
   */
  async publishShortsBulk(
    items: BulkPublishItem[],
    options: { concurrency?: number } = {}
  ): Promise<Record<string, YouTubePublishResult>> {
    const concurrency = Math.max(1, Math.min(options.concurrency || 2, 4));
    const results: Record<string, YouTubePublishResult> = {};
    const queue = [...items];

    const worker = async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) break;

        try {
          const res = await this.publishShort({
            title: item.title,
            description: item.description || '',
            tags: item.tags,
            privacyStatus: item.privacyStatus,
            categoryId: item.categoryId,
            publishAt: item.publishAt,
            videoUrl: item.videoUrl,
            videoBuffer: item.videoBuffer,
            idempotencyKey: item.idempotencyKey,
          });
          results[item.id] = res;
        } catch (err: any) {
          results[item.id] = {
            success: false,
            error: err.message || 'Bulk publishing task error',
          };
        }
      }
    };

    const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
    await Promise.all(workers);

    return results;
  }
}
