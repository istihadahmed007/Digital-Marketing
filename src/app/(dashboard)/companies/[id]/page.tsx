import React from 'react';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { getCompanyById } from '@/lib/actions/companies';
import { getActivities } from '@/lib/actions/activities';
import { getUserWorkspaces } from '@/lib/actions/workspaces';
import { ActivityTimeline } from '@/components/crm/ActivityTimeline';
import { StatusBadge } from '@/components/crm/StatusBadge';
import {
  ArrowLeft,
  Building2,
  Globe,
  Phone,
  MapPin,
  Users,
  TrendingUp,
} from 'lucide-react';
import { notFound } from 'next/navigation';

export default async function CompanyDetailPage({
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

  const [companyData, activities] = await Promise.all([
    getCompanyById(activeWsId, id),
    getActivities(activeWsId, { company_id: id }),
  ]);

  if (!companyData.company) notFound();

  const { company, contacts, deals } = companyData;

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        <Link
          href="/companies"
          className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Companies</span>
        </Link>
        {company.is_archived && (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            Archived Company
          </span>
        )}
      </div>

      {/* Main Grid: Left Profile & Associated Records, Right Activity Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          {/* Company Card */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-base uppercase shrink-0">
                {company.name.substring(0, 2)}
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {company.name}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {company.industry || 'Company Profile'}
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              {company.domain && (
                <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                  <Globe className="w-4 h-4 text-slate-400 shrink-0" />
                  <a
                    href={`https://${company.domain}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 hover:underline font-mono"
                  >
                    {company.domain}
                  </a>
                </div>
              )}

              {company.phone && (
                <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{company.phone}</span>
                </div>
              )}

              {(company.city || company.country) && (
                <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>
                    {[company.city, company.country].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}

              {company.size && (
                <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                  <Users className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{company.size} employees</span>
                </div>
              )}
            </div>

            {/* Tags */}
            {company.tags && company.tags.length > 0 && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Tags
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {company.tags.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Associated Contacts */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-3 flex items-center justify-between">
              <span>Contacts ({contacts.length})</span>
            </h3>
            {contacts.length === 0 ? (
              <p className="text-xs text-slate-400">No contacts linked to this company.</p>
            ) : (
              <div className="space-y-2">
                {contacts.map((c) => (
                  <Link
                    key={c.id}
                    href={`/contacts/${c.id}`}
                    className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors block"
                  >
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {c.first_name} {c.last_name}
                      </p>
                      <p className="text-[11px] text-slate-400">{c.email}</p>
                    </div>
                    <StatusBadge status={c.lead_status} type="lead_status" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Associated Deals */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-3 flex items-center justify-between">
              <span>Deals ({deals.length})</span>
            </h3>
            {deals.length === 0 ? (
              <p className="text-xs text-slate-400">No deals linked to this company.</p>
            ) : (
              <div className="space-y-2">
                {deals.map((d) => (
                  <Link
                    key={d.id}
                    href={`/deals/${d.id}`}
                    className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors block"
                  >
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {d.title}
                      </p>
                      <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                        {d.currency} {d.amount.toLocaleString()}
                      </p>
                    </div>
                    <StatusBadge status={d.stage} type="deal_stage" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 2 Columns: Activity Timeline */}
        <div className="lg:col-span-2">
          <ActivityTimeline
            workspaceId={activeWsId}
            companyId={company.id}
            activities={activities}
          />
        </div>
      </div>
    </div>
  );
}
