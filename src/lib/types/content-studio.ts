export type PlatformType =
  | 'facebook'
  | 'instagram'
  | 'youtube_shorts'
  | 'tiktok'
  | 'blog'
  | 'email'
  | 'creative_brief';

export type ContentLanguage = 'en' | 'bn' | 'both';

export type BrandVoice =
  | 'authoritative'
  | 'conversational'
  | 'persuasive'
  | 'playful'
  | 'educational'
  | 'b2b_professional';

export type ApprovalStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected';
export type PublishingStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed';

export interface ContentGenerationParams {
  platform: PlatformType;
  topicOrPage: string;
  sourceType: 'website_page' | 'product' | 'service' | 'campaign' | 'custom_topic';
  targetUrl?: string;
  language: ContentLanguage;
  brandVoice: BrandVoice;
  targetAudience?: string;
  keyPoints?: string[];
  callToAction?: string;
  variationsCount?: number;
}

export interface ScriptScene {
  sceneNumber: number;
  timeRange: string;
  visualShot: string;
  audioVoiceover: string;
  onScreenText: string;
}

export interface GeneratedContentVariation {
  id: string;
  title: string;
  hook: string;
  hookBn?: string;
  body: string;
  bodyBn?: string;
  callToAction: string;
  callToActionBn?: string;
  hashtags: string[];
  scenes?: ScriptScene[];
  estimatedDurationSeconds?: number;
  characterCount: number;
  platformLimitWarning?: string;
}

export interface ContentGenerationResult {
  success: boolean;
  provider: 'openai' | 'gemini' | 'rule_fallback';
  modelUsed: string;
  variations: GeneratedContentVariation[];
  estimatedCostUsd?: number;
  error?: string;
}

export interface SocialPost {
  id: string;
  workspace_id: string;
  campaign_id?: string | null;
  title: string;
  platform: PlatformType;
  account_name?: string;
  connected_account_id?: string | null;
  content: string;
  content_bn?: string | null;
  hook?: string | null;
  call_to_action?: string | null;
  media_urls: string[];
  target_url?: string | null;
  hashtags: string[];
  language: ContentLanguage;
  scheduled_at?: string | null;
  timezone: string;
  approval_status: ApprovalStatus;
  publishing_status: PublishingStatus;
  published_url?: string | null;
  error_details?: string | null;
  idempotency_key: string;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContentTemplate {
  id: string;
  workspace_id: string;
  title: string;
  platform: PlatformType;
  language: ContentLanguage;
  brand_voice: BrandVoice;
  category: string;
  template_body: string;
  hooks: string[];
  sample_cta: string;
  created_at: string;
}
