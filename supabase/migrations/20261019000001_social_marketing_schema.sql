-- ====================================================================
-- Migration: SMMFollows Social Marketing & Wallet Ledger Schema
-- Native Social Marketing Services, Customer Orders, Reconciliation,
-- Atomic Wallet Ledger, and Workspace Row-Level Security
-- ====================================================================

-- 1. Extend integrations provider check to allow 'smmfollows'
do $$
begin
    if exists (
        select 1 from pg_constraint 
        where conname = 'integrations_provider_check'
    ) then
        alter table public.integrations drop constraint integrations_provider_check;
        alter table public.integrations add constraint integrations_provider_check 
            check (provider in ('mautic', 'sendgrid', 'resend', 'slack', 'webhook', 'google_calendar', 'smmfollows'));
    end if;
end $$;

-- 2. Workspace Wallets (Concurrency-safe balance tracking per workspace)
create table if not exists public.workspace_wallets (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade unique,
    balance numeric(14, 4) not null default 0.0000 check (balance >= 0),
    currency text not null default 'USD',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_workspace_wallets_workspace on public.workspace_wallets(workspace_id);

-- 3. Workspace Wallet Ledger Transactions
create table if not exists public.workspace_wallet_transactions (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    wallet_id uuid not null references public.workspace_wallets(id) on delete cascade,
    type text not null check (type in ('deposit', 'order_charge', 'refund', 'adjustment')),
    amount numeric(14, 4) not null,
    balance_after numeric(14, 4) not null,
    status text not null default 'completed' check (status in ('pending', 'completed', 'failed', 'cancelled')),
    description text not null,
    reference_id text,
    metadata jsonb not null default '{}'::jsonb,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now()
);

create index if not exists idx_wallet_tx_workspace on public.workspace_wallet_transactions(workspace_id);
create index if not exists idx_wallet_tx_wallet on public.workspace_wallet_transactions(wallet_id);
create index if not exists idx_wallet_tx_reference on public.workspace_wallet_transactions(reference_id);

-- 4. Social Marketing Provider Settings per Workspace
create table if not exists public.social_marketing_settings (
    workspace_id uuid not null references public.workspaces(id) on delete cascade primary key,
    is_enabled boolean not null default false,
    api_key text, -- AES-256-GCM encrypted
    default_markup_percent numeric(6, 2) not null default 30.00,
    min_order_margin numeric(8, 4) not null default 0.0500,
    currency text not null default 'USD',
    connection_status text not null default 'disconnected' check (connection_status in ('disconnected', 'connected', 'error')),
    last_connection_test_at timestamptz,
    connection_error text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 5. Synchronized Provider Services Catalog
create table if not exists public.social_marketing_services (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    service_id text not null, -- SMMFollows provider service id
    name text not null,
    type text not null default 'Default',
    category text not null,
    rate numeric(14, 4) not null, -- Wholesale rate per 1,000 units
    retail_rate numeric(14, 4) not null, -- Retail customer rate per 1,000 units
    min_quantity integer not null default 1,
    max_quantity integer not null default 10000,
    refill boolean not null default false,
    cancel boolean not null default false,
    dripfeed boolean not null default false,
    is_enabled boolean not null default true,
    raw_metadata jsonb not null default '{}'::jsonb,
    last_synced_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint unique_workspace_service unique (workspace_id, service_id)
);

create index if not exists idx_smm_services_workspace on public.social_marketing_services(workspace_id);
create index if not exists idx_smm_services_category on public.social_marketing_services(category);
create index if not exists idx_smm_services_service_id on public.social_marketing_services(service_id);

-- 6. Social Marketing Orders
create table if not exists public.social_marketing_orders (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    user_id uuid references auth.users(id) on delete set null,
    internal_order_id text not null unique,
    provider_order_id text,
    service_id text not null,
    service_name text not null,
    service_category text not null,
    link text not null,
    quantity integer not null check (quantity > 0),
    runs integer default 1,
    interval_minutes integer default 0,
    wholesale_rate numeric(14, 4) not null,
    wholesale_cost numeric(14, 4) not null,
    retail_rate numeric(14, 4) not null,
    customer_charge numeric(14, 4) not null,
    currency text not null default 'USD',
    submission_state text not null default 'pending_submission' check (submission_state in ('pending_submission', 'submitted', 'unresolved_timeout', 'failed')),
    status text not null default 'pending' check (status in ('pending', 'processing', 'in_progress', 'completed', 'partial', 'canceled', 'rejected', 'failed')),
    start_count integer default 0,
    remains integer default 0,
    provider_charge numeric(14, 4),
    idempotency_key text not null unique,
    submission_attempts integer not null default 0,
    last_reconciliation_at timestamptz,
    reconciliation_error text,
    error_message text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_smm_orders_workspace on public.social_marketing_orders(workspace_id);
create index if not exists idx_smm_orders_status on public.social_marketing_orders(status);
create index if not exists idx_smm_orders_internal_id on public.social_marketing_orders(internal_order_id);
create index if not exists idx_smm_orders_provider_id on public.social_marketing_orders(provider_order_id);

-- 7. Order Status History Audit Trail
create table if not exists public.social_marketing_order_status_history (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    order_id uuid not null references public.social_marketing_orders(id) on delete cascade,
    previous_status text,
    new_status text not null,
    start_count integer,
    remains integer,
    provider_raw_response jsonb default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists idx_smm_order_history_order on public.social_marketing_order_status_history(order_id);

-- 8. Refill Requests
create table if not exists public.social_marketing_refill_requests (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    order_id uuid not null references public.social_marketing_orders(id) on delete cascade,
    provider_refill_id text,
    status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'rejected', 'failed')),
    error_message text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_smm_refills_order on public.social_marketing_refill_requests(order_id);

-- 9. Cancellation Requests
create table if not exists public.social_marketing_cancellation_requests (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    order_id uuid not null references public.social_marketing_orders(id) on delete cascade,
    provider_cancel_result text,
    status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'rejected', 'failed')),
    error_message text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_smm_cancels_order on public.social_marketing_cancellation_requests(order_id);

-- 10. Enable Row Level Security (RLS) on all new tables
alter table public.workspace_wallets enable row level security;
alter table public.workspace_wallet_transactions enable row level security;
alter table public.social_marketing_settings enable row level security;
alter table public.social_marketing_services enable row level security;
alter table public.social_marketing_orders enable row level security;
alter table public.social_marketing_order_status_history enable row level security;
alter table public.social_marketing_refill_requests enable row level security;
alter table public.social_marketing_cancellation_requests enable row level security;

-- 11. Define Tenant Isolation Policies
create policy "Tenant isolation: workspace_wallets"
    on public.workspace_wallets for all to authenticated
    using (public.is_workspace_member(workspace_id))
    with check (public.is_workspace_member(workspace_id));

create policy "Tenant isolation: workspace_wallet_transactions"
    on public.workspace_wallet_transactions for all to authenticated
    using (public.is_workspace_member(workspace_id))
    with check (public.is_workspace_member(workspace_id));

create policy "Tenant isolation: social_marketing_settings"
    on public.social_marketing_settings for all to authenticated
    using (public.is_workspace_member(workspace_id))
    with check (public.is_workspace_member(workspace_id));

create policy "Tenant isolation: social_marketing_services"
    on public.social_marketing_services for all to authenticated
    using (public.is_workspace_member(workspace_id))
    with check (public.is_workspace_member(workspace_id));

create policy "Tenant isolation: social_marketing_orders"
    on public.social_marketing_orders for all to authenticated
    using (public.is_workspace_member(workspace_id))
    with check (public.is_workspace_member(workspace_id));

create policy "Tenant isolation: social_marketing_order_status_history"
    on public.social_marketing_order_status_history for all to authenticated
    using (public.is_workspace_member(workspace_id))
    with check (public.is_workspace_member(workspace_id));

create policy "Tenant isolation: social_marketing_refill_requests"
    on public.social_marketing_refill_requests for all to authenticated
    using (public.is_workspace_member(workspace_id))
    with check (public.is_workspace_member(workspace_id));

create policy "Tenant isolation: social_marketing_cancellation_requests"
    on public.social_marketing_cancellation_requests for all to authenticated
    using (public.is_workspace_member(workspace_id))
    with check (public.is_workspace_member(workspace_id));
