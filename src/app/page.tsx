import React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import {
  Users,
  TrendingUp,
  Building2,
  UploadCloud,
  ShieldCheck,
  Zap,
  ArrowRight,
  Database,
  CheckCircle2,
  Clock,
  Sparkles,
  GitFork,
  Mail,
  FileText,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo size="md" />

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <a href="#features" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Features
            </a>
            <a href="#pipeline" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              CRM Pipeline
            </a>
            <a href="#architecture" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Data & RLS Security
            </a>
            <a href="#roadmap" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Phase 2 Roadmap
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/25 transition-all"
            >
              <span>Launch App</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-24 md:pt-28 md:pb-32 px-6">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 text-xs font-semibold shadow-2xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Phase 1 Functional CRM Is Live & Operational</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-950 dark:text-white leading-[1.12]">
            The AI-Powered Growth CRM <br />
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Engineered for Modern Teams
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Unify your contacts, companies, deals pipeline, and activity audit timeline. Enforced by PostgreSQL Row Level Security (RLS) for ironclad multi-tenant data isolation.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <span>Open Workspace Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/contacts/import"
              className="flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all cursor-pointer shadow-2xs"
            >
              <UploadCloud className="w-4 h-4 text-indigo-500" />
              <span>Import Contacts CSV</span>
            </Link>
          </div>

          <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              PostgreSQL Row Level Security
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Next.js 16 App Router & TypeScript
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Zero Hallucinated Metrics
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Duplicate-Safe CSV Ingestion
            </span>
          </div>
        </div>
      </section>

      {/* Core Phase 1 Modules Showcase */}
      <section id="features" className="py-20 px-6 border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/60">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Complete Phase 1 Deliverables
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white mt-1">
              Everything Your Growth Team Needs
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2">
              Every feature performs real database actions. No simulated backends or dummy placeholders.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1: Contacts & Companies */}
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-4 hover:border-indigo-500/50 transition-all">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Contacts & Companies Directory
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Create, view, edit, archive, and tag contacts and organizations. Filter by lifecycle stage (Subscriber, Lead, MQL, SQL, Customer) and lead status.
              </p>
              <Link
                href="/contacts"
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline"
              >
                <span>Explore Contacts</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Feature 2: Deals Pipeline */}
            <div id="pipeline" className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-4 hover:border-indigo-500/50 transition-all">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Deals Pipeline & Kanban Board
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Track revenue, forecast deals, manage probability, and transition stages from Lead to Closed Won. Switch seamlessly between Kanban board and table views.
              </p>
              <Link
                href="/deals"
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline"
              >
                <span>View Pipeline Board</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Feature 3: CSV Import Engine */}
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-4 hover:border-indigo-500/50 transition-all">
              <div className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-950 text-pink-600 dark:text-pink-400 flex items-center justify-center font-bold">
                <UploadCloud className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                CSV Contact Import Engine
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Import thousands of contacts with automated column detection, field mapping, strict email validation, and intelligent duplicate skipping or updating.
              </p>
              <Link
                href="/contacts/import"
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline"
              >
                <span>Import CSV File</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Multi-Tenant Architecture */}
      <section id="architecture" className="py-20 px-6 border-t border-slate-200 dark:border-slate-800/80">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-950 dark:text-white">
                  Multi-Tenant PostgreSQL Row Level Security (RLS)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Strict tenant isolation verified in automated test suites
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <h4 className="font-bold text-slate-900 dark:text-white mb-1">
                  1. Workspace Scoping On Every Table
                </h4>
                <p>
                  Every CRM record (contacts, companies, deals, activities, tasks) includes a mandatory <code className="font-mono text-indigo-600 dark:text-indigo-400">workspace_id</code> foreign key.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <h4 className="font-bold text-slate-900 dark:text-white mb-1">
                  2. Database-Level Enforcement
                </h4>
                <p>
                  PostgreSQL policies prevent users from querying, modifying, or deleting records outside of their authenticated workspace memberships.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Roadmap Section */}
      <section id="roadmap" className="py-20 px-6 border-t border-slate-200 dark:border-slate-800/80 bg-slate-100/50 dark:bg-slate-900/30">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Future Roadmap
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white mt-1">
              Phase 2 Expansion Modules
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2">
              Database schemas and architectural blueprints are already initialized and waiting for Phase 2 activation.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { name: 'Lead Forms', href: '/forms', icon: FileText, desc: 'Public lead capture forms & embeds' },
              { name: 'Email Campaigns', href: '/campaigns', icon: Mail, desc: 'Deliverability & unsubscribe tracking' },
              { name: 'Automations', href: '/automations', icon: GitFork, desc: 'Triggers, branch logic & logs' },
              { name: 'AI Growth Hub', href: '/ai-tools', icon: Sparkles, desc: 'Grounded insights from DB data' },
              { name: 'Integrations', href: '/integrations', icon: Zap, desc: 'Mautic bridge & webhook sync' },
            ].map((mod) => (
              <Link
                key={mod.name}
                href={mod.href}
                className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:border-indigo-500/50 hover:shadow-md transition-all group block"
              >
                <div className="flex items-center justify-between mb-3">
                  <mod.icon className="w-5 h-5 text-indigo-500" />
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                    Phase 2
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {mod.name}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {mod.desc}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 py-8 px-6 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <Logo size="sm" />
          <p>© {new Date().getFullYear()} NexusMark. Original AI-Powered Digital Marketing & Growth Platform.</p>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="hover:text-indigo-600 dark:hover:text-indigo-400">
              Dashboard
            </Link>
            <Link href="/contacts" className="hover:text-indigo-600 dark:hover:text-indigo-400">
              Contacts
            </Link>
            <Link href="/deals" className="hover:text-indigo-600 dark:hover:text-indigo-400">
              Deals
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
