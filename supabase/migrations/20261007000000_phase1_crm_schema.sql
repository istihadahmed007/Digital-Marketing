-- ====================================================================
-- NexusMark CRM - Phase 1 Database Migration
-- Multi-Tenant Architecture with Workspace Isolation & Supabase RLS
-- ====================================================================

-- 1. Enable UUID Extension
create extension if not exists "uuid-ossp";

-- 2. Workspaces Table
create table if not exists public.workspaces (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    slug text not null unique,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 3. Workspace Members Table
create table if not exists public.workspace_members (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    role text not null check (role in ('owner', 'admin', 'member')) default 'member',
    created_at timestamptz not null default now(),
    constraint unique_workspace_user unique (workspace_id, user_id)
);

-- 4. RLS Helper Function: Check Workspace Membership
create or replace function public.is_workspace_member(check_workspace_id uuid)
returns boolean
language sql
security definer
stable
as $$
    select exists (
        select 1
        from public.workspace_members
        where workspace_id = check_workspace_id
          and user_id = auth.uid()
    );
$$;

-- 5. Companies Table
create table if not exists public.companies (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    name text not null,
    domain text,
    industry text,
    size text,
    phone text,
    city text,
    country text,
    tags text[] not null default '{}',
    is_archived boolean not null default false,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 6. Contacts Table
create table if not exists public.contacts (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    company_id uuid references public.companies(id) on delete set null,
    first_name text not null,
    last_name text not null default '',
    email text not null,
    phone text,
    job_title text,
    lead_status text not null check (lead_status in ('new', 'contacted', 'qualified', 'unqualified', 'customer')) default 'new',
    lifecycle_stage text not null check (lifecycle_stage in ('subscriber', 'lead', 'mql', 'sql', 'opportunity', 'customer')) default 'lead',
    tags text[] not null default '{}',
    is_archived boolean not null default false,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint unique_workspace_contact_email unique (workspace_id, email)
);

-- 7. Deals Table
create table if not exists public.deals (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    company_id uuid references public.companies(id) on delete set null,
    contact_id uuid references public.contacts(id) on delete set null,
    title text not null,
    amount numeric(14, 2) not null default 0.00,
    currency text not null default 'USD',
    stage text not null check (stage in ('lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost')) default 'lead',
    probability integer not null check (probability >= 0 and probability <= 100) default 20,
    expected_close_date date,
    owner_id uuid references auth.users(id) on delete set null,
    is_archived boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 8. Activities Table (Timeline & Logs)
create table if not exists public.activities (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    contact_id uuid references public.contacts(id) on delete cascade,
    company_id uuid references public.companies(id) on delete cascade,
    deal_id uuid references public.deals(id) on delete cascade,
    type text not null check (type in ('note', 'call', 'meeting', 'email', 'status_change', 'deal_created', 'stage_change')),
    title text not null,
    description text,
    user_id uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now()
);

-- 9. Tasks Table
create table if not exists public.tasks (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    contact_id uuid references public.contacts(id) on delete set null,
    company_id uuid references public.companies(id) on delete set null,
    deal_id uuid references public.deals(id) on delete set null,
    title text not null,
    description text,
    due_date timestamptz,
    priority text not null check (priority in ('low', 'medium', 'high', 'urgent')) default 'medium',
    status text not null check (status in ('pending', 'in_progress', 'completed', 'cancelled')) default 'pending',
    assigned_to uuid references auth.users(id) on delete set null,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Indexes for Fast Querying and Tenant Filtering
create index if not exists idx_workspace_members_user on public.workspace_members(user_id);
create index if not exists idx_workspace_members_workspace on public.workspace_members(workspace_id);
create index if not exists idx_companies_workspace on public.companies(workspace_id);
create index if not exists idx_contacts_workspace on public.contacts(workspace_id);
create index if not exists idx_contacts_company on public.contacts(company_id);
create index if not exists idx_deals_workspace on public.deals(workspace_id);
create index if not exists idx_deals_stage on public.deals(stage);
create index if not exists idx_activities_workspace on public.activities(workspace_id);
create index if not exists idx_activities_contact on public.activities(contact_id);
create index if not exists idx_activities_deal on public.activities(deal_id);
create index if not exists idx_tasks_workspace on public.tasks(workspace_id);
create index if not exists idx_tasks_status on public.tasks(status);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.companies enable row level security;
alter table public.contacts enable row level security;
alter table public.deals enable row level security;
alter table public.activities enable row level security;
alter table public.tasks enable row level security;

-- Policies: Workspaces
create policy "Users can view workspaces they belong to"
    on public.workspaces for select
    to authenticated
    using (
        exists (
            select 1 from public.workspace_members
            where workspace_members.workspace_id = workspaces.id
              and workspace_members.user_id = auth.uid()
        )
    );

create policy "Users can create new workspaces"
    on public.workspaces for insert
    to authenticated
    with check (true);

create policy "Owners and admins can update their workspace"
    on public.workspaces for update
    to authenticated
    using (
        exists (
            select 1 from public.workspace_members
            where workspace_members.workspace_id = workspaces.id
              and workspace_members.user_id = auth.uid()
              and workspace_members.role in ('owner', 'admin')
        )
    );

-- Policies: Workspace Members
create policy "Members can view members in their workspace"
    on public.workspace_members for select
    to authenticated
    using (
        user_id = auth.uid()
        or public.is_workspace_member(workspace_id)
    );

create policy "Users can add initial membership on workspace creation"
    on public.workspace_members for insert
    to authenticated
    with check (
        user_id = auth.uid()
        or exists (
            select 1 from public.workspace_members wm
            where wm.workspace_id = workspace_members.workspace_id
              and wm.user_id = auth.uid()
              and wm.role in ('owner', 'admin')
        )
    );

create policy "Owners and admins can update memberships"
    on public.workspace_members for update
    to authenticated
    using (
        exists (
            select 1 from public.workspace_members wm
            where wm.workspace_id = workspace_members.workspace_id
              and wm.user_id = auth.uid()
              and wm.role in ('owner', 'admin')
        )
    );

create policy "Owners and admins can remove members"
    on public.workspace_members for delete
    to authenticated
    using (
        exists (
            select 1 from public.workspace_members wm
            where wm.workspace_id = workspace_members.workspace_id
              and wm.user_id = auth.uid()
              and wm.role in ('owner', 'admin')
        )
    );

-- Policies: Companies
create policy "Tenant isolation: select companies"
    on public.companies for select
    to authenticated
    using (public.is_workspace_member(workspace_id));

create policy "Tenant isolation: insert companies"
    on public.companies for insert
    to authenticated
    with check (public.is_workspace_member(workspace_id));

create policy "Tenant isolation: update companies"
    on public.companies for update
    to authenticated
    using (public.is_workspace_member(workspace_id));

create policy "Tenant isolation: delete companies"
    on public.companies for delete
    to authenticated
    using (public.is_workspace_member(workspace_id));

-- Policies: Contacts
create policy "Tenant isolation: select contacts"
    on public.contacts for select
    to authenticated
    using (public.is_workspace_member(workspace_id));

create policy "Tenant isolation: insert contacts"
    on public.contacts for insert
    to authenticated
    with check (public.is_workspace_member(workspace_id));

create policy "Tenant isolation: update contacts"
    on public.contacts for update
    to authenticated
    using (public.is_workspace_member(workspace_id));

create policy "Tenant isolation: delete contacts"
    on public.contacts for delete
    to authenticated
    using (public.is_workspace_member(workspace_id));

-- Policies: Deals
create policy "Tenant isolation: select deals"
    on public.deals for select
    to authenticated
    using (public.is_workspace_member(workspace_id));

create policy "Tenant isolation: insert deals"
    on public.deals for insert
    to authenticated
    with check (public.is_workspace_member(workspace_id));

create policy "Tenant isolation: update deals"
    on public.deals for update
    to authenticated
    using (public.is_workspace_member(workspace_id));

create policy "Tenant isolation: delete deals"
    on public.deals for delete
    to authenticated
    using (public.is_workspace_member(workspace_id));

-- Policies: Activities
create policy "Tenant isolation: select activities"
    on public.activities for select
    to authenticated
    using (public.is_workspace_member(workspace_id));

create policy "Tenant isolation: insert activities"
    on public.activities for insert
    to authenticated
    with check (public.is_workspace_member(workspace_id));

create policy "Tenant isolation: update activities"
    on public.activities for update
    to authenticated
    using (public.is_workspace_member(workspace_id));

create policy "Tenant isolation: delete activities"
    on public.activities for delete
    to authenticated
    using (public.is_workspace_member(workspace_id));

-- Policies: Tasks
create policy "Tenant isolation: select tasks"
    on public.tasks for select
    to authenticated
    using (public.is_workspace_member(workspace_id));

create policy "Tenant isolation: insert tasks"
    on public.tasks for insert
    to authenticated
    with check (public.is_workspace_member(workspace_id));

create policy "Tenant isolation: update tasks"
    on public.tasks for update
    to authenticated
    using (public.is_workspace_member(workspace_id));

create policy "Tenant isolation: delete tasks"
    on public.tasks for delete
    to authenticated
    using (public.is_workspace_member(workspace_id));
