'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Logo } from '@/components/brand/Logo';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { Workspace } from '@/lib/types/crm';
import { createClient } from '@/lib/supabase/client';
import { AiAssistantModal } from '@/components/ai/AiAssistantModal';
import {
  Home,
  Users,
  Building2,
  TrendingUp,
  FileText,
  Mail,
  Video,
  GitFork,
  Plug,
  Settings,
  LogOut,
  ChevronDown,
  Sparkles,
  SlidersHorizontal,
  Globe,
  UploadCloud,
} from 'lucide-react';

interface SidebarProps {
  workspaces: Workspace[];
  currentWorkspaceId?: string;
  userEmail?: string;
}

export function Sidebar({
  workspaces,
  currentWorkspaceId,
  userEmail,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [showAiModal, setShowAiModal] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSignOut = async () => {
    const supabase = createClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.push('/login');
    router.refresh();
  };

  const isCustomersActive =
    pathname.startsWith('/contacts') ||
    pathname.startsWith('/companies') ||
    pathname.startsWith('/deals') ||
    pathname.startsWith('/forms');

  return (
    <>
      <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col h-screen shrink-0 select-none">
        {/* Top Brand Logo */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <Link href="/dashboard" className="transition-opacity hover:opacity-90">
            <Logo size="md" />
          </Link>
        </div>

        {/* Workspace Switcher */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30">
          <WorkspaceSwitcher
            workspaces={workspaces}
            currentWorkspaceId={currentWorkspaceId}
          />
        </div>

        {/* AI Assistant Contextual Button */}
        <div className="px-3 pt-3">
          <button
            onClick={() => setShowAiModal(true)}
            className="flex items-center justify-center gap-2 w-full py-2 px-3 text-xs font-semibold rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white transition-all shadow-xs cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
            <span>AI Assistant</span>
          </button>
        </div>

        {/* Simplified Primary Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
          <nav className="space-y-1">
            {/* 1. Home */}
            <Link
              href="/dashboard"
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                pathname === '/dashboard'
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
              }`}
            >
              <Home className="w-4 h-4 text-slate-500" />
              <span>Home</span>
            </Link>

            {/* 2. Customers Section */}
            <div className="pt-2">
              <div className="px-3 py-1 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Customers</span>
              </div>
              <div className="space-y-0.5 mt-1 pl-1">
                <Link
                  href="/contacts"
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    pathname.startsWith('/contacts') && !pathname.includes('/import')
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Contacts</span>
                </Link>
                <Link
                  href="/companies"
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    pathname.startsWith('/companies')
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Companies</span>
                </Link>
                <Link
                  href="/deals"
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    pathname.startsWith('/deals')
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Deals</span>
                </Link>
                <Link
                  href="/forms"
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    pathname.startsWith('/forms')
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Lead Forms</span>
                </Link>
              </div>
            </div>

            {/* 3. Campaigns */}
            <Link
              href="/campaigns"
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                pathname.startsWith('/campaigns')
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
              }`}
            >
              <Mail className="w-4 h-4 text-slate-500" />
              <span>Campaigns</span>
            </Link>

            {/* 4. Shorts Studio (New Core Feature) */}
            <Link
              href="/shorts"
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                pathname.startsWith('/shorts')
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Video className="w-4 h-4 text-purple-500" />
                <span>Shorts Studio</span>
              </div>
              <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                New
              </span>
            </Link>

            {/* 5. Follow-ups (Automations) */}
            <Link
              href="/automations"
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                pathname.startsWith('/automations')
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
              }`}
            >
              <GitFork className="w-4 h-4 text-slate-500" />
              <span>Follow-ups</span>
            </Link>

            {/* 6. Settings */}
            <div className="pt-2">
              <div className="px-3 py-1 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Settings</span>
              </div>
              <div className="space-y-0.5 mt-1 pl-1">
                <Link
                  href="/integrations"
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    pathname.startsWith('/integrations')
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Plug className="w-3.5 h-3.5" />
                  <span>Connected Apps</span>
                </Link>
                <Link
                  href="/settings/workspace"
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    pathname.startsWith('/settings')
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Account &amp; Workspace</span>
                </Link>
              </div>
            </div>

            {/* More Options (Collapsible for advanced tools) */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
              >
                <span className="flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3 h-3" />
                  More Options
                </span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                />
              </button>

              {showAdvanced && (
                <div className="mt-1 space-y-1 pl-2 animate-in fade-in duration-100">
                  <Link
                    href="/contacts/import"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <UploadCloud className="w-3.5 h-3.5 text-slate-400" />
                    <span>Import Contacts (CSV)</span>
                  </Link>
                  <Link
                    href="/seo/analytics"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    <span>Search Analytics (GSC)</span>
                  </Link>
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* User Profile & Sign Out Footer */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                  {userEmail || 'Active User'}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  Connected
                </p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Contextual AI Assistant Modal */}
      <AiAssistantModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        workspaceId={currentWorkspaceId}
      />
    </>
  );
}
