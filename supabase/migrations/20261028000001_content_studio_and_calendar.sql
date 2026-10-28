-- ====================================================================
-- Migration: GrowthPilot AI Content Studio, Publishing & Marketing Calendar
-- Provides multi-platform post drafts, bilingual Bangla/English content,
-- publishing schedules, revision history, and campaign reports.
-- ====================================================================

-- 1. Social Posts & Publishing Schedule
create table if not exists public.social_posts (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    campaign_id uuid references public.email_campaigns(id) on delete set null,
    title text not null,
    platform text not null check (platform in ('facebook', 'instagram', 'youtube_shorts', 'tiktok', 'blog', 'email', 'creative_brief')),
    account_name text,
    connected_account_id text,
    content text not null,
    content_bn text,
    hook text,
    call_to_action text,
    media_urls text[] not null default '{}',
    target_url text,
    hashtags text[] not null default '{}',
    language text not null default 'both' check (language in ('en', 'bn', 'both')),
    scheduled_at timestamptz,
    timezone text not null default 'Asia/Dhaka',
    approval_status text not null default 'draft' check (approval_status in ('draft', 'pending_approval', 'approved', 'rejected')),
    publishing_status text not null default 'draft' check (publishing_status in ('draft', 'scheduled', 'publishing', 'published', 'failed')),
    published_url text,
    error_details text,
    idempotency_key text not null default md5(random()::text || clock_timestamp()::text),
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_social_posts_workspace on public.social_posts(workspace_id);
create index if not exists idx_social_posts_platform on public.social_posts(platform);
create index if not exists idx_social_posts_scheduled on public.social_posts(scheduled_at);
create index if not exists idx_social_posts_status on public.social_posts(publishing_status);
create index if not exists idx_social_posts_idempotency on public.social_posts(idempotency_key);

-- 2. Content Templates (Reusable Brand Voice Presets & Formulas)
create table if not exists public.content_templates (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    title text not null,
    platform text not null,
    language text not null default 'both',
    brand_voice text not null default 'persuasive',
    category text not null default 'general',
    template_body text not null,
    hooks jsonb not null default '[]'::jsonb,
    sample_cta text not null default 'Visit our link to learn more',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_content_templates_workspace on public.content_templates(workspace_id);

-- 3. Content Revisions (Audit trail and draft rollback)
create table if not exists public.content_revisions (
    id uuid primary key default gen_random_uuid(),
    post_id uuid not null references public.social_posts(id) on delete cascade,
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    revision_number integer not null default 1,
    content text not null,
    content_bn text,
    changed_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now()
);

create index if not exists idx_content_revisions_post on public.content_revisions(post_id);

-- 4. Marketing Weekly Performance Reports
create table if not exists public.marketing_reports (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    title text not null,
    date_range_start date not null,
    date_range_end date not null,
    summary text not null,
    metrics_snapshot jsonb not null default '{}'::jsonb,
    recommendations jsonb not null default '[]'::jsonb,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now()
);

create index if not exists idx_marketing_reports_workspace on public.marketing_reports(workspace_id);

-- Row-Level Security
alter table public.social_posts enable row level security;
alter table public.content_templates enable row level security;
alter table public.content_revisions enable row level security;
alter table public.marketing_reports enable row level security;

create policy "social_posts_workspace_isolation" on public.social_posts
    for all using (
        workspace_id in (
            select workspace_id from public.workspace_members where user_id = auth.uid()
        )
    );

create policy "content_templates_workspace_isolation" on public.content_templates
    for all using (
        workspace_id in (
            select workspace_id from public.workspace_members where user_id = auth.uid()
        )
    );

create policy "content_revisions_workspace_isolation" on public.content_revisions
    for all using (
        workspace_id in (
            select workspace_id from public.workspace_members where user_id = auth.uid()
        )
    );

create policy "marketing_reports_workspace_isolation" on public.marketing_reports
    for all using (
        workspace_id in (
            select workspace_id from public.workspace_members where user_id = auth.uid()
        )
    );
