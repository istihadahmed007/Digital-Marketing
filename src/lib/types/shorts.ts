export type ShortsProjectStatus = 'uploading' | 'uploaded' | 'transcribing' | 'ready' | 'failed';
export type ShortsClipRenderStatus = 'draft' | 'rendering' | 'rendered' | 'failed';
export type CropMode = 'blur_padding' | 'smart_crop' | 'fit';
export type PublishingPlatform = 'youtube' | 'facebook' | 'instagram';
export type PublishingStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed';

export interface TranscriptWord {
  word: string;
  start: number;
  end: number;
}

export interface TranscriptSegment {
  id: string;
  start: number;
  end: number;
  text: string;
  words?: TranscriptWord[];
}

export interface ShortsProject {
  id: string;
  workspace_id: string;
  title: string;
  source_video_url: string;
  storage_path?: string | null;
  duration_seconds: number;
  file_size_bytes?: number | null;
  aspect_ratio: string;
  status: ShortsProjectStatus;
  progress: number;
  transcript: TranscriptSegment[];
  error_message?: string | null;
  created_at: string;
  updated_at: string;
  clips?: ShortsClip[];
}

export interface SubtitlesStyle {
  fontSize: number;
  color: string;
  background: string;
  fontFamily: string;
  positionY: number; // percentage from top, default 72%
}

export interface ClipValidationResult {
  passed: boolean;
  durationSeconds: number;
  aspectRatio: string;
  width: number;
  height: number;
  hasAudio: boolean;
  hasVideo: boolean;
  audioRmsLevel?: number;
  luminanceVariance?: number;
  decodedSuccessfully: boolean;
  errors: string[];
  warnings: string[];
}

export interface ShortsClip {
  id: string;
  workspace_id: string;
  project_id: string;
  title: string;
  caption?: string | null;
  start_time: number;
  end_time: number;
  duration_seconds: number;
  virality_score?: number;
  hook_summary?: string;
  crop_mode: CropMode;
  subtitles_enabled: boolean;
  subtitles_style: SubtitlesStyle;
  render_status: ShortsClipRenderStatus;
  render_progress: number;
  rendered_video_url?: string | null;
  thumbnail_url?: string | null;
  validation_status: 'unverified' | 'passed' | 'failed';
  validation_details: ClipValidationResult;
  created_at: string;
  updated_at: string;
  project?: ShortsProject | null;
  publishing_jobs?: ShortsPublishingJob[];
}

export interface ShortsPublishingJob {
  id: string;
  workspace_id: string;
  clip_id: string;
  platform: PublishingPlatform;
  title: string;
  caption?: string | null;
  hashtags: string[];
  scheduled_at?: string | null;
  published_at?: string | null;
  status: PublishingStatus;
  platform_post_id?: string | null;
  platform_url?: string | null;
  error_message?: string | null;
  retry_count: number;
  idempotency_key: string;
  created_at: string;
  updated_at: string;
  clip?: ShortsClip | null;
}

export interface SocialAccountConnection {
  platform: PublishingPlatform;
  isConnected: boolean;
  accountName?: string;
  pageName?: string;
  pageId?: string;
  channelTitle?: string;
  avatarUrl?: string;
  lastVerifiedAt?: string;
}
