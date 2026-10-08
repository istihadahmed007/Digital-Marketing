-- ====================================================================
-- NexusMark CRM - Real Email Delivery Events, Automation Idempotency & Safe Integration Vault
-- ====================================================================

-- 1. Email Campaign Sends & Real Event Tracking
create table if not exists public.email_campaign_events (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    campaign_id uuid not null references public.email_campaigns(id) on delete cascade,
    contact_id uuid references public.contacts(id) on delete set null,
    recipient_email text not null,
    provider text not null default 'resend',
    provider_message_id text,
    status text not null check (status in ('queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'unsubscribed', 'failed')),
    error_message text,
    idempotency_key text not null,
    event_payload jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint unique_campaign_contact_send unique (campaign_id, recipient_email)
);

create index if not exists idx_campaign_events_campaign_id on public.email_campaign_events(campaign_id);
create index if not exists idx_campaign_events_message_id on public.email_campaign_events(provider_message_id);

-- 2. Automation Trigger Deduplication Table (Ensures only-once execution per entity event)
create table if not exists public.automation_event_triggers (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    workflow_id uuid not null references public.automation_workflows(id) on delete cascade,
    trigger_type text not null,
    entity_id text not null, -- contact_id, form_submission_id, deal_id, etc.
    idempotency_key text not null unique,
    status text not null check (status in ('processing', 'completed', 'failed')),
    created_at timestamptz not null default now()
);

-- 3. Automation Step Execution Logs (Per-step durable audit trail)
create table if not exists public.automation_step_logs (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    workflow_id uuid not null references public.automation_workflows(id) on delete cascade,
    log_id uuid references public.automation_logs(id) on delete cascade,
    step_id text not null,
    step_type text not null,
    step_title text not null,
    status text not null check (status in ('pending', 'running', 'completed', 'failed', 'skipped')),
    error_message text,
    output jsonb not null default '{}'::jsonb,
    executed_at timestamptz not null default now()
);

-- 4. Enable RLS
alter table public.email_campaign_events enable row level security;
alter table public.automation_event_triggers enable row level security;
alter table public.automation_step_logs enable row level security;

drop policy if exists "Tenant isolation: email_campaign_events" on public.email_campaign_events;
create policy "Tenant isolation: email_campaign_events"
    on public.email_campaign_events for all to authenticated
    using (public.is_workspace_member(workspace_id))
    with check (public.is_workspace_member(workspace_id));

drop policy if exists "Tenant isolation: automation_event_triggers" on public.automation_event_triggers;
create policy "Tenant isolation: automation_event_triggers"
    on public.automation_event_triggers for all to authenticated
    using (public.is_workspace_member(workspace_id))
    with check (public.is_workspace_member(workspace_id));

drop policy if exists "Tenant isolation: automation_step_logs" on public.automation_step_logs;
create policy "Tenant isolation: automation_step_logs"
    on public.automation_step_logs for all to authenticated
    using (public.is_workspace_member(workspace_id))
    with check (public.is_workspace_member(workspace_id));
