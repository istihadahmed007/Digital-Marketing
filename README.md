# NexusMark — AI-Powered Growth & Digital Marketing CRM

> **Phase 1 & Phase 2 Complete**: Full-featured, multi-tenant CRM engine with workspace isolation, PostgreSQL Row Level Security (RLS), Deals Kanban pipeline, CSV batch import, Activity audit timeline, Lead Capture Forms & public embeds (`/forms` & `/f/[slug]`), Email Campaigns Studio (`/campaigns`), Automation Workflows Engine (`/automations`), Grounded AI Growth Intelligence (`/ai-tools`), and Marketing Integrations Directory (`/integrations`).

---

## 🚀 Overview & Branding

**NexusMark** is an original digital marketing SaaS and growth CRM built from scratch. It features original branding, clean modern UI aesthetics, responsive layouts, and strict database isolation.

### Technology Stack
- **Framework**: Next.js 16 (App Router) & React 19
- **Language**: TypeScript (Strict typing)
- **Database & Auth**: Supabase PostgreSQL & Supabase Auth
- **Security**: PostgreSQL Row Level Security (RLS) with workspace tenant enforcement
- **Styling**: Tailwind CSS
- **CSV Engine**: PapaParse with automated column detection & email validation
- **Testing**: Vitest test suite for access isolation, CRM logic, and CSV imports

---

## 🛠️ Setup & Installation Instructions

### 1. Prerequisites
- Node.js `v20+` or `v24+`
- A Supabase project (Free at [supabase.com](https://supabase.com))

### 2. Environment Configuration
Duplicate the provided `.env.example` file to `.env.local`:

```bash
cp .env.example .env.local
```

Populate `.env.local` with your Supabase credentials:

```ini
# Supabase Project URL (found in Project Settings -> API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co

# Supabase Public Anon API Key (found in Project Settings -> API)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...

# Application Base URL (for auth redirects)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> **Note**: NexusMark never hardcodes credentials or uses mock databases. If credentials are missing, the application gracefully presents a guided setup banner with step-by-step instructions.

### 3. Database Migrations
Open your Supabase project's **SQL Editor** and execute the migration files located in `supabase/migrations/`:

1. **Phase 1 CRM Schema**:
   `supabase/migrations/20261007000000_phase1_crm_schema.sql`
   - Creates `workspaces`, `workspace_members`, `contacts`, `companies`, `deals`, `activities`, and `tasks`.
   - Enables RLS on all tables with tenant isolation policies.
   - Creates the `public.is_workspace_member(workspace_id)` security function.

2. **Phase 2 Architectural Readiness**:
   `supabase/migrations/20261007000001_phase2_architectural_stubs.sql`
   - Initializes table schemas for `forms`, `form_submissions`, `email_campaigns`, `automation_workflows`, `automation_logs`, and `integrations` with RLS.

3. **Phase 3 CRM Expansion & Complete SEO Toolkit Schema**:
   `supabase/migrations/20261007000002_crm_expansion_and_seo_schema.sql`
   - Expands `contacts` with `owner_id`, `source`, `consent_status`, `custom_fields`, `lead_score`, `lead_score_reasons`, and UTM attribution columns (`utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `referrer`).
   - Creates `pipelines`, `pipeline_stages`, and `deal_stage_history` with automated deal stage transition audit logging.
   - Creates `contact_views` for persisted saved filters.
   - Creates `seo_websites`, `seo_audits`, `seo_audit_pages`, `seo_audit_issues`, `seo_keywords`, `seo_content_briefs`, `seo_local_locations`, `seo_integrations`, `seo_gsc_data`, and `seo_ga4_data`.
   - Enforces workspace-level PostgreSQL Row Level Security (RLS) on every table.

### 4. Install Dependencies & Run

```bash
# Run the development server
npm run dev

# Run unit and integration tests
npm run test

# Build production bundle
npm run build
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ✅ What Works (Phase 1 Deliverables)

### 1. Authentication
- **Sign-Up** (`/register`): User account creation with email verification support.
- **Sign-In** (`/login`): Secure session generation with redirect protection.
- **Sign-Out**: Immediate session termination via sidebar profile action.
- **Password Reset** (`/forgot-password` & `/reset-password`): Automated password recovery link and password update flow.

### 2. Multi-Tenant Workspaces
- **Workspace Onboarding** (`/workspaces/new`): Any user can create one or multiple workspaces.
- **Roles & Membership**: Creator becomes `owner`, with support for `admin` and `member` roles.
- **Workspace Switcher**: Seamlessly switch between active workspaces with persistence in cookies and `localStorage`.

### 3. Contacts Directory (`/contacts` & `/contacts/[id]`)
- **CRUD Operations**: Create, view, edit, and archive contacts.
- **Filtering & Search**: Live search by name/email, filter by Lead Status (`new`, `contacted`, `qualified`, `unqualified`, `customer`), Lifecycle Stage (`subscriber`, `lead`, `mql`, `sql`, `opportunity`, `customer`), and tags.
- **Contact Details**: Detailed record page with company associations, contact tasks, and chronological activity timeline.
- **Archive Toggle**: Filter between active and archived contacts.

### 4. Companies Directory (`/companies` & `/companies/[id]`)
- **Organization Management**: Record domains, industries, company size, phone, and locations.
- **Relationships**: Automatically lists all associated contacts and deals belonging to the company.
- **Archive Toggle & Search**: Filter and search organizations.

### 5. CSV Contact Import Engine (`/contacts/import`)
- **File Upload & Parsing**: Fast browser parsing using PapaParse.
- **Auto Field Mapping**: Automatically maps CSV headers (e.g. `Email`, `First Name`, `Last Name`, `Phone`, `Title`, `Company`, `Tags`).
- **Validation**: Rejects invalid email formats, checks required fields.
- **Duplicate Handling Options**:
  - *Skip duplicates*: Preserves existing records by ignoring matching emails.
  - *Update existing*: Upserts matching records with latest fields.
- **Summary Report**: Detailed counts for newly inserted, updated, and skipped contacts, with row-level error feedback.

### 6. Deals & Pipeline (`/deals` & `/deals/[id]`)
- **Stages**: `Lead (10%)`, `Qualified (30%)`, `Proposal (60%)`, `Negotiation (80%)`, `Closed Won (100%)`, `Closed Lost (0%)`.
- **Kanban Board**: Drag/select stage transitions with live database update and activity logging.
- **Table List View**: Switch between visual Kanban board and tabular overview.
- **Forecasting**: Value amounts, currencies, win probabilities, and expected close dates.

### 7. Activities, Notes & Tasks (`/tasks`)
- **Activity Timeline**: Log notes, calls, meetings, and emails linked to contacts, companies, or deals.
- **Audit Trail**: Automated logging of deal creation and stage changes.
- **Task Queue**: Assign follow-ups with priority levels (`low`, `medium`, `high`, `urgent`), due dates, and completion status toggles.

### 8. Real Database Dashboard (`/dashboard`)
- **Zero Hallucinated Metrics**: All statistics (Total Contacts, Active Deals, Open Pipeline Value, Closed Won Revenue, Win Rate %, Pending Tasks) are calculated directly from active PostgreSQL records.
- **Clear Empty States**: Informative empty states with direct call-to-action buttons when a workspace has no records.

---

## 🔒 Data & Security Architecture

1. **Workspace Isolation**:
   - Every workspace-owned record contains a mandatory `workspace_id` foreign key.
   - Enforced by server actions and PostgreSQL Row Level Security (RLS) policies:
     ```sql
     create policy "Tenant isolation: select contacts"
         on public.contacts for select to authenticated
         using (public.is_workspace_member(workspace_id));
     ```
2. **Access Control**: Users in Workspace A can never read, modify, or delete data belonging to Workspace B.

---

## 🧪 Test Suite

- **`tests/phase2-growth-engine.test.ts`**: Verifies form slug normalization, contact field extraction, bot honeypot detection, audience segmentation, delivery math, event-driven workflow triggering, and deal stagnation algorithms.
- **`tests/access-isolation.test.ts`**: Verifies tenant isolation logic, role checking, cross-tenant query filtering, and confirms all tables and RLS policies in the SQL migration.
- **`tests/csv-import.test.ts`**: Verifies CSV parsing, header auto-detection, email validation regex, duplicate skipping, and duplicate updating.
- **`tests/crm-operations.test.ts`**: Verifies pipeline value calculation, win rate formulas, stage probabilities, and task filtering.

Run tests:
```bash
npm run test
```

---

## 🚀 Live Growth & Marketing Modules (Phase 2 Deliverables)

1. **Lead Capture Forms & Public Embeds (`/forms` & `/f/[slug]`)**:
   - Visual drag-and-drop form field builder supporting text, email, phone, number, and textarea.
   - Direct CRM ingestion: submissions automatically match or create contacts in the active workspace and log timeline activities.
   - Public standalone lead submission pages (`/f/[slug]`) with anti-bot honeypots.
   - Shareable iframe widget code and custom website HTML code generators.
   - REST API ingestion endpoint at `/api/forms/[slug]` for external sites.

2. **Email Campaigns Studio (`/campaigns`)**:
   - Broadcast creator with pre-built responsive marketing email templates.
   - Audience segmentation by Lifecycle Stage, Lead Status, or CRM Tags.
   - One-click broadcast dispatch simulator logging sent activities on contact timelines.
   - Live deliverability telemetry tracking total delivered, open rate, and click-through metrics.

3. **Automation Workflows Engine (`/automations`)**:
   - Visual workflow pipeline builder supporting triggers (`form_submission`, `contact_created`, `deal_stage_changed`, `tag_added`).
   - Action steps: Send notification email, create CRM follow-up task, add tag, or trigger outbound webhook.
   - Real-time "Test Run" trigger generating execution audit history entries in `automation_logs`.

4. **AI Growth Intelligence Hub (`/ai-tools`)**:
   - **Zero Hallucinated Metrics**: 100% grounded in active Supabase workspace data.
   - Personalized Outreach Assistant drafting tailored emails from logged contact notes and company domains.
   - Deal Health & Stagnation Radar scanning for deal velocity lapses and overdue proposal stages.
   - Executive Account Briefings synthesizing contact mapping and open pipeline value.

5. **Marketing Integrations Directory (`/integrations`)**:
   - Mautic bi-directional contact synchronization with last synced timestamping.
   - Custom inbound/outbound webhook manager with live test ping utility.
   - Resend email delivery API key management.
   - Slack channel deal notifications configuration.

---

## ⚡ Phase 3: Real CRM Expansion & Complete SEO Toolkit

### CRM Realization Deliverables
1. **Contacts Engine (`/contacts`)**:
   - **Pagination & Batch Export**: Server-side pagination with configurable page limits and full CSV export button.
   - **Deterministic Lead Scoring**: Rule-based scoring engine (0–100) evaluating phone presence (+15), verified company (+15), executive job titles (+25), lifecycle stage (+15 to +35), organic inbound source (+25), consent opt-in (+10), and logged call/email activity velocity (+5 to +30) with a transparent reasons modal.
   - **Saved Views & Filters**: Create, switch, and delete named contact view filters persisted in the `contact_views` table.
   - **Consent & Custom Fields**: Opt-in/opt-out consent tracking and JSONB custom fields.
   - **Marketing Attribution**: Direct tracking of `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, and `referrer`.

2. **Deals & Configurable Sales Pipelines (`/deals` & `/deals/[id]`)**:
   - **Configurable Pipelines**: Create custom sales pipelines and switch between active pipelines.
   - **Audit Stage Transition History**: Every deal stage change automatically records from/to stages, timestamp, and user in `deal_stage_history` and is visually audited on `/deals/[id]`.

### Dedicated SEO Toolkit Deliverables
1. **Website SEO Audit (`/seo/audits`)**:
   - Domain verification via `<meta name="nexusmark-site-verification" content="...">` tag.
   - Live recursive crawler checking `robots.txt` directives, status codes, title tag length, meta description length, canonical links, H1/H2 heading architecture, images missing alt text, Schema.org JSON-LD structured data, word count, and load time.
   - Health score computation (0–100) with categorized issues (critical, warning, notice) and actionable fix recommendations.
   - Downloadable CSV audit report export.

2. **Google Search Console & Google Analytics 4 (`/seo/analytics`)**:
   - Property selector with date range filtering.
   - Real query, page, click, impression, CTR, and **Average Position** reporting (never presented as daily rank checks).
   - GA4 organic sessions and conversion performance tracking.
   - Clear "Configure Account" state when external OAuth credentials are not connected.

3. **Keyword Research & Workspace (`/seo/keywords`)**:
   - Search intent classification (`informational`, `commercial`, `transactional`, `navigational`), target URL binding, and notes.
   - CSV bulk keyword import wizard.
   - Strict data source attribution: metrics display connected provider name and last updated date. No synthetic search volume or CPC numbers are ever invented.
   - Downloadable CSV keyword report export.

4. **On-Page SEO Analyzer & Content Briefs (`/seo/on-page`)**:
   - Live on-demand DOM fetcher and analyzer with optimization score and checklist.
   - Content brief generator tied to target keywords, target URLs, word count goals, and suggested headings.

5. **Competitors & Backlinks Intelligence (`/seo/competitors`)**:
   - Live side-by-side URL crawl comparison inspecting content depth, server speed, heading hierarchy, image count, and structured data differentials.
   - Clear connection status card for external backlink providers (`DataForSEO`, `OpenPageRank`).
   - Zero simulated backlink graphs policy enforced.

6. **Local SEO & NAP Consistency Audit (`/seo/local`)**:
   - Business location directory with full address, phone, and website URL.
   - Live NAP crawler checking Name, Phone digits, and City/Postal code in website markup with automated discrepancy detection.

---

## 🔒 Zero Mock Metrics Policy & Required Environment Variables

NexusMark strictly enforces authentic data integrity:
- When third-party providers (Google Search Console, GA4, DataForSEO) are not yet configured in `seo_integrations`, the UI displays a clean "Configure Provider" state.
- Numeric SEO metrics (search volume, keyword difficulty, CPC, backlinks) are **never simulated or fabricated**.

### Supported Integration Environment Variables
```ini
# Google Search Console & GA4 OAuth
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret

# DataForSEO (Backlink Index & Live SERP Keyword Metrics)
DATAFORSEO_LOGIN=your-dataforseo-login
DATAFORSEO_PASSWORD=your-dataforseo-password

# AI Providers (Content Brief Suggestions)
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
```


