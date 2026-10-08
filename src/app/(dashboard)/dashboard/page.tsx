import React from 'react';
import { cookies } from 'next/headers';
import { getContacts } from '@/lib/actions/contacts';
import { getDeals } from '@/lib/actions/deals';
import { getActivities } from '@/lib/actions/activities';
import { getTasks, updateTaskStatus } from '@/lib/actions/tasks';
import { getUserWorkspaces } from '@/lib/actions/workspaces';
import { calculatePipelineMetrics } from '@/lib/crm/metrics';
import {
  Users,
  TrendingUp,
  DollarSign,
  Award,
  CheckSquare,
  Plus,
  UploadCloud,
  Building2,
  Calendar,
  Clock,
  ArrowUpRight,
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
          description="Create your first workspace to begin managing contacts, pipelines, and campaigns."
          actionLabel="Create Workspace"
          actionHref="/workspaces/new"
        />
      </div>
    );
  }

  // Fetch real data from PostgreSQL
  const [contacts, deals, activities, tasks] = await Promise.all([
    getContacts(activeWsId),
    getDeals(activeWsId),
    getActivities(activeWsId, { limit: 6 }),
    getTasks(activeWsId),
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
    <div className="space-y-8">
      {/* Page Header with Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Workspace Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time pipeline metrics, database records, and active task tracking.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/contacts/import"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-2xs"
          >
            <UploadCloud className="w-3.5 h-3.5 text-indigo-500" />
            <span>Import CSV</span>
          </Link>
          <Link
            href="/contacts"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Contact</span>
          </Link>
          <Link
            href="/deals"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white shadow-2xs transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Deal</span>
          </Link>
        </div>
      </div>

      {/* Real Data KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Contacts */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Total Contacts
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {contacts.length}
            </span>
            <span className="text-[11px] text-slate-400">records in DB</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
            <Link
              href="/contacts"
              className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-0.5"
            >
              <span>Manage contacts</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Open Pipeline Value */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Active Pipeline Value
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
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>{pipeline.activeDealsCount} active opportunities</span>
          </div>
        </div>

        {/* Won Value */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Closed Won Revenue
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {formatCurrency(pipeline.wonValue)}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Win rate: {pipeline.winRate}%</span>
          </div>
        </div>

        {/* Pending Tasks */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Pending Tasks
            </span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {pendingTasks.length}
            </span>
            <span className="text-[11px] text-slate-400">action items</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
            <Link
              href="/tasks"
              className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-0.5"
            >
              <span>View task queue</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Grid: Pipeline Summary & Recent Activity Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Pipeline Stages & Tasks */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Deals Summary */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Deals Pipeline Snapshot
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Real database deals grouped by progression stage
                </p>
              </div>
              <Link
                href="/deals"
                className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
              >
                Open Kanban board →
              </Link>
            </div>

            {deals.length === 0 ? (
              <EmptyState
                iconName="trending"
                title="No Deals in Pipeline"
                description="Create deals to track sales opportunities, forecasted amounts, and conversion stages."
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
                        className="text-xs font-semibold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 truncate block"
                      >
                        {deal.title}
                      </Link>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
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

          {/* Pending Tasks Queue */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Action Items & Tasks
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Follow-ups assigned to records in this workspace
                </p>
              </div>
              <Link
                href="/tasks"
                className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
              >
                View all tasks →
              </Link>
            </div>

            {pendingTasks.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                All caught up! No pending tasks remaining in this workspace.
              </div>
            ) : (
              <div className="space-y-2">
                {pendingTasks.slice(0, 4).map((task) => (
                  <div
                    key={task.id}
                    className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {task.title}
                      </p>
                      {task.due_date && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>
                            Due {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        </p>
                      )}
                    </div>
                    <StatusBadge status={task.priority} type="priority" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Recent Activities Feed */}
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Recent Workspace Activity
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live audit trail of notes, status changes, and meetings
            </p>
          </div>

          {activities.length === 0 ? (
            <EmptyState
              iconName="clock"
              title="No Activities Logged"
              description="Notes and audit trail will populate automatically as your team works."
            />
          ) : (
            <div className="space-y-4">
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
