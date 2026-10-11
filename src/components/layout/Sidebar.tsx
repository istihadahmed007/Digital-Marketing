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
  Compass,
  Globe,
  UploadCloud,
  Menu,
  X,
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    const supabase = createClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.push('/login');
    router.refresh();
  };

  const navLinks = [
    {
      group: 'Overview',
      items: [
        {
          label: 'Overview',
          href: '/dashboard',
          icon: Home,
          active: pathname === '/dashboard',
        },
      ],
    },
    {
      group: 'Campaigns & Journey',
      items: [
        {
          label: 'Campaign Journey',
          href: '/campaigns/journey',
          icon: Compass,
          active: pathname.startsWith('/campaigns/journey'),
        },
        {
          label: 'Email Campaigns',
          href: '/campaigns',
          icon: Mail,
          active: pathname === '/campaigns',
        },
      ],
    },
    {
      group: 'Content Studio',
      items: [
        {
          label: 'Video Studio',
          href: '/shorts',
          icon: Video,
          active: pathname.startsWith('/shorts'),
          badge: 'Shorts',
        },
        {
          label: 'SEO Analytics',
          href: '/seo/analytics',
          icon: Globe,
          active: pathname.startsWith('/seo'),
        },
      ],
    },
    {
      group: 'Leads & CRM',
      items: [
        {
          label: 'Contacts',
          href: '/contacts',
          icon: Users,
          active: pathname.startsWith('/contacts'),
        },
        {
          label: 'Companies',
          href: '/companies',
          icon: Building2,
          active: pathname.startsWith('/companies'),
        },
        {
          label: 'Deals & Pipeline',
          href: '/deals',
          icon: TrendingUp,
          active: pathname.startsWith('/deals'),
        },
        {
          label: 'Inbound Forms',
          href: '/forms',
          icon: FileText,
          active: pathname.startsWith('/forms'),
        },
      ],
    },
    {
      group: 'Automations',
      items: [
        {
          label: 'Workflows & Follow-ups',
          href: '/automations',
          icon: GitFork,
          active: pathname.startsWith('/automations'),
        },
      ],
    },
    {
      group: 'System & Apps',
      items: [
        {
          label: 'Connected Apps',
          href: '/integrations',
          icon: Plug,
          active: pathname.startsWith('/integrations'),
        },
        {
          label: 'Workspace Settings',
          href: '/settings/workspace',
          icon: Settings,
          active: pathname.startsWith('/settings'),
        },
      ],
    },
  ];

  const renderNavContent = () => (
    <>
      {/* Top Brand Logo */}
      <div className="p-4 md:p-5 border-b border-[#75D2EE]/30 dark:border-sky-900/60 flex items-center justify-between">
        <Link
          href="/dashboard"
          onClick={() => setMobileMenuOpen(false)}
          className="transition-opacity hover:opacity-90"
        >
          <Logo size="md" />
        </Link>
        {/* Mobile close button */}
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Workspace Switcher */}
      <div className="p-3 border-b border-[#75D2EE]/25 dark:border-sky-900/60 bg-[#D7F1FA]/20 dark:bg-slate-900/40">
        <WorkspaceSwitcher
          workspaces={workspaces}
          currentWorkspaceId={currentWorkspaceId}
        />
      </div>

      {/* AI Assistant Contextual Button */}
      <div className="px-3 pt-3">
        <button
          onClick={() => {
            setShowAiModal(true);
            setMobileMenuOpen(false);
          }}
          className="flex items-center justify-center gap-2 w-full py-2 px-3 text-xs font-bold rounded-xl bg-[#167AA0] hover:bg-[#126383] text-white transition-all shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-[#75D2EE]"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#75D2EE]" />
          <span>AI Assistant</span>
        </button>
      </div>

      {/* Grouped Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {navLinks.map((group) => (
          <div key={group.group} className="space-y-1">
            <div className="px-2.5 py-1 text-[10px] font-bold text-[#526D7D] dark:text-slate-400 uppercase tracking-wider">
              {group.group}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-all duration-140 ${
                      item.active
                        ? 'bg-[#167AA0] text-white shadow-xs font-bold'
                        : 'text-[#526D7D] dark:text-slate-300 hover:text-[#17364A] dark:hover:text-white hover:bg-[#D7F1FA]/40 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          item.active ? 'text-white' : 'text-[#167AA0] dark:text-sky-400'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold ${
                          item.active
                            ? 'bg-white/20 text-white'
                            : 'bg-[#D7F1FA] text-[#167AA0] dark:bg-sky-950 dark:text-sky-300'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* User Profile & Sign Out Footer */}
      <div className="p-3 border-t border-sky-100 dark:border-sky-900/60 bg-sky-50/40 dark:bg-slate-900/40">
        <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-sky-200/70 dark:border-sky-800">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
              {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
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
    </>
  );

  return (
    <>
      {/* Mobile Top Header Bar (< md) */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 glass-header w-full shrink-0 border-b border-[#75D2EE]/35">
        <Link href="/dashboard">
          <Logo size="sm" />
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAiModal(true)}
            className="p-1.5 rounded-lg bg-[#D7F1FA] dark:bg-sky-950 text-[#167AA0] dark:text-sky-300 cursor-pointer"
            title="AI Assistant"
          >
            <Sparkles className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 rounded-lg bg-white/90 dark:bg-slate-800 border border-[#75D2EE]/40 dark:border-sky-700 text-[#17364A] dark:text-slate-200 cursor-pointer"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Desktop Persistent Sidebar (md and up) */}
      <aside className="hidden md:flex md:w-64 glass-sidebar flex-col h-screen shrink-0 select-none border-r border-[#75D2EE]/35">
        {renderNavContent()}
      </aside>

      {/* Mobile Slide-Over Drawer Modal */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] glass-sidebar bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl h-full flex flex-col z-10 shadow-2xl animate-in slide-in-from-left duration-200">
            {renderNavContent()}
          </div>
        </div>
      )}

      {/* Contextual AI Assistant Modal */}
      <AiAssistantModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        workspaceId={currentWorkspaceId}
      />
    </>
  );
}
