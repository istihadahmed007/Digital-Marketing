-- ====================================================================
-- NexusMark CRM - Phase 2 Architectural Readiness Migration
-- Marketing Modules Schema Foundation (Forms, Campaigns, Automations, Integrations)
-- ====================================================================

-- 1. Forms & Lead Capture
create table if not exists public.forms (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    title text not null,
    slug text not null,
    description text,
    fields jsonb not null default '[]'::jsonb,
    is_published boolean not null default false,
    success_message text default 'Thank you for getting in touch! We will reach out shortly.',
    redirect_url text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint unique_workspace_form_slug unique (workspace_id, slug)
);

create table if not exists public.form_submissions (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    form_id uuid not null references public.forms(id) on delete cascade,
    contact_id uuid references public.contacts(id) on delete set null,
    data jsonb not null default '{}'::jsonb,
    ip_address text,
    user_agent text,
    created_at timestamptz not null default now()
);

-- 2. Email Campaigns
create table if not exists public.email_campaigns (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    name text not null,
    subject text not null,
    preview_text text,
    content_html text,
    status text not null check (status in ('draft', 'scheduled', 'sending', 'sent', 'archived')) default 'draft',
    scheduled_for timestamptz,
    sent_at timestamptz,
    recipient_count integer not null default 0,
    delivered_count integer not null default 0,
    opened_count integer not null default 0,
    clicked_count integer not null default 0,
    unsubscribed_count integer not null default 0,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 3. Automation Workflows
create table if not exists public.automation_workflows (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    name text not null,
    description text,
    trigger_type text not null check (trigger_type in ('form_submission', 'contact_created', 'deal_stage_changed', 'tag_added')),
    trigger_config jsonb not null default '{}'::jsonb,
    steps jsonb not null default '[]'::jsonb,
    is_active boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.automation_logs (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    workflow_id uuid not null references public.automation_workflows(id) on delete cascade,
    contact_id uuid references public.contacts(id) on delete set null,
    status text not null check (status in ('success', 'failed', 'retrying', 'skipped')),
    details jsonb not null default '{}'::jsonb,
    executed_at timestamptz not null default now()
);

-- 4. Integrations Directory & Providers (e.g. Mautic, Mailgun, Slack, Webhooks)
create table if not exists public.integrations (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    provider text not null check (provider in ('mautic', 'sendgrid', 'resend', 'slack', 'webhook', 'google_calendar')),
    name text not null,
    config jsonb not null default '{}'::jsonb,
    is_enabled boolean not null default false,
    last_synced_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint unique_workspace_provider unique (workspace_id, provider)
);

-- Enable RLS on Phase 2 Tables
alter table public.forms enable row level security;
alter table public.form_submissions enable row level security;
alter table public.email_campaigns enable row level security;
alter table public.automation_workflows enable row level security;
alter table public.automation_logs enable row level security;
alter table public.integrations enable row level security;

-- Policies for Phase 2 Tables
create policy "Tenant isolation: forms"
    on public.forms for all to authenticated
    using (public.is_workspace_member(workspace_id))
    with check (public.is_workspace_member(workspace_id));

create policy "Tenant isolation: form_submissions"
    on public.form_submissions for all to authenticated
    using (public.is_workspace_member(workspace_id))
    with check (public.is_workspace_member(workspace_id));

create policy "Tenant isolation: email_campaigns"
    on public.email_campaigns for all to authenticated
    using (public.is_workspace_member(workspace_id))
    with check (public.is_workspace_member(workspace_id));

create policy "Tenant isolation: automation_workflows"
    on public.automation_workflows for all to authenticated
    using (public.is_workspace_member(workspace_id))
    with check (public.is_workspace_member(workspace_id));

create policy "Tenant isolation: automation_logs"
    on public.automation_logs for all to authenticated
    using (public.is_workspace_member(workspace_id))
    with check (public.is_workspace_member(workspace_id));

create policy "Tenant isolation: integrations"
    on public.integrations for all to authenticated
    using (public.is_workspace_member(workspace_id))
    with check (public.is_workspace_member(workspace_id));
