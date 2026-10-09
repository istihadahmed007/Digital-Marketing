-- ====================================================================
-- Migration: Shorts Studio Schema & Multi-Tenant Video Processing
-- Supports long video upload, speech transcripts, coherent clip trimming,
-- vertical 9:16 rendering, pre-publish validation, and social publishing.
-- ====================================================================

-- 1. Shorts Projects (Source long videos)
create table if not exists public.shorts_projects (
    id text primary key,
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    title text not null,
    source_video_url text not null,
    storage_path text,
    duration_seconds numeric not null default 0,
    file_size_bytes bigint,
    aspect_ratio text not null default '16:9',
    status text not null default 'ready' check (status in ('uploading', 'processing', 'transcribing', 'ready', 'failed')),
    progress integer not null default 0,
    transcript jsonb not null default '[]'::jsonb,
    error_message text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_shorts_projects_workspace on public.shorts_projects(workspace_id);
create index if not exists idx_shorts_projects_status on public.shorts_projects(status);

-- 2. Shorts Clips (Vertical 9:16 rendered / draft clips)
create table if not exists public.shorts_clips (
    id text primary key,
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    project_id text not null references public.shorts_projects(id) on delete cascade,
    title text not null,
    caption text,
    start_time numeric not null default 0,
    end_time numeric not null default 30,
    duration_seconds numeric not null default 30,
    virality_score integer not null default 85,
    hook_summary text,
    crop_mode text not null default 'blur_padding' check (crop_mode in ('blur_padding', 'smart_crop', 'fit')),
    subtitles_enabled boolean not null default true,
    subtitles_style jsonb not null default '{"fontSize": 38, "color": "#FFFFFF", "background": "rgba(0,0,0,0.75)", "fontFamily": "Inter", "positionY": 72}'::jsonb,
    render_status text not null default 'draft' check (render_status in ('draft', 'rendering', 'rendered', 'failed')),
    render_progress integer not null default 0,
    rendered_video_url text,
    thumbnail_url text,
    validation_status text not null default 'unverified' check (validation_status in ('unverified', 'passed', 'failed')),
    validation_details jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_shorts_clips_workspace on public.shorts_clips(workspace_id);
create index if not exists idx_shorts_clips_project on public.shorts_clips(project_id);
create index if not exists idx_shorts_clips_status on public.shorts_clips(render_status);

-- 3. Shorts Publishing Jobs (YouTube Shorts & Facebook Reels jobs)
create table if not exists public.shorts_publishing_jobs (
    id text primary key,
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    clip_id text not null references public.shorts_clips(id) on delete cascade,
    platform text not null check (platform in ('youtube', 'facebook', 'instagram')),
    title text not null,
    caption text,
    hashtags text[] not null default '{}',
    scheduled_at timestamptz,
    published_at timestamptz,
    status text not null default 'draft' check (status in ('draft', 'scheduled', 'publishing', 'published', 'failed')),
    platform_post_id text,
    platform_url text,
    error_message text,
    retry_count integer not null default 0,
    idempotency_key text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_shorts_jobs_workspace on public.shorts_publishing_jobs(workspace_id);
create index if not exists idx_shorts_jobs_clip on public.shorts_publishing_jobs(clip_id);
create index if not exists idx_shorts_jobs_idempotency on public.shorts_publishing_jobs(idempotency_key);
create index if not exists idx_shorts_jobs_scheduled on public.shorts_publishing_jobs(scheduled_at);

-- 4. Row Level Security (RLS)
alter table public.shorts_projects enable row level security;
alter table public.shorts_clips enable row level security;
alter table public.shorts_publishing_jobs enable row level security;

-- Workspace member isolation policies
drop policy if exists "shorts_projects_workspace_access" on public.shorts_projects;
create policy "shorts_projects_workspace_access" on public.shorts_projects
    for all
    using (
        workspace_id in (
            select workspace_id from public.workspace_members
            where user_id = auth.uid()
        )
    );

drop policy if exists "shorts_clips_workspace_access" on public.shorts_clips;
create policy "shorts_clips_workspace_access" on public.shorts_clips
    for all
    using (
        workspace_id in (
            select workspace_id from public.workspace_members
            where user_id = auth.uid()
        )
    );

drop policy if exists "shorts_jobs_workspace_access" on public.shorts_publishing_jobs;
create policy "shorts_jobs_workspace_access" on public.shorts_publishing_jobs
    for all
    using (
        workspace_id in (
            select workspace_id from public.workspace_members
            where user_id = auth.uid()
        )
    );
