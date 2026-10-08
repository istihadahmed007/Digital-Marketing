import React from 'react';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { getDealById, getDealStageHistory } from '@/lib/actions/deals';
import { getActivities } from '@/lib/actions/activities';
import { getUserWorkspaces } from '@/lib/actions/workspaces';
import { ActivityTimeline } from '@/components/crm/ActivityTimeline';
import { StatusBadge } from '@/components/crm/StatusBadge';
import {
  ArrowLeft,
  DollarSign,
  TrendingUp,
  Building2,
  User,
  Calendar,
  Percent,
  History,
  ArrowRight,
} from 'lucide-react';
import { notFound } from 'next/navigation';

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const workspaces = await getUserWorkspaces();
  const activeWsId =
    cookieStore.get('nexusmark_active_workspace')?.value || workspaces[0]?.id;

  if (!activeWsId) notFound();

  const [deal, activities, stageHistory] = await Promise.all([
    getDealById(activeWsId, id),
    getActivities(activeWsId, { deal_id: id }),
    getDealStageHistory(activeWsId, id),
  ]);

  if (!deal) notFound();

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        <Link
          href="/deals"
          className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Pipeline</span>
        </Link>
        {deal.is_archived && (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            Archived Deal
          </span>
        )}
      </div>

      {/* Main Grid: Left Details & Right Activity Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          {/* Deal Summary Card */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Deal Opportunity
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                {deal.title}
              </h2>
            </div>

            <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Deal Value
                </p>
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {deal.currency} {deal.amount.toLocaleString()}
                </p>
              </div>
              <StatusBadge status={deal.stage} type="deal_stage" />
            </div>

            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-2 text-slate-500">
                  <Percent className="w-4 h-4 text-slate-400" />
                  <span>Win Probability</span>
                </span>
                <span className="font-bold">{deal.probability}%</span>
              </div>

              {deal.expected_close_date && (
                <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-2 text-slate-500">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>Expected Close</span>
                  </span>
                  <span>{new Date(deal.expected_close_date).toLocaleDateString()}</span>
                </div>
              )}

              {deal.company && (
                <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-2 text-slate-500">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <span>Company</span>
                  </span>
                  <Link
                    href={`/companies/${deal.company.id}`}
                    className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {deal.company.name}
                  </Link>
                </div>
              )}

              {deal.contact && (
                <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-2 text-slate-500">
                    <User className="w-4 h-4 text-slate-400" />
                    <span>Contact</span>
                  </span>
                  <Link
                    href={`/contacts/${deal.contact.id}`}
                    className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {deal.contact.first_name} {deal.contact.last_name}
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Stage Transition History Card */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Stage Transition History
              </h3>
            </div>

            {stageHistory.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic py-2">
                No stage changes recorded yet. Initial creation at {new Date(deal.created_at).toLocaleDateString()}.
              </p>
            ) : (
              <div className="space-y-3 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 dark:before:bg-slate-800">
                {stageHistory.map((sh: any) => (
                  <div key={sh.id} className="relative pl-6 text-xs space-y-1">
                    <div className="absolute left-1 top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-600 dark:bg-indigo-400 ring-4 ring-white dark:ring-slate-900" />
                    <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                      <span className="capitalize">{sh.from_stage ? sh.from_stage.replace('_', ' ') : 'Initial'}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span className="capitalize font-bold text-indigo-600 dark:text-indigo-400">
                        {sh.to_stage.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      {new Date(sh.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 2 Columns: Activity Timeline */}
        <div className="lg:col-span-2">
          <ActivityTimeline
            workspaceId={activeWsId}
            dealId={deal.id}
            activities={activities}
          />
        </div>
      </div>
    </div>
  );
}
