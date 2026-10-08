# NexusMark — AI-Powered Growth & Digital Marketing CRM

> **Status & System Architecture**: Full-featured, multi-tenant digital marketing SaaS and CRM engine built with Next.js 16 (App Router), React 19, and Supabase PostgreSQL. Enforces workspace isolation with PostgreSQL Row Level Security (RLS), enterprise SSRF protection, AES-256-GCM credential encryption at rest, sandboxed workflow execution, grounded AI generation, and genuine third-party provider verification.

---

## 🚀 Overview & System Architecture

**NexusMark** is an original digital marketing SaaS and growth CRM built from scratch. It features original branding, clean modern UI aesthetics, responsive layouts, strict database tenant isolation, and zero simulated metrics.

### Technology Stack
- **Framework**: Next.js 16 (App Router) & React 19
- **Language**: TypeScript (Strict typing)
- **Database & Auth**: Supabase PostgreSQL & Supabase Auth
- **Security & Secret Vault**:
  - PostgreSQL Row Level Security (RLS) with workspace tenant enforcement
  - AES-256-GCM secret encryption at rest for OAuth tokens and API keys
  - Server-Side Request Forgery (SSRF) guard with DNS-level validation and private IP blocking
- **Styling**: Tailwind CSS
- **Testing**: Vitest test suite covering access isolation, CRM operations, CSV ingestion, provider adapters, SSRF defense, and credentials enforcement

---

## 🛠️ Setup & Installation Instructions

### 1. Prerequisites
- Node.js `v20+` or `v24+`
- A Supabase project (Free at [supabase.com](https://supabase.com))

### 2. Environment Configuration
Duplicate `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Populate `.env.local` with your configuration:

```ini
# Supabase Project URL & Anon Key (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...

# Supabase Service Role Key (Required for secure server actions & background jobs)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# Application Base URL (Required for auth redirects and webhook endpoints)
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Secret Encryption Key (Required for AES-256-GCM at-rest encryption)
# Generate a 32-byte hex string (e.g., node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ENCRYPTION_SECRET=your-64-character-hex-encryption-key-here

# Resend Email Delivery (Required for sending live email campaigns & automation emails)
RESEND_API_KEY=re_123456789
RESEND_FROM_EMAIL=growth@yourdomain.com

# Mautic Marketing Automation (Required for live contact synchronization)
MAUTIC_BASE_URL=https://mautic.yourdomain.com
MAUTIC_CLIENT_ID=your-mautic-oauth-client-id
MAUTIC_CLIENT_SECRET=your-mautic-oauth-client-secret
# Or basic auth credentials:
MAUTIC_USERNAME=your-mautic-username
MAUTIC_PASSWORD=your-mautic-password

# Google Search Console & Google Analytics 4 (Required for live SEO/Analytics sync)
GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-google-oauth-client-secret

# DataForSEO / SerpApi (Required for live keyword rankings, SERP data, & backlinks)
DATAFORSEO_LOGIN=your-dataforseo-login
DATAFORSEO_PASSWORD=your-dataforseo-password
SERPAPI_API_KEY=your-serpapi-api-key

# AI Intelligence Providers (Required for personalized email drafting & briefs)
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIzaSy...
```

---

## 🗄️ Database Migrations

Open your Supabase project's **SQL Editor** and execute the migration files located in `supabase/migrations/` (or apply the consolidated schema from `supabase/COMPLETE_SCHEMA.sql`):

1. **`supabase/migrations/20261007000000_phase1_crm_schema.sql`**:
   - Creates `workspaces`, `workspace_members`, `contacts`, `companies`, `deals`, `activities`, and `tasks`.
   - Enables RLS on all tables with tenant isolation policies.
   - Creates the `public.is_workspace_member(workspace_id)` security function.

2. **`supabase/migrations/20261007000001_phase2_architectural_stubs.sql`**:
   - Table schemas for `forms`, `form_submissions`, `email_campaigns`, `automation_workflows`, `automation_logs`, and `integrations` with RLS.

3. **`supabase/migrations/20261007000002_crm_expansion_and_seo_schema.sql`**:
   - Expands `contacts` with `owner_id`, `source`, `consent_status`, `custom_fields`, `lead_score`, `lead_score_reasons`, and UTM attribution columns.
   - Creates `pipelines`, `pipeline_stages`, and `deal_stage_history` with automated stage transition logging.
   - Creates `contact_views` for saved filters.
   - Creates `seo_websites`, `seo_audits`, `seo_audit_pages`, `seo_audit_issues`, `seo_keywords`, `seo_content_briefs`, `seo_local_locations`, `seo_integrations`, `seo_gsc_data`, and `seo_ga4_data`.

4. **`supabase/migrations/20261007000003_real_integrations_and_events.sql`**:
   - Creates `email_campaign_events` tracking provider message IDs, delivery events, opens, clicks, bounces, and unsubscribes.
   - Creates `automation_event_triggers` with unique constraints for once-only execution idempotency.
   - Creates `automation_step_logs` for durable per-step execution logs with status, retry counts, and error details.

---

## 🚦 Feature Operational Status Matrix

To provide total clarity and eliminate misleading claims, features in NexusMark fall into three clear categories:

### A. Working Core Features (Fully Operational Out-of-the-Box)
These features function immediately upon completing Supabase database setup:

1. **Authentication & Multi-Tenant Workspaces (`/login`, `/register`, `/workspaces/new`)**:
   - Sign up, sign in, password recovery, session management.
   - Workspace creation and switching with strict PostgreSQL Row-Level Security (RLS) isolation.
2. **Contacts Management (`/contacts` & `/contacts/[id]`)**:
   - Full CRUD operations, archiving/unarchiving, and company associations.
   - Deterministic rule-based Lead Scoring (0–100) with transparent score explanation modal.
   - Marketing consent tracking (`opted_in`, `opted_out`, `pending`).
   - Saved custom views (`contact_views`) and UTM attribution tracking (`utm_source`, `utm_medium`, `utm_campaign`).
3. **Companies Directory (`/companies` & `/companies/[id]`)**:
   - Full company profile management with automatic contact and deal association mapping.
4. **Deals & Sales Pipelines (`/deals` & `/deals/[id]`)**:
   - Custom sales pipelines and stages with interactive Kanban board and list view.
   - Automated stage transition history recording in `deal_stage_history`.
   - Pipeline value forecasting, win probability weighting, and deal velocity tracking.
5. **Activity Timeline & Tasks (`/tasks`)**:
   - Activity audit trail logging notes, calls, meetings, emails, and stage changes.
   - Task assignment with priority levels, due dates, and completion toggles.
6. **Lead Capture Forms & Public Embeds (`/forms` & `/f/[slug]`)**:
   - Form field builder with validation.
   - Anti-bot honeypot protection.
   - Direct CRM ingestion creating or updating contacts in the workspace.
   - Iframe and raw HTML embed code generator.
7. **Real Analytics Dashboard (`/dashboard`)**:
   - All metrics (Pipeline Value, Closed Won Revenue, Win Rate %, Active Deals) computed dynamically from live PostgreSQL database records. Zero hardcoded numbers.
8. **Sandboxed Automation Test-Runs (`/automations`)**:
   - "Test Run" executes workflows in an isolated dry-run sandbox.
   - Validates trigger conditions and action parameters without mutating live contacts, creating real tasks, or dispatching external emails.

---

### B. Manual Entry & CSV Import Features
These features allow data ingestion without requiring external third-party API connections:

1. **Contact CSV Import Engine (`/contacts/import`)**:
   - Browser-side CSV parsing using PapaParse.
   - Header auto-detection and field mapping.
   - Email format validation and duplicate resolution (skip vs. update existing).
   - Insertion/update/error breakdown report.
2. **Keyword CSV Import & Manual Tracking (`/seo/keywords`)**:
   - Manual keyword addition and bulk CSV keyword import wizard.
   - Intent classification (`informational`, `commercial`, `transactional`, `navigational`), target URL binding, and notes.
   - Strict provenance labeling: manual entries and CSV imports are explicitly marked as `Manual / CSV Import` with creation timestamps. They are never misrepresented as live provider data.
3. **Local SEO & NAP Consistency Directory (`/seo/local`)**:
   - Business location directory with address, phone, and website URL.
   - Live on-page crawler inspecting website markup for Name, Phone, and City/Postal code matches.

---

### C. External Integrations Requiring Configured Credentials
These features require API credentials or OAuth tokens and enforce strict verification before connecting:

1. **Email Campaigns Studio (`/campaigns`)**:
   - **Provider**: Resend (`RESEND_API_KEY`, optional `RESEND_FROM_EMAIL`).
   - **Consent Enforcement**: Sends only to non-archived contacts with valid email addresses and explicit marketing consent (`consent_status = 'opted_in'`).
   - **Truthful Status**: Never marks a campaign as `sent` until the provider API confirms message acceptance.
   - **Telemetry**: Records provider message IDs and real delivery/bounce/open/click events in `email_campaign_events`. Displays `"Not available (Awaiting provider webhooks)"` instead of fabricated estimates when webhook data is pending.
   - **Idempotency**: Prevents duplicate sends per recipient and handles rate limits (HTTP 429).
   - **Missing Credentials**: Sending is disabled with an explicit setup guide when `RESEND_API_KEY` is not configured.
2. **Mautic Contact Synchronization (`/integrations`)**:
   - **Provider**: Mautic REST API (OAuth 2.0 or Basic Auth).
   - **Truthful Sync**: Authenticated synchronization supporting pagination, contact deduplication/upsert, and truthful synced contact counts.
   - **Error Handling**: Displays actionable error messages upon authentication or network failure.
3. **Outbound Webhooks (`/integrations`)**:
   - **SSRF Protection**: Strict host validation blocking requests to localhost, loopback (`127.0.0.0/8`), link-local (`169.254.0.0/16`), private networks (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), cloud metadata endpoints, and IPv6 equivalents. Blocks unsafe redirects.
   - **Truthful Test**: Webhook test ping reports success only for a genuine 2xx HTTP response within timeout. Timeouts and non-2xx responses report failure.
4. **Automations Engine Live Execution (`/automations`)**:
   - **Supported Steps**: Executes supported actions (`send_email`, `create_task`, `add_tag`, `webhook`). Email steps dispatch through the configured email provider. Unknown step types fail visibly.
   - **Durable Logging**: Logs each step's execution state, error details, and retry attempts in `automation_step_logs`.
   - **Only-Once Execution**: CRM events (`contact_created`, `form_submission`, `deal_stage_changed`) trigger active workflows only once via `automation_event_triggers` idempotency locks.
5. **Google Search Console & GA4 (`/seo/analytics`)**:
   - **Provider**: Google Search Console API & Google Analytics Data API.
   - **Real Verification**: Requires OAuth token exchange or Service Account credentials. Only marked `is_connected: true` after a successful API probe.
   - **Truthful Data**: Syncs verified organic query rankings, impressions, clicks, CTR, average position, and GA4 organic sessions. Shows disconnected state when unconfigured.
6. **Live Keyword & SERP Provider (`/seo/keywords`)**:
   - **Provider**: DataForSEO or SerpApi.
   - **Metrics**: Real search volume, keyword difficulty, CPC, and SERP competitive rankings. Displays provider name, date range, and last sync timestamp for all external metrics.
7. **SEO Website Audit & Crawler (`/seo/audits`, `/seo/on-page`, `/seo/competitors`)**:
   - **Verification Requirement**: Audits require a verified website via exact token `<meta name="nexusmark-site-verification" content="<token>">`. Development-mode bypass is disabled.
   - **Origin Boundary**: Restricts page crawling strictly to the verified website's origin.
   - **SSRF & Resource Clamps**: Blocks private/internal IPs, inspects redirect hops, enforces page limits (1–50 pages), clamps response sizes (max 2 MB), and sets request timeouts.
   - **Robots.txt & Sitemaps**: Compliant `robots.txt` parser respecting user-agent groups, path-specific Allow/Disallow precedence, and auto-discovering XML sitemaps.
   - **Performance Labeling**: Measures and displays `"fetch latency"`. Does not misrepresent fetch latency as PageSpeed or Core Web Vitals.
   - **Competitor Comparison**: Restricted strictly to live data fetched from compared URLs.
8. **AI Tools & Secret Vault (`/ai-tools`)**:
   - **Provider**: OpenAI (`OPENAI_API_KEY`) or Google Gemini (`GEMINI_API_KEY`).
   - **CRM Grounding**: Personalized email generation is grounded strictly in retrieved contact notes, job title, company name, and domain. Does not fabricate facts.
   - **Rule-Based Distinction**: Deal Health calculations are explicitly labeled as rule-based heuristic assessments.
   - **Secret Protection**: OAuth tokens and API keys are stored encrypted at rest (AES-256-GCM). Client responses mask secrets (e.g. `re_12...99`). Plaintext secrets are never returned to browser components or committed to git.

---

## 🧪 Testing

The repository contains an automated Vitest test suite validating business logic, security protections, and provider integrations:

```bash
npm run test
```

Test suite coverage:
- **`tests/provider-adapters.test.ts`**: Comprehensive provider adapter tests for Resend, Mautic, SSRF validator/safe fetch, Google GSC/GA4, DataForSEO/SerpApi, and AI clients covering success, invalid credentials, rate limiting (HTTP 429), timeouts, duplicate delivery idempotency, and non-2xx responses.
- **`tests/credentials-enforcement.test.ts`**: Proves that missing credentials never produce a "connected", "sent", or "synced" success state across Resend, Mautic, Google GSC/GA4, and SEO providers.
- **`tests/access-isolation.test.ts`**: Validates workspace tenant isolation and RLS security policies.
- **`tests/phase2-growth-engine.test.ts`**: Tests form slug normalization, bot honeypot detection, delivery math, and stagnation algorithms.
- **`tests/csv-import.test.ts`**: Tests CSV parsing, header mapping, email format validation, and duplicate handling.
- **`tests/crm-operations.test.ts`**: Tests pipeline values, win rates, and task assignment logic.
- **`tests/phase3-crm-seo.test.ts`**: Tests lead scoring algorithms, consent updates, robots.txt parsing, and SEO audit issue classification.

---

## 🔒 Security Summary

- **SSRF Defense**: All outbound webhooks and crawler requests pass through `validateSafePublicUrl` which resolves DNS and rejects loopback, link-local, private RFC 1918 addresses, cloud metadata endpoints (169.254.169.254), and IPv6 unique-local addresses. Redirects are inspected per-hop.
- **AES-256-GCM Encryption**: Third-party credentials stored in database tables are encrypted with an authenticated cipher.
- **Consent Compliance**: Marketing broadcasts strictly enforce opt-in consent before dispatching.
- **Origin Confinement**: SEO crawling is strictly confined to verified website origins.
