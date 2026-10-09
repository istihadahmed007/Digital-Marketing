import React from 'react';
import { cookies } from 'next/headers';
import { getContacts } from '@/lib/actions/contacts';
import { getDeals } from '@/lib/actions/deals';
import { getActivities } from '@/lib/actions/activities';
import { getTasks } from '@/lib/actions/tasks';
import { getUserWorkspaces } from '@/lib/actions/workspaces';
import { getCampaigns } from '@/lib/actions/campaigns';
import { getShortsClips } from '@/lib/actions/shorts';
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

  // Fetch real data
  const [contacts, deals, activities, tasks, campaigns, clips] = await Promise.all([
    getContacts(activeWsId),
    getDeals(activeWsId),
    getActivities(activeWsId, { limit: 5 }),
    getTasks(activeWsId),
    getCampaigns(activeWsId),
    getShortsClips(activeWsId),
  ]);

  const pipeline = calculatePipelineMetrics(deals);
  const pendingTasks = tasks.filter(
    (t) => t.status === 'pending' || t.status === 'in_progress'
  );

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Page Header with One Clear Headline & Starting Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Welcome to Your Workspace
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Grow your business with organized customer relationships, email campaigns, and vertical Shorts.
          </p>
        </div>

        {/* Clear Starting Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/contacts"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add a Customer</span>
          </Link>

          <Link
            href="/campaigns"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 transition-all shadow-xs"
          >
            <Mail className="w-3.5 h-3.5 text-indigo-500" />
            <span>Create an Email</span>
          </Link>

          <Link
            href="/shorts"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-100 transition-all shadow-xs"
          >
            <Video className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>Video Studio</span>
          </Link>
        </div>
      </div>

      {/* Overview Cards (Customers, Pipeline, Email, Shorts) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Customers */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Total Customers
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {contacts.length}
            </span>
            <span className="text-[11px] text-slate-400">contacts</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px]">
            <Link
              href="/contacts"
              className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-0.5"
            >
              <span>View all customers</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Active Pipeline */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Deals Pipeline Value
            </span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {formatCurrency(pipeline.totalPipelineValue)}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
            <span>{pipeline.activeDealsCount} active deals</span>
          </div>
        </div>

        {/* Email Campaigns */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Email Campaigns
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Mail className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {campaigns.length}
            </span>
            <span className="text-[11px] text-slate-400">campaigns</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px]">
            <Link
              href="/campaigns"
              className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-0.5"
            >
              <span>Manage emails</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Video Studio Clips */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Video Studio
            </span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <Video className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {clips.length}
            </span>
            <span className="text-[11px] text-slate-400">vertical clips</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px]">
            <Link
              href="/shorts"
              className="text-purple-600 dark:text-purple-400 font-semibold hover:underline flex items-center gap-0.5"
            >
              <span>Open Video Studio</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Grid: Active Deals & Recent Customer Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Deals Snapshot */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Active Deals Snapshot
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Opportunities currently moving through your sales stages
                </p>
              </div>
              <Link
                href="/deals"
                className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
              >
                View all deals →
              </Link>
            </div>

            {deals.length === 0 ? (
              <EmptyState
                iconName="trending"
                title="No Deals in Pipeline"
                description="Create deals to track sales opportunities and conversion stages."
                actionLabel="Create First Deal"
                actionHref="/deals"
              />
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {deals.slice(0, 5).map((deal) => (
                  <div
                    key={deal.id}
                    className="py-3 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/deals/${deal.id}`}
                        className="text-xs font-semibold text-slate-900 dark:text-white hover:text-indigo-600 truncate block"
                      >
                        {deal.title}
                      </Link>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {deal.company?.name || deal.contact?.first_name || 'No account linked'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <StatusBadge status={deal.stage} type="deal_stage" />
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {deal.currency} {deal.amount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Recent Timeline Activity */}
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Recent Activity
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Customer follow-ups and workspace notes
            </p>
          </div>

          {activities.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No recent activity logged yet.
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((act) => (
                <div
                  key={act.id}
                  className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white capitalize truncate">
                      {act.title}
                    </span>
                    <time className="text-[10px] text-slate-400 shrink-0">
                      {new Date(act.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </time>
                  </div>
                  {act.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {act.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
