-- ====================================================================
-- NexusMark CRM & SEO Platform - Phase 3 Schema Migration
-- Real CRM Expansion (Pipelines, Stages, Saved Views, Lead Scoring, UTMs)
-- Complete SEO Engine (Websites, Audits, Pages, Issues, Keywords, Briefs, Local SEO, GSC/GA4)
-- ====================================================================

-- 1. Contacts Table Enhancements
alter table public.contacts
    add column if not exists owner_id uuid references auth.users(id) on delete set null,
    add column if not exists source text not null default 'direct',
    add column if not exists consent_status text not null default 'pending',
    add column if not exists custom_fields jsonb not null default '{}'::jsonb,
    add column if not exists lead_score integer not null default 0,
    add column if not exists lead_score_reasons jsonb not null default '[]'::jsonb,
    add column if not exists utm_source text,
    add column if not exists utm_medium text,
    add column if not exists utm_campaign text,
    add column if not exists utm_term text,
    add column if not exists utm_content text,
    add column if not exists referrer text;

-- 2. Configurable Pipelines and Stages
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

-- Enhance Deals Table with pipeline foreign keys
alter table public.deals
    add column if not exists pipeline_id uuid references public.pipelines(id) on delete set null,
    add column if not exists stage_id uuid references public.pipeline_stages(id) on delete set null;

-- 3. Deal Stage History (Audit Trail)
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

-- 4. Saved Contact Views & Filter Presets
create table if not exists public.contact_views (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    name text not null,
    filters jsonb not null default '{}'::jsonb,
    is_default boolean not null default false,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now()
);

-- ====================================================================
-- SEO TOOLKIT ENGINE TABLES
-- ====================================================================

-- 5. Verified SEO Websites
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

-- 6. SEO Audits
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

-- 7. SEO Crawled Audit Pages
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

-- 8. SEO Audit Issues
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

-- 9. SEO Keyword Workspace & Tracking
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

-- 10. SEO Content Briefs & On-Page Plans
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

-- 11. SEO Local Businesses & NAP Audit
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

-- 12. SEO Integrations (GSC, GA4, DataForSEO, SerpApi, Google Business Profile)
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

-- 13. Search Console Performance Data (Actual queries & pages)
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

-- 14. Google Analytics 4 Organic Metrics Data
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
-- RLS SECURITY POLICIES FOR ALL NEW TABLES
-- ====================================================================

alter table public.pipelines enable row level security;
alter table public.pipeline_stages enable row level security;
alter table public.deal_stage_history enable row level security;
alter table public.contact_views enable row level security;
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

-- Workspace Isolation Policies
create policy "Tenant isolation: pipelines" on public.pipelines for all to authenticated
    using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

create policy "Tenant isolation: pipeline_stages" on public.pipeline_stages for all to authenticated
    using (exists (select 1 from public.pipelines p where p.id = pipeline_id and public.is_workspace_member(p.workspace_id)));

create policy "Tenant isolation: deal_stage_history" on public.deal_stage_history for all to authenticated
    using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

create policy "Tenant isolation: contact_views" on public.contact_views for all to authenticated
    using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

create policy "Tenant isolation: seo_websites" on public.seo_websites for all to authenticated
    using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

create policy "Tenant isolation: seo_audits" on public.seo_audits for all to authenticated
    using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

create policy "Tenant isolation: seo_audit_pages" on public.seo_audit_pages for all to authenticated
    using (exists (select 1 from public.seo_audits a where a.id = audit_id and public.is_workspace_member(a.workspace_id)));

create policy "Tenant isolation: seo_audit_issues" on public.seo_audit_issues for all to authenticated
    using (exists (select 1 from public.seo_audits a where a.id = audit_id and public.is_workspace_member(a.workspace_id)));

create policy "Tenant isolation: seo_keywords" on public.seo_keywords for all to authenticated
    using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

create policy "Tenant isolation: seo_content_briefs" on public.seo_content_briefs for all to authenticated
    using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

create policy "Tenant isolation: seo_local_locations" on public.seo_local_locations for all to authenticated
    using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

create policy "Tenant isolation: seo_integrations" on public.seo_integrations for all to authenticated
    using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

create policy "Tenant isolation: seo_gsc_data" on public.seo_gsc_data for all to authenticated
    using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

create policy "Tenant isolation: seo_ga4_data" on public.seo_ga4_data for all to authenticated
    using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
