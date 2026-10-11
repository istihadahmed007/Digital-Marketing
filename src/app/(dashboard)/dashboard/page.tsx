import React from 'react';
import { cookies } from 'next/headers';
import { getContacts } from '@/lib/actions/contacts';
import { getDeals } from '@/lib/actions/deals';
import { getActivities } from '@/lib/actions/activities';
import { getTasks } from '@/lib/actions/tasks';
import { getUserWorkspaces } from '@/lib/actions/workspaces';
import { getCampaigns } from '@/lib/actions/campaigns';
import { getShortsClips } from '@/lib/actions/shorts';
import { getForms } from '@/lib/actions/forms';
import { getIntegrations } from '@/lib/actions/integrations';
import { calculatePipelineMetrics } from '@/lib/crm/metrics';
import {
  Users,
  DollarSign,
  TrendingUp,
  Mail,
  Video,
  Plus,
  ArrowUpRight,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Compass,
  FileText,
  Plug,
  Calendar,
  Radio,
  Check,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import { EmptyState } from '@/components/crm/EmptyState';
import { StatusBadge } from '@/components/crm/StatusBadge';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const workspaces = await getUserWorkspaces();
  const activeWsId =
    cookieStore.get('nexusmark_active_workspace')?.value || workspaces[0]?.id;

  if (!activeWsId) {
    return (
      <div className="py-12">
        <EmptyState
          iconName="building"
          title="No Active Workspace Selected"
          description="Create your first workspace to begin managing customers, campaigns, and Shorts."
          actionLabel="Create Workspace"
          actionHref="/workspaces/new"
        />
      </div>
    );
  }

  // Fetch real data across all modules
  const [contacts, deals, activities, tasks, campaigns, clips, forms, integrations] =
    await Promise.all([
      getContacts(activeWsId),
      getDeals(activeWsId),
      getActivities(activeWsId, { limit: 8 }),
      getTasks(activeWsId),
      getCampaigns(activeWsId),
      getShortsClips(activeWsId),
      getForms(activeWsId),
      getIntegrations(activeWsId),
    ]);

  const pipeline = calculatePipelineMetrics(deals);
  const pendingTasks = tasks.filter(
    (t) => t.status === 'pending' || t.status === 'in_progress'
  );
  const draftCampaigns = campaigns.filter((c) => c.status === 'draft');
  const publishedClips = clips.filter((c) => c.render_status === 'rendered');
  const liveForms = forms.filter((f) => f.is_published);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Welcome Header & Starting Shortcuts */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-sky-100 dark:border-sky-900/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Workspace Overview
            </h1>
            <span className="glass-pill px-2.5 py-0.5 rounded-full text-xs font-bold">
              Real Marketing Engine
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            A clear view of your active marketing touchpoints, urgent action items, and recent customer interactions.
          </p>
        </div>

        {/* Clear Starting Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/campaigns/journey"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition-all"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Open 4D Journey</span>
          </Link>

          <Link
            href="/contacts"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl glass-panel text-slate-800 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-slate-800 transition-all shadow-xs"
          >
            <Users className="w-3.5 h-3.5 text-sky-600" />
            <span>Add Customer</span>
          </Link>

          <Link
            href="/shorts"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl glass-panel text-purple-700 dark:text-purple-300 hover:bg-purple-50 transition-all shadow-xs"
          >
            <Video className="w-3.5 h-3.5 text-purple-600" />
            <span>Make Shorts</span>
          </Link>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* SECTION 1: WHAT IS ACTIVE RIGHT NOW?                                  */}
      {/* ===================================================================== */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              1. What is Active Right Now
            </h2>
          </div>
          <Link
            href="/campaigns/journey"
            className="text-xs text-sky-600 dark:text-sky-400 font-semibold hover:underline flex items-center gap-1"
          >
            <span>View Full 4D Journey</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Active Customers */}
          <div className="glass-panel p-5 rounded-2xl border border-sky-200/70 shadow-xs glass-panel-interactive">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Audience &amp; Customers
              </span>
              <div className="p-2 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">
                {contacts.length}
              </span>
              <span className="text-[11px] text-slate-400">active contacts</span>
            </div>
            <div className="mt-3 pt-3 border-t border-sky-100 dark:border-sky-900/60 text-[11px]">
              <Link
                href="/contacts"
                className="text-sky-600 dark:text-sky-400 font-semibold hover:underline flex items-center gap-0.5"
              >
                <span>Browse directory</span>
                <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Active Pipeline Value */}
          <div className="glass-panel p-5 rounded-2xl border border-sky-200/70 shadow-xs glass-panel-interactive">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Pipeline Deal Value
              </span>
              <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">
                {formatCurrency(pipeline.totalPipelineValue)}
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-sky-100 dark:border-sky-900/60 text-[11px] text-slate-500 flex items-center justify-between">
              <span>{pipeline.activeDealsCount} active deals</span>
              <Link href="/deals" className="text-sky-600 font-semibold hover:underline">
                View deals
              </Link>
            </div>
          </div>

          {/* Video Studio Clips */}
          <div className="glass-panel p-5 rounded-2xl border border-sky-200/70 shadow-xs glass-panel-interactive">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Video Studio Clips
              </span>
              <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                <Video className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">
                {clips.length}
              </span>
              <span className="text-[11px] text-slate-400">vertical shorts</span>
            </div>
            <div className="mt-3 pt-3 border-t border-sky-100 dark:border-sky-900/60 text-[11px]">
              <Link
                href="/shorts"
                className="text-purple-600 dark:text-purple-400 font-semibold hover:underline flex items-center gap-0.5"
              >
                <span>Open Video Studio</span>
                <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Live Inbound Forms */}
          <div className="glass-panel p-5 rounded-2xl border border-sky-200/70 shadow-xs glass-panel-interactive">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Live Lead Forms
              </span>
              <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">
                {liveForms.length}
              </span>
              <span className="text-[11px] text-slate-400">capturing leads</span>
            </div>
            <div className="mt-3 pt-3 border-t border-sky-100 dark:border-sky-900/60 text-[11px]">
              <Link
                href="/forms"
                className="text-amber-600 dark:text-amber-400 font-semibold hover:underline flex items-center gap-0.5"
              >
                <span>View form submissions</span>
                <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* 4D Campaign Journey Hero Banner */}
        <div className="glass-panel rounded-2xl p-5 border border-sky-200/80 bg-gradient-to-r from-sky-50/80 via-blue-50/40 to-indigo-50/50 dark:from-slate-900 dark:via-sky-950/30 dark:to-slate-900 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white shadow-xs shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Explore Your 4D Campaign Journey
                </h3>
                <span className="glass-pill px-2 py-0.5 rounded-full text-[10px] font-bold">
                  Time × Channel × Stage × Outcome
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 max-w-xl leading-relaxed">
                Review your marketing actions plotted across customer stages (Discover → Consider → Convert) with real verified engagement and sales numbers.
              </p>
            </div>
          </div>

          <Link
            href="/campaigns/journey"
            className="flex items-center gap-1.5 self-start md:self-auto px-4 py-2 text-xs font-bold rounded-xl bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition-all shrink-0"
          >
            <span>Launch 4D Canvas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* SECTION 2: WHAT NEEDS ATTENTION?                                      */}
      {/* ===================================================================== */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            2. What Needs Attention
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Pending Tasks */}
          <div className="glass-panel p-5 rounded-2xl border border-sky-200/70 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-600" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                  Tasks Pending ({pendingTasks.length})
                </h3>
              </div>
              <Link href="/tasks" className="text-[11px] text-sky-600 font-semibold hover:underline">
                View all
              </Link>
            </div>

            {pendingTasks.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
                <span>All tasks are completed!</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {pendingTasks.slice(0, 3).map((task) => (
                  <div
                    key={task.id}
                    className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-sky-100 dark:border-sky-800 text-xs flex items-center justify-between gap-2"
                  >
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {task.title}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-semibold shrink-0 capitalize">
                      {task.priority}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Draft Campaigns Awaiting Send */}
          <div className="glass-panel p-5 rounded-2xl border border-sky-200/70 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                  Draft Broadcasts ({draftCampaigns.length})
                </h3>
              </div>
              <Link href="/campaigns" className="text-[11px] text-sky-600 font-semibold hover:underline">
                Manage
              </Link>
            </div>

            {draftCampaigns.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
                <span>No drafts waiting to be sent.</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {draftCampaigns.slice(0, 3).map((camp) => (
                  <div
                    key={camp.id}
                    className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-sky-100 dark:border-sky-800 text-xs flex items-center justify-between gap-2"
                  >
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {camp.name}
                    </span>
                    <Link
                      href="/campaigns"
                      className="text-[10px] text-sky-600 font-bold hover:underline shrink-0"
                    >
                      Dispatch →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Connected Apps Health */}
          <div className="glass-panel p-5 rounded-2xl border border-sky-200/70 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plug className="w-4 h-4 text-teal-600" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                  Connected Integrations
                </h3>
              </div>
              <Link href="/integrations" className="text-[11px] text-sky-600 font-semibold hover:underline">
                Configure
              </Link>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-sky-100 dark:border-sky-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="font-medium text-slate-800 dark:text-slate-200">Supabase CRM DB</span>
                </div>
                <span className="text-[10px] text-emerald-600 font-semibold">Active</span>
              </div>

              <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-sky-100 dark:border-sky-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-sky-500" />
                  <span className="font-medium text-slate-800 dark:text-slate-200">Google OAuth &amp; YouTube</span>
                </div>
                <Link href="/integrations" className="text-[10px] text-sky-600 font-semibold hover:underline">
                  Settings →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* SECTION 3: WHAT HAPPENED RECENTLY?                                    */}
      {/* ===================================================================== */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-sky-600" />
          <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            3. What Happened Recently
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Timeline Activity (2 cols) */}
          <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-sky-200/70 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-sky-100 dark:border-sky-900/60">
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Customer &amp; Workspace Activity Log
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Follow-ups, notes, email sends, and pipeline updates
                </p>
              </div>
            </div>

            {activities.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No recent activity logged yet. Add your first note or contact.
              </div>
            ) : (
              <div className="divide-y divide-sky-100 dark:divide-sky-900/40">
                {activities.map((act) => (
                  <div key={act.id} className="py-3 flex items-start justify-between gap-4">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white capitalize">
                          {act.title}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 uppercase">
                          {act.type}
                        </span>
                      </div>
                      {act.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                          {act.description}
                        </p>
                      )}
                    </div>
                    <time className="text-[11px] text-slate-400 shrink-0">
                      {new Date(act.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </time>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Sales Opportunities (1 col) */}
          <div className="glass-panel p-6 rounded-2xl border border-sky-200/70 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-sky-100 dark:border-sky-900/60">
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Active Deals
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Top sales conversions
                </p>
              </div>
              <Link href="/deals" className="text-xs text-sky-600 font-semibold hover:underline">
                View deals
              </Link>
            </div>

            {deals.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No active deals in sales stages.
              </div>
            ) : (
              <div className="space-y-3">
                {deals.slice(0, 4).map((deal) => (
                  <div
                    key={deal.id}
                    className="p-3 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-sky-100 dark:border-sky-800 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`/deals/${deal.id}`}
                        className="text-xs font-bold text-slate-900 dark:text-white hover:text-sky-600 truncate block"
                      >
                        {deal.title}
                      </Link>
                      <span className="text-xs font-bold text-sky-700 dark:text-sky-300 shrink-0">
                        {deal.currency} {deal.amount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>{deal.company?.name || deal.contact?.first_name || 'Individual'}</span>
                      <StatusBadge status={deal.stage} type="deal_stage" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
