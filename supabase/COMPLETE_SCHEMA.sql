-- ====================================================================
-- NexusMark CRM & SEO Platform — Complete Master Database Schema
-- Multi-Tenant Workspace Architecture with PostgreSQL Row Level Security (RLS)
-- Paste this entire file into your Supabase project's SQL Editor and click "Run".
-- ====================================================================

-- 1. Enable Required Extensions
create extension if not exists "uuid-ossp";

-- ====================================================================
-- CORE WORKSPACE & MEMBERSHIP TABLES
-- ====================================================================

-- 2. Workspaces
create table if not exists public.workspaces (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    slug text not null unique,
    created_by uuid references auth.users(id) default auth.uid(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.workspaces add column if not exists created_by uuid references auth.users(id) default auth.uid();

-- 3. Workspace Members
create table if not exists public.workspace_members (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    role text not null check (role in ('owner', 'admin', 'member')) default 'member',
    created_at timestamptz not null default now(),
    constraint unique_workspace_user unique (workspace_id, user_id)
);

-- 4. RLS Security Helper Function: Checks Workspace Membership
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

-- ====================================================================
-- CORE CRM TABLES
-- ====================================================================

-- 5. Companies
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

-- 6. Contacts (With Lead Scoring & Marketing Attribution)
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
    owner_id uuid references auth.users(id) on delete set null,
    source text not null default 'direct',
    consent_status text not null default 'pending',
    custom_fields jsonb not null default '{}'::jsonb,
    lead_score integer not null default 0,
    lead_score_reasons jsonb not null default '[]'::jsonb,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    utm_term text,
    utm_content text,
    referrer text,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint unique_workspace_contact_email unique (workspace_id, email)
);

-- 7. Configurable Pipelines and Stages
create table if not exists public.pipelines (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    name text not null,
    is_default boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.pipeline_stages (
    id uuid primary key default gen_random_uuid(),
    pipeline_id uuid not null references public.pipelines(id) on delete cascade,
    name text not null,
    order_index integer not null default 0,
    probability integer not null default 20 check (probability >= 0 and probability <= 100),
    color text not null default '#6366f1',
    created_at timestamptz not null default now()
);

-- 8. Deals (Sales Pipeline)
create table if not exists public.deals (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    company_id uuid references public.companies(id) on delete set null,
    contact_id uuid references public.contacts(id) on delete set null,
    pipeline_id uuid references public.pipelines(id) on delete set null,
    stage_id uuid references public.pipeline_stages(id) on delete set null,
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

-- 9. Deal Stage History (Audit Trail)
create table if not exists public.deal_stage_history (
    id uuid primary key default gen_random_uuid(),
    deal_id uuid not null references public.deals(id) on delete cascade,
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    from_stage text,
    to_stage text not null,
    amount numeric(14, 2) default 0.00,
    changed_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now()
);

-- 10. Saved Contact Views & Filter Presets
create table if not exists public.contact_views (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    name text not null,
    filters jsonb not null default '{}'::jsonb,
    is_default boolean not null default false,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now()
);

-- 11. Activities (Timeline & Audit Trail)
create table if not exists public.activities (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    contact_id uuid references public.contacts(id) on delete cascade,
    company_id uuid references public.companies(id) on delete cascade,
    deal_id uuid references public.deals(id) on delete cascade,
    type text not null check (type in ('note', 'call', 'meeting', 'email', 'status_change', 'deal_created', 'stage_change', 'marketing_attribution')),
    title text not null,
    description text,
    user_id uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now()
);

-- 12. Tasks
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

-- ====================================================================
-- MARKETING & GROWTH ENGINE TABLES
-- ====================================================================

-- 13. Lead Capture Forms
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

-- 14. Email Campaigns
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

-- 15. Automation Workflows
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

-- 16. Integrations Directory
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

-- ====================================================================
-- SEO TOOLKIT TABLES
-- ====================================================================

-- 17. Verified SEO Websites
create table if not exists public.seo_websites (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    domain text not null,
    verification_token text not null,
    is_verified boolean not null default false,
    verified_at timestamptz,
    sitemap_url text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint unique_workspace_seo_domain unique (workspace_id, domain)
);

-- 18. SEO Audits
create table if not exists public.seo_audits (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    website_id uuid not null references public.seo_websites(id) on delete cascade,
    crawl_status text not null check (crawl_status in ('pending', 'running', 'completed', 'failed')) default 'pending',
    pages_crawled integer not null default 0,
    issues_count integer not null default 0,
    health_score integer not null default 0,
    crawl_settings jsonb not null default '{"maxPages": 25, "rateLimitMs": 300}'::jsonb,
    started_at timestamptz not null default now(),
    completed_at timestamptz
);

-- 19. SEO Crawled Audit Pages
create table if not exists public.seo_audit_pages (
    id uuid primary key default gen_random_uuid(),
    audit_id uuid not null references public.seo_audits(id) on delete cascade,
    url text not null,
    status_code integer not null default 200,
    title text,
    title_length integer,
    meta_description text,
    meta_description_length integer,
    canonical_url text,
    h1 text,
    h2_count integer not null default 0,
    images_count integer not null default 0,
    images_missing_alt integer not null default 0,
    internal_links_count integer not null default 0,
    external_links_count integer not null default 0,
    word_count integer not null default 0,
    load_time_ms integer not null default 0,
    robots_directives text,
    has_schema boolean not null default false,
    structured_data_types text[] not null default '{}',
    created_at timestamptz not null default now()
);

-- 20. SEO Audit Issues
create table if not exists public.seo_audit_issues (
    id uuid primary key default gen_random_uuid(),
    audit_id uuid not null references public.seo_audits(id) on delete cascade,
    page_id uuid references public.seo_audit_pages(id) on delete set null,
    url text not null,
    issue_type text not null,
    severity text not null check (severity in ('critical', 'warning', 'notice')),
    title text not null,
    evidence text not null,
    recommendation text not null,
    created_at timestamptz not null default now()
);

-- 21. SEO Keywords Tracking & Workspace
create table if not exists public.seo_keywords (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    website_id uuid references public.seo_websites(id) on delete cascade,
    keyword text not null,
    target_url text,
    intent text check (intent in ('informational', 'commercial', 'transactional', 'navigational')) default 'informational',
    status text check (status in ('tracking', 'opportunity', 'ignored', 'ranking')) default 'tracking',
    search_volume integer,
    difficulty integer,
    cpc numeric(10, 2),
    current_rank integer,
    previous_rank integer,
    provider text not null default 'Manual / Unassigned',
    last_updated_at timestamptz,
    notes text,
    created_at timestamptz not null default now()
);

-- 22. SEO Content Briefs
create table if not exists public.seo_content_briefs (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    website_id uuid references public.seo_websites(id) on delete cascade,
    keyword_id uuid references public.seo_keywords(id) on delete set null,
    title text not null,
    target_keyword text not null,
    target_url text,
    status text check (status in ('draft', 'in_progress', 'ready_for_review', 'published')) default 'draft',
    word_count_target integer not null default 1500,
    brief_content jsonb not null default '{}'::jsonb,
    recommendations text[] not null default '{}',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 23. SEO Local Businesses & NAP Consistency
create table if not exists public.seo_local_locations (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    website_id uuid references public.seo_websites(id) on delete cascade,
    business_name text not null,
    address_street text not null,
    address_city text not null,
    address_state text not null,
    address_postal_code text not null,
    address_country text not null default 'USA',
    phone text not null,
    website_url text not null,
    gmb_connected boolean not null default false,
    nap_status text check (nap_status in ('verified', 'inconsistent', 'pending_check')) default 'pending_check',
    audit_results jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 24. SEO External Integrations (GSC, GA4, DataForSEO, etc.)
create table if not exists public.seo_integrations (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    provider text not null check (provider in ('google_search_console', 'google_analytics_4', 'dataforseo', 'serpapi', 'google_business_profile', 'openai', 'gemini')),
    account_name text,
    property_id text,
    config jsonb not null default '{}'::jsonb,
    is_connected boolean not null default false,
    last_synced_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint unique_workspace_seo_provider unique (workspace_id, provider)
);

-- 25. Google Search Console Performance Data
create table if not exists public.seo_gsc_data (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    website_id uuid not null references public.seo_websites(id) on delete cascade,
    date date not null,
    query text not null,
    page text not null,
    clicks integer not null default 0,
    impressions integer not null default 0,
    ctr numeric(6, 4) not null default 0.0000,
    average_position numeric(6, 2) not null default 0.00,
    created_at timestamptz not null default now()
);

-- 26. Google Analytics 4 Organic Metrics Data
create table if not exists public.seo_ga4_data (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    website_id uuid not null references public.seo_websites(id) on delete cascade,
    date date not null,
    sessions integer not null default 0,
    organic_sessions integer not null default 0,
    conversions integer not null default 0,
    bounce_rate numeric(5, 2) not null default 0.00,
    created_at timestamptz not null default now()
);

-- ====================================================================
-- PERFORMANCE INDEXES
-- ====================================================================

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
alter table public.deal_stage_history enable row level security;
alter table public.pipelines enable row level security;
alter table public.pipeline_stages enable row level security;
alter table public.contact_views enable row level security;
alter table public.activities enable row level security;
alter table public.tasks enable row level security;
alter table public.forms enable row level security;
alter table public.form_submissions enable row level security;
alter table public.email_campaigns enable row level security;
alter table public.automation_workflows enable row level security;
alter table public.automation_logs enable row level security;
alter table public.integrations enable row level security;
alter table public.seo_websites enable row level security;
alter table public.seo_audits enable row level security;
alter table public.seo_audit_pages enable row level security;
alter table public.seo_audit_issues enable row level security;
alter table public.seo_keywords enable row level security;
alter table public.seo_content_briefs enable row level security;
alter table public.seo_local_locations enable row level security;
alter table public.seo_integrations enable row level security;
alter table public.seo_gsc_data enable row level security;
alter table public.seo_ga4_data enable row level security;

-- Policies: Workspaces
drop policy if exists "Users can view workspaces they belong to" on public.workspaces;
create policy "Users can view workspaces they belong to"
    on public.workspaces for select to authenticated
    using (created_by = auth.uid() or exists (select 1 from public.workspace_members where workspace_members.workspace_id = workspaces.id and workspace_members.user_id = auth.uid()));

drop policy if exists "Users can create new workspaces" on public.workspaces;
create policy "Users can create new workspaces"
    on public.workspaces for insert to authenticated
    with check (true);

drop policy if exists "Owners and admins can update their workspace" on public.workspaces;
create policy "Owners and admins can update their workspace"
    on public.workspaces for update to authenticated
    using (exists (select 1 from public.workspace_members where workspace_members.workspace_id = workspaces.id and workspace_members.user_id = auth.uid() and workspace_members.role in ('owner', 'admin')));

-- Policies: Workspace Members
drop policy if exists "Members can view members in their workspace" on public.workspace_members;
create policy "Members can view members in their workspace"
    on public.workspace_members for select to authenticated
    using (user_id = auth.uid() or public.is_workspace_member(workspace_id));

drop policy if exists "Users can add initial membership on workspace creation" on public.workspace_members;
create policy "Users can add initial membership on workspace creation"
    on public.workspace_members for insert to authenticated
    with check (user_id = auth.uid() or exists (select 1 from public.workspace_members wm where wm.workspace_id = workspace_members.workspace_id and wm.user_id = auth.uid() and wm.role in ('owner', 'admin')));

drop policy if exists "Owners and admins can update memberships" on public.workspace_members;
create policy "Owners and admins can update memberships"
    on public.workspace_members for update to authenticated
    using (exists (select 1 from public.workspace_members wm where wm.workspace_id = workspace_members.workspace_id and wm.user_id = auth.uid() and wm.role in ('owner', 'admin')));

drop policy if exists "Owners and admins can remove members" on public.workspace_members;
create policy "Owners and admins can remove members"
    on public.workspace_members for delete to authenticated
    using (exists (select 1 from public.workspace_members wm where wm.workspace_id = workspace_members.workspace_id and wm.user_id = auth.uid() and wm.role in ('owner', 'admin')));

-- Policies: Companies
drop policy if exists "Tenant isolation: select companies" on public.companies;
create policy "Tenant isolation: select companies" on public.companies for select to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists "Tenant isolation: insert companies" on public.companies;
create policy "Tenant isolation: insert companies" on public.companies for insert to authenticated with check (public.is_workspace_member(workspace_id));
drop policy if exists "Tenant isolation: update companies" on public.companies;
create policy "Tenant isolation: update companies" on public.companies for update to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists "Tenant isolation: delete companies" on public.companies;
create policy "Tenant isolation: delete companies" on public.companies for delete to authenticated using (public.is_workspace_member(workspace_id));

-- Policies: Contacts
drop policy if exists "Tenant isolation: select contacts" on public.contacts;
create policy "Tenant isolation: select contacts" on public.contacts for select to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists "Tenant isolation: insert contacts" on public.contacts;
create policy "Tenant isolation: insert contacts" on public.contacts for insert to authenticated with check (public.is_workspace_member(workspace_id));
drop policy if exists "Tenant isolation: update contacts" on public.contacts;
create policy "Tenant isolation: update contacts" on public.contacts for update to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists "Tenant isolation: delete contacts" on public.contacts;
create policy "Tenant isolation: delete contacts" on public.contacts for delete to authenticated using (public.is_workspace_member(workspace_id));

-- Policies: Pipelines & Stages
drop policy if exists "Tenant isolation: pipelines" on public.pipelines;
create policy "Tenant isolation: pipelines" on public.pipelines for all to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
drop policy if exists "Tenant isolation: pipeline_stages" on public.pipeline_stages;
create policy "Tenant isolation: pipeline_stages" on public.pipeline_stages for all to authenticated using (exists (select 1 from public.pipelines p where p.id = pipeline_id and public.is_workspace_member(p.workspace_id)));

-- Policies: Deals & Stage History
drop policy if exists "Tenant isolation: select deals" on public.deals;
create policy "Tenant isolation: select deals" on public.deals for select to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists "Tenant isolation: insert deals" on public.deals;
create policy "Tenant isolation: insert deals" on public.deals for insert to authenticated with check (public.is_workspace_member(workspace_id));
drop policy if exists "Tenant isolation: update deals" on public.deals;
create policy "Tenant isolation: update deals" on public.deals for update to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists "Tenant isolation: delete deals" on public.deals;
create policy "Tenant isolation: delete deals" on public.deals for delete to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists "Tenant isolation: deal_stage_history" on public.deal_stage_history;
create policy "Tenant isolation: deal_stage_history" on public.deal_stage_history for all to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

-- Policies: Contact Views
drop policy if exists "Tenant isolation: contact_views" on public.contact_views;
create policy "Tenant isolation: contact_views" on public.contact_views for all to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

-- Policies: Activities
drop policy if exists "Tenant isolation: select activities" on public.activities;
create policy "Tenant isolation: select activities" on public.activities for select to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists "Tenant isolation: insert activities" on public.activities;
create policy "Tenant isolation: insert activities" on public.activities for insert to authenticated with check (public.is_workspace_member(workspace_id));
drop policy if exists "Tenant isolation: update activities" on public.activities;
create policy "Tenant isolation: update activities" on public.activities for update to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists "Tenant isolation: delete activities" on public.activities;
create policy "Tenant isolation: delete activities" on public.activities for delete to authenticated using (public.is_workspace_member(workspace_id));

-- Policies: Tasks
drop policy if exists "Tenant isolation: select tasks" on public.tasks;
create policy "Tenant isolation: select tasks" on public.tasks for select to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists "Tenant isolation: insert tasks" on public.tasks;
create policy "Tenant isolation: insert tasks" on public.tasks for insert to authenticated with check (public.is_workspace_member(workspace_id));
drop policy if exists "Tenant isolation: update tasks" on public.tasks;
create policy "Tenant isolation: update tasks" on public.tasks for update to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists "Tenant isolation: delete tasks" on public.tasks;
create policy "Tenant isolation: delete tasks" on public.tasks for delete to authenticated using (public.is_workspace_member(workspace_id));

-- Policies: Forms & Submissions
drop policy if exists "Tenant isolation: forms" on public.forms;
create policy "Tenant isolation: forms" on public.forms for all to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
drop policy if exists "Public insert form submissions" on public.form_submissions;
create policy "Public insert form submissions" on public.form_submissions for insert to anon, authenticated with check (true);
drop policy if exists "Tenant isolation: view form_submissions" on public.form_submissions;
create policy "Tenant isolation: view form_submissions" on public.form_submissions for select to authenticated using (public.is_workspace_member(workspace_id));

-- Policies: Campaigns & Automations
drop policy if exists "Tenant isolation: email_campaigns" on public.email_campaigns;
create policy "Tenant isolation: email_campaigns" on public.email_campaigns for all to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
drop policy if exists "Tenant isolation: automation_workflows" on public.automation_workflows;
create policy "Tenant isolation: automation_workflows" on public.automation_workflows for all to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
drop policy if exists "Tenant isolation: automation_logs" on public.automation_logs;
create policy "Tenant isolation: automation_logs" on public.automation_logs for all to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
drop policy if exists "Tenant isolation: integrations" on public.integrations;
create policy "Tenant isolation: integrations" on public.integrations for all to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

-- Policies: SEO Toolkit
drop policy if exists "Tenant isolation: seo_websites" on public.seo_websites;
create policy "Tenant isolation: seo_websites" on public.seo_websites for all to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
drop policy if exists "Tenant isolation: seo_audits" on public.seo_audits;
create policy "Tenant isolation: seo_audits" on public.seo_audits for all to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
drop policy if exists "Tenant isolation: seo_audit_pages" on public.seo_audit_pages;
create policy "Tenant isolation: seo_audit_pages" on public.seo_audit_pages for all to authenticated using (exists (select 1 from public.seo_audits a where a.id = audit_id and public.is_workspace_member(a.workspace_id)));
drop policy if exists "Tenant isolation: seo_audit_issues" on public.seo_audit_issues;
create policy "Tenant isolation: seo_audit_issues" on public.seo_audit_issues for all to authenticated using (exists (select 1 from public.seo_audits a where a.id = audit_id and public.is_workspace_member(a.workspace_id)));
drop policy if exists "Tenant isolation: seo_keywords" on public.seo_keywords;
create policy "Tenant isolation: seo_keywords" on public.seo_keywords for all to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
drop policy if exists "Tenant isolation: seo_content_briefs" on public.seo_content_briefs;
create policy "Tenant isolation: seo_content_briefs" on public.seo_content_briefs for all to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
drop policy if exists "Tenant isolation: seo_local_locations" on public.seo_local_locations;
create policy "Tenant isolation: seo_local_locations" on public.seo_local_locations for all to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
drop policy if exists "Tenant isolation: seo_integrations" on public.seo_integrations;
create policy "Tenant isolation: seo_integrations" on public.seo_integrations for all to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
drop policy if exists "Tenant isolation: seo_gsc_data" on public.seo_gsc_data;
create policy "Tenant isolation: seo_gsc_data" on public.seo_gsc_data for all to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
drop policy if exists "Tenant isolation: seo_ga4_data" on public.seo_ga4_data;
create policy "Tenant isolation: seo_ga4_data" on public.seo_ga4_data for all to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

-- ====================================================================
-- REAL EMAIL DELIVERY EVENTS & AUTOMATION AUDIT
-- ====================================================================

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

create table if not exists public.automation_event_triggers (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    workflow_id uuid not null references public.automation_workflows(id) on delete cascade,
    trigger_type text not null,
    entity_id text not null,
    idempotency_key text not null unique,
    status text not null check (status in ('processing', 'completed', 'failed')),
    created_at timestamptz not null default now()
);

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

alter table public.email_campaign_events enable row level security;
alter table public.automation_event_triggers enable row level security;
alter table public.automation_step_logs enable row level security;

drop policy if exists "Tenant isolation: email_campaign_events" on public.email_campaign_events;
create policy "Tenant isolation: email_campaign_events" on public.email_campaign_events for all to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

drop policy if exists "Tenant isolation: automation_event_triggers" on public.automation_event_triggers;
create policy "Tenant isolation: automation_event_triggers" on public.automation_event_triggers for all to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

drop policy if exists "Tenant isolation: automation_step_logs" on public.automation_step_logs;
create policy "Tenant isolation: automation_step_logs" on public.automation_step_logs for all to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

-- ====================================================================
-- VISUAL WORKFLOW BUILDER & DURABLE EXECUTION ENGINE
-- ====================================================================

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

alter table public.workflow_executions enable row level security;
alter table public.workflow_node_executions enable row level security;
alter table public.workflow_audit_logs enable row level security;

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
