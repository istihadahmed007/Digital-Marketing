-- ====================================================================
-- NexusMark Visual Workflow Builder & Durable Execution Engine Schema
-- ====================================================================

-- 1. Upgrade automation_workflows table
alter table public.automation_workflows
    add column if not exists status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'error')),
    add column if not exists version int not null default 1,
    add column if not exists nodes jsonb not null default '[]'::jsonb,
    add column if not exists edges jsonb not null default '[]'::jsonb,
    add column if not exists viewport jsonb not null default '{"x": 0, "y": 0, "zoom": 1}'::jsonb,
    add column if not exists published_at timestamptz,
    add column if not exists last_executed_at timestamptz,
    add column if not exists webhook_token text,
    add column if not exists webhook_slug text unique,
    add column if not exists published_by uuid references auth.users(id) on delete set null;

create index if not exists idx_automation_workflows_status on public.automation_workflows(status);
create index if not exists idx_automation_workflows_webhook_slug on public.automation_workflows(webhook_slug);

-- 2. Durable Workflow Executions Table (Tracks run-level state)
create table if not exists public.workflow_executions (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    workflow_id uuid not null references public.automation_workflows(id) on delete cascade,
    workflow_version int not null default 1,
    trigger_type text not null,
    trigger_data jsonb not null default '{}'::jsonb,
    status text not null check (status in ('queued', 'running', 'succeeded', 'failed', 'waiting', 'cancelled')),
    is_dry_run boolean not null default false,
    idempotency_key text not null,
    retry_count int not null default 0,
    max_retries int not null default 3,
    next_retry_at timestamptz,
    error_message text,
    started_at timestamptz not null default now(),
    completed_at timestamptz,
    duration_ms int,
    created_at timestamptz not null default now(),
    constraint unique_workflow_exec_idempotency unique (workspace_id, idempotency_key)
);

create index if not exists idx_workflow_executions_workspace on public.workflow_executions(workspace_id);
create index if not exists idx_workflow_executions_workflow on public.workflow_executions(workflow_id);
create index if not exists idx_workflow_executions_status on public.workflow_executions(status);
create index if not exists idx_workflow_executions_created_at on public.workflow_executions(created_at desc);

-- 3. Workflow Node Executions Table (Detailed step-by-step trace)
create table if not exists public.workflow_node_executions (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    execution_id uuid not null references public.workflow_executions(id) on delete cascade,
    node_id text not null,
    node_type text not null,
    node_label text not null,
    status text not null check (status in ('queued', 'running', 'succeeded', 'failed', 'skipped', 'waiting')),
    input_data jsonb not null default '{}'::jsonb,
    output_data jsonb not null default '{}'::jsonb,
    error_message text,
    started_at timestamptz not null default now(),
    completed_at timestamptz,
    duration_ms int,
    created_at timestamptz not null default now()
);

create index if not exists idx_node_executions_execution_id on public.workflow_node_executions(execution_id);
create index if not exists idx_node_executions_node_id on public.workflow_node_executions(node_id);

-- 4. Workflow Audit Logs Table (Publishing, pausing, editing, retries)
create table if not exists public.workflow_audit_logs (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    workflow_id uuid references public.automation_workflows(id) on delete set null,
    user_id uuid references auth.users(id) on delete set null,
    action text not null check (action in ('created', 'updated', 'published', 'paused', 'deleted', 'retried')),
    version int,
    details jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists idx_workflow_audit_workspace on public.workflow_audit_logs(workspace_id);
create index if not exists idx_workflow_audit_workflow on public.workflow_audit_logs(workflow_id);

-- 5. Enable Row Level Security (RLS)
alter table public.workflow_executions enable row level security;
alter table public.workflow_node_executions enable row level security;
alter table public.workflow_audit_logs enable row level security;

-- 6. Idempotent RLS Policies
drop policy if exists "Tenant isolation: workflow_executions" on public.workflow_executions;
create policy "Tenant isolation: workflow_executions"
    on public.workflow_executions for all to authenticated
    using (public.is_workspace_member(workspace_id))
    with check (public.is_workspace_member(workspace_id));

drop policy if exists "Tenant isolation: workflow_node_executions" on public.workflow_node_executions;
create policy "Tenant isolation: workflow_node_executions"
    on public.workflow_node_executions for all to authenticated
    using (public.is_workspace_member(workspace_id))
    with check (public.is_workspace_member(workspace_id));

drop policy if exists "Tenant isolation: workflow_audit_logs" on public.workflow_audit_logs;
create policy "Tenant isolation: workflow_audit_logs"
    on public.workflow_audit_logs for all to authenticated
    using (public.is_workspace_member(workspace_id))
    with check (public.is_workspace_member(workspace_id));
