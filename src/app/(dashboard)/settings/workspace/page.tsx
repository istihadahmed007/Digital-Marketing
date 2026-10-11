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
    <div className="max-w-4xl space-y-6 animate-in fade-in duration-200">
      {/* Top Bar */}
      <div className="pb-6 border-b border-[#75D2EE]/20 dark:border-slate-800">
        <h1 className="text-2xl font-bold tracking-tight text-[#17364A] dark:text-white">
          Workspace Settings & Security
        </h1>
        <p className="text-xs text-[#526D7D] dark:text-slate-300 mt-1">
          Review tenant identifiers, member access controls, and PostgreSQL RLS isolation status.
        </p>
      </div>

      {/* Workspace Information */}
      <div className="p-6 rounded-2xl glass-panel shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#75D2EE]/15 border border-[#75D2EE]/30 flex items-center justify-center text-[#167AA0] dark:text-[#75D2EE] font-bold">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#17364A] dark:text-white">
              {currentWorkspace.name}
            </h2>
            <p className="text-xs text-[#526D7D] dark:text-slate-400 font-mono">
              Slug: {currentWorkspace.slug}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-[#75D2EE]/20 dark:border-slate-800 text-xs">
          <div>
            <span className="text-[#526D7D] dark:text-slate-400 block mb-0.5">Workspace Tenant UUID</span>
            <span className="font-mono text-[#17364A] dark:text-slate-200 bg-white/70 dark:bg-slate-800 border border-[#75D2EE]/20 px-2 py-1 rounded-lg inline-block">
              {currentWorkspace.id}
            </span>
          </div>

          <div>
            <span className="text-[#526D7D] dark:text-slate-400 block mb-0.5">Created Date</span>
            <span className="text-[#17364A] dark:text-slate-200 flex items-center gap-1.5 py-1">
              <Calendar className="w-3.5 h-3.5 text-[#167AA0]" />
              <span>{new Date(currentWorkspace.created_at).toLocaleDateString()}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Security & Isolation Status */}
      <div className="p-6 rounded-2xl glass-panel shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="w-5 h-5 text-emerald-500" />
          <h3 className="text-sm font-bold text-[#17364A] dark:text-white">
            Row Level Security (RLS) Isolation Active
          </h3>
        </div>
        <p className="text-xs text-[#526D7D] dark:text-slate-300 leading-relaxed">
          Every table in your PostgreSQL database enforces workspace membership via <code className="bg-[#D7F1FA]/50 dark:bg-slate-800 border border-[#75D2EE]/25 px-1.5 py-0.5 rounded font-mono text-[#167AA0] dark:text-[#75D2EE]">public.is_workspace_member(workspace_id)</code>. Contacts, deals, companies, and activities in this workspace cannot be queried or updated by users outside your membership list.
        </p>
      </div>

      {/* Workspace Members & Roles */}
      <div className="p-6 rounded-2xl glass-panel-opaque shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#167AA0]" />
            <h3 className="text-sm font-bold text-[#17364A] dark:text-white">
              Team Members ({members.length})
            </h3>
          </div>
        </div>

        <div className="divide-y divide-[#75D2EE]/20 dark:divide-slate-800">
          {members.map((member) => (
            <div
              key={member.id}
              className="py-3 flex items-center justify-between text-xs"
            >
              <div>
                <p className="font-semibold text-[#17364A] dark:text-white">
                  User ID: <span className="font-mono text-[#526D7D] dark:text-slate-400">{member.user_id}</span>
                </p>
                <p className="text-[11px] text-[#526D7D] dark:text-slate-400">
                  Joined {new Date(member.created_at).toLocaleDateString()}
                </p>
              </div>

              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-[#75D2EE]/15 text-[#167AA0] dark:text-[#75D2EE] border border-[#75D2EE]/30">
                {member.role}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
