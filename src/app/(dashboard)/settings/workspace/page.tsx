import React from 'react';
import { cookies } from 'next/headers';
import { getUserWorkspaces, getWorkspaceMembers } from '@/lib/actions/workspaces';
import { Building2, ShieldCheck, Users, Calendar } from 'lucide-react';
import { notFound } from 'next/navigation';

export default async function WorkspaceSettingsPage() {
  const cookieStore = await cookies();
  const workspaces = await getUserWorkspaces();
  const activeWsId =
    cookieStore.get('nexusmark_active_workspace')?.value || workspaces[0]?.id;

  if (!activeWsId) notFound();

  const currentWorkspace = workspaces.find((w) => w.id === activeWsId) || workspaces[0];
  const members = await getWorkspaceMembers(activeWsId);

  return (
    <div className="max-w-4xl space-y-6">
      {/* Top Bar */}
      <div className="pb-6 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Workspace Settings & Security
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Review tenant identifiers, member access controls, and PostgreSQL RLS configuration.
        </p>
      </div>

      {/* Workspace Information */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {currentWorkspace.name}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Slug: {currentWorkspace.slug}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div>
            <span className="text-slate-400 block mb-0.5">Workspace Tenant UUID</span>
            <span className="font-mono text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
              {currentWorkspace.id}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block mb-0.5">Created Date</span>
            <span className="text-slate-800 dark:text-slate-200 flex items-center gap-1.5 py-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{new Date(currentWorkspace.created_at).toLocaleDateString()}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Security & Isolation Status */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="w-5 h-5" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Row Level Security (RLS) Isolation Active
          </h3>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Every table in your PostgreSQL database enforces workspace membership via <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-indigo-600 dark:text-indigo-400">public.is_workspace_member(workspace_id)</code>. Contacts, deals, companies, and activities in this workspace cannot be queried or updated by users outside your membership list.
        </p>
      </div>

      {/* Workspace Members & Roles */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Team Members ({members.length})
            </h3>
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {members.map((member) => (
            <div
              key={member.id}
              className="py-3 flex items-center justify-between text-xs"
            >
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">
                  User ID: <span className="font-mono text-slate-500">{member.user_id}</span>
                </p>
                <p className="text-[11px] text-slate-400">
                  Joined {new Date(member.created_at).toLocaleDateString()}
                </p>
              </div>

              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                {member.role}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
