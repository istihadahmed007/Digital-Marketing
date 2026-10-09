import { safeFetch } from '@/lib/security/ssrf';

export interface MetaCredentials {
  accessToken?: string;
  pageId?: string;
  appId?: string;
  appSecret?: string;
}

export interface MetaPublishParams {
  title: string;
  description: string;
  videoUrl?: string;
  videoBuffer?: Buffer | Uint8Array;
  idempotencyKey?: string;
}

export interface MetaPublishResult {
  success: boolean;
  reelId?: string;
  permalinkUrl?: string;
  error?: string;
}

export class MetaGraphApiClient {
  private credentials: MetaCredentials;
  private apiVersion: string = 'v19.0';

  constructor(credentials: MetaCredentials = {}) {
    this.credentials = credentials;
  }

  private getAccessToken(): string | null {
    return this.credentials.accessToken || process.env.META_ACCESS_TOKEN || null;
  }

  private getPageId(): string | null {
    return this.credentials.pageId || process.env.META_PAGE_ID || null;
  }

  /**
   * Verifies access token and resolves connected Facebook Page / Instagram account.
   */
  async verifyConnection(): Promise<{
    valid: boolean;
    pageName?: string;
    pageId?: string;
    error?: string;
  }> {
    const token = this.getAccessToken();
    if (!token) {
      return {
        valid: false,
        error: 'Meta access token required. Connect your Facebook Page in Settings.',
      };
    }

    try {
      const pageId = this.getPageId();
      const endpoint = pageId
        ? `https://graph.facebook.com/${this.apiVersion}/${pageId}?fields=name,id,verification_status&access_token=${encodeURIComponent(token)}`
        : `https://graph.facebook.com/${this.apiVersion}/me/accounts?fields=name,id,access_token&access_token=${encodeURIComponent(token)}`;

      const res = await safeFetch(endpoint, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        timeoutMs: 8000,
      });

      if (!res.ok) {
        if (res.status === 401) {
          return { valid: false, error: 'Facebook / Meta access token is expired or invalid.' };
        }
        if (res.status === 403) {
          return { valid: false, error: 'Token missing pages_manage_posts or publish_video permissions.' };
        }
        return { valid: false, error: `Meta API returned HTTP ${res.status}` };
      }

      const data = await res.json();
      if (pageId && data.id) {
        return { valid: true, pageName: data.name || 'Facebook Page', pageId: data.id };
      }

      const firstPage = data.data?.[0];
      if (firstPage) {
        return { valid: true, pageName: firstPage.name, pageId: firstPage.id };
      }

      return {
        valid: true,
        pageName: 'Verified Meta Account',
        pageId: 'me',
      };
    } catch (err: any) {
      return { valid: false, error: err.message || 'Failed to verify Meta Graph API connection.' };
    }
  }

  /**
   * Publishes a vertical video as a Facebook Reel using the official Reels Publishing API.
   */
  async publishReel(params: MetaPublishParams): Promise<MetaPublishResult> {
    const token = this.getAccessToken();
    const pageId = this.getPageId() || 'me';

    if (!token) {
      return {
        success: false,
        error: 'Meta/Facebook access token required. Connect your Facebook Page in Settings.',
      };
    }

    const caption = `${params.title}\n\n${params.description || ''} #Reels #Shorts`.trim();

    try {
      // Step 1: Initialize Reels Upload Session
      const initEndpoint = `https://graph.facebook.com/${this.apiVersion}/${pageId}/video_reels`;
      const initRes = await safeFetch(initEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          upload_phase: 'start',
          access_token: token,
        }),
        timeoutMs: 12000,
      });

      if (!initRes.ok) {
        const errJson = await initRes.json().catch(() => ({}));
        // Fallback to standard Page Video endpoint if Reels API permissions are in review
        return this.fallbackStandardVideoPost(pageId, token, caption, params);
      }

      const initData = await initRes.json();
      const videoId = initData.video_id;
      const uploadUrl = initData.upload_url;

      // Step 2: Binary Video Transfer
      if (uploadUrl && (params.videoBuffer || params.videoUrl)) {
        let binaryPayload: BodyInit = '';
        let contentLength = 0;

        if (params.videoBuffer) {
          binaryPayload = params.videoBuffer as any;
          contentLength = params.videoBuffer.length;
        } else if (params.videoUrl) {
          const fetchRes = await safeFetch(params.videoUrl, { method: 'GET', timeoutMs: 30000 });
          if (fetchRes.ok) {
            const arr = await fetchRes.arrayBuffer();
            binaryPayload = arr;
            contentLength = arr.byteLength;
          }
        }

        if (binaryPayload && contentLength > 0) {
          const binaryRes = await safeFetch(uploadUrl, {
            method: 'POST',
            headers: {
              Authorization: `OAuth ${token}`,
              offset: '0',
              file_size: contentLength.toString(),
            },
            body: binaryPayload,
            timeoutMs: 60000,
          });

          if (!binaryRes.ok) {
            return { success: false, error: `Reel binary transfer failed with HTTP ${binaryRes.status}` };
          }
        }
      }

      // Step 3: Finish & Publish Phase
      const finishEndpoint = `https://graph.facebook.com/${this.apiVersion}/${pageId}/video_reels`;
      const finishRes = await safeFetch(finishEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          upload_phase: 'finish',
          access_token: token,
          video_id: videoId,
          video_state: 'PUBLISHED',
          description: caption,
        }),
        timeoutMs: 15000,
      });

      if (!finishRes.ok) {
        const errJson = await finishRes.json().catch(() => ({}));
        return {
          success: false,
          error: errJson.error?.message || `Meta Reels publish failed with HTTP ${finishRes.status}`,
        };
      }

      return {
        success: true,
        reelId: videoId,
        permalinkUrl: `https://www.facebook.com/reel/${videoId}`,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Unexpected error publishing Reel to Meta.',
      };
    }
  }

  /**
   * Fallback for standard Facebook Page Video publishing.
   */
  private async fallbackStandardVideoPost(
    pageId: string,
    token: string,
    description: string,
    params: MetaPublishParams
  ): Promise<MetaPublishResult> {
    try {
      const endpoint = `https://graph.facebook.com/${this.apiVersion}/${pageId}/videos`;
      const bodyPayload: Record<string, any> = {
        description,
        title: params.title,
        access_token: token,
      };

      if (params.videoUrl) {
        bodyPayload.file_url = params.videoUrl;
      }

      const res = await safeFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
        timeoutMs: 20000,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        return {
          success: false,
          error: errJson.error?.message || `Facebook Video Post failed with HTTP ${res.status}`,
        };
      }

      const data = await res.json();
      return {
        success: true,
        reelId: data.id,
        permalinkUrl: `https://www.facebook.com/${data.id}`,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Failed standard Facebook video publication',
      };
    }
  }
}
