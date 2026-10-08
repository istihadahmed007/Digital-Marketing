'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Logo } from '@/components/brand/Logo';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { Workspace } from '@/lib/types/crm';
import { createClient } from '@/lib/supabase/client';
import {
  LayoutDashboard,
  Users,
  Building2,
  TrendingUp,
  CheckSquare,
  FileText,
  Mail,
  GitFork,
  Sparkles,
  Plug,
  Settings,
  LogOut,
  UploadCloud,
  Globe,
  Target,
  FileSearch,
  BarChart3,
  MapPin,
  GitCompare,
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

  const handleSignOut = async () => {
    const supabase = createClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.push('/login');
    router.refresh();
  };

  const crmNavItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Contacts', href: '/contacts', icon: Users },
    { name: 'Companies', href: '/companies', icon: Building2 },
    { name: 'Deals & Pipeline', href: '/deals', icon: TrendingUp },
    { name: 'Tasks & Timeline', href: '/tasks', icon: CheckSquare },
  ];

  const seoNavItems = [
    { name: 'Website Audits', href: '/seo/audits', icon: Globe },
    { name: 'Keyword Tracking', href: '/seo/keywords', icon: Target },
    { name: 'On-Page & Briefs', href: '/seo/on-page', icon: FileSearch },
    { name: 'Search & Analytics', href: '/seo/analytics', icon: BarChart3 },
    { name: 'Local SEO (NAP)', href: '/seo/local', icon: MapPin },
    { name: 'Competitors & Links', href: '/seo/competitors', icon: GitCompare },
  ];

  const futureModules = [
    { name: 'Lead Forms', href: '/forms', icon: FileText, tag: 'Live' },
    { name: 'Email Campaigns', href: '/campaigns', icon: Mail, tag: 'Live' },
    { name: 'Automations', href: '/automations', icon: GitFork, tag: 'Live' },
    { name: 'AI Growth Hub', href: '/ai-tools', icon: Sparkles, tag: 'Live' },
    { name: 'Integrations', href: '/integrations', icon: Plug, tag: 'Live' },
  ];

  return (
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

      {/* Quick Action Button */}
      <div className="px-3 pt-3">
        <Link
          href="/contacts/import"
          className="flex items-center justify-center gap-2 w-full py-2 px-3 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white transition-all shadow-xs"
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Import Contacts (CSV)</span>
        </Link>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-6">
        {/* Core CRM Section */}
        <div>
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
            CRM Core
          </p>
          <nav className="space-y-1">
            {crmNavItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isActive
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Dedicated SEO Toolkit Section */}
        <div>
          <div className="flex items-center justify-between px-3 mb-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              SEO Toolkit
            </p>
            <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400">
              Pro
            </span>
          </div>
          <nav className="space-y-1">
            {seoNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isActive
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Marketing Expansion Modules (Future Phases Preview) */}
        <div>
          <div className="flex items-center justify-between px-3 mb-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Growth Engine
            </p>
            <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
              Live
            </span>
          </div>
          <nav className="space-y-1">
            {futureModules.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <span>{item.name}</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono">
                    {item.tag}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Settings Section */}
        <div>
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
            System
          </p>
          <nav className="space-y-1">
            <Link
              href="/settings/workspace"
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                pathname.startsWith('/settings')
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
              }`}
            >
              <Settings className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              <span>Workspace Settings</span>
            </Link>
          </nav>
        </div>
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
              <p className="text-[10px] text-slate-600 dark:text-slate-400 truncate">
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
  );
}
