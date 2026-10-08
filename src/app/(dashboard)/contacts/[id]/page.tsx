import React from 'react';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { getContactById } from '@/lib/actions/contacts';
import { getActivities } from '@/lib/actions/activities';
import { getTasks } from '@/lib/actions/tasks';
import { getUserWorkspaces } from '@/lib/actions/workspaces';
import { StatusBadge } from '@/components/crm/StatusBadge';
import { ActivityTimeline } from '@/components/crm/ActivityTimeline';
import {
  ArrowLeft,
  Mail,
  Phone,
  Briefcase,
  Building2,
  Calendar,
  CheckSquare,
  Clock,
  User,
} from 'lucide-react';
import { notFound } from 'next/navigation';

export default async function ContactDetailPage({
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

  const [contact, activities, tasks] = await Promise.all([
    getContactById(activeWsId, id),
    getActivities(activeWsId, { contact_id: id }),
    getTasks(activeWsId, { contact_id: id }),
  ]);

  if (!contact) notFound();

  return (
    <div className="space-y-6">
      {/* Back link & Top Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        <Link
          href="/contacts"
          className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Contacts</span>
        </Link>
        <div className="flex items-center gap-2">
          {contact.is_archived && (
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              Archived Record
            </span>
          )}
        </div>
      </div>

      {/* Main Grid: Left Profile Card & Right Activity Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Contact Profile Info */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                {contact.first_name.charAt(0)}
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {contact.first_name} {contact.last_name}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {contact.job_title || 'Lead / Contact'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <StatusBadge status={contact.lead_status} type="lead_status" />
              <StatusBadge
                status={contact.lifecycle_stage}
                type="lifecycle_stage"
              />
            </div>

            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <a
                  href={`mailto:${contact.email}`}
                  className="font-mono text-indigo-600 dark:text-indigo-400 hover:underline truncate"
                >
                  {contact.email}
                </a>
              </div>

              {contact.phone && (
                <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{contact.phone}</span>
                </div>
              )}

              {contact.company && (
                <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                  <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                  <Link
                    href={`/companies/${contact.company.id}`}
                    className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {contact.company.name}
                  </Link>
                </div>
              )}

              <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  Added {new Date(contact.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Tags */}
            {contact.tags && contact.tags.length > 0 && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Tags
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {contact.tags.map((t) => (
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

          {/* Linked Tasks for Contact */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-3">
              Contact Tasks ({tasks.length})
            </h3>
            {tasks.length === 0 ? (
              <p className="text-xs text-slate-400">No tasks linked to this contact.</p>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs flex items-center justify-between"
                  >
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {task.title}
                      </p>
                      {task.due_date && (
                        <p className="text-[10px] text-slate-400">
                          Due {new Date(task.due_date).toLocaleDateString()}
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

        {/* Right 2 Columns: Activity Timeline & Notes */}
        <div className="lg:col-span-2">
          <ActivityTimeline
            workspaceId={activeWsId}
            contactId={contact.id}
            activities={activities}
          />
        </div>
      </div>
    </div>
  );
}
