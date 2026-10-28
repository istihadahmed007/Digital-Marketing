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
  Megaphone,
  Video,
  Share2,
  Search,
  Users,
  Zap,
  BarChart2,
  Plug,
  Settings,
  Menu,
  X,
  Sparkles,
  LogOut,
  Calendar,
  FileText,
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

  // GrowthPilot AI Navigation Architecture (13 canonical destinations)
  const mainNavItems = [
    {
      label: 'Overview',
      href: '/dashboard',
      icon: Home,
      active: pathname === '/dashboard',
    },
    {
      label: 'AI Content Studio',
      href: '/ai-studio',
      icon: Sparkles,
      active: pathname.startsWith('/ai-studio') || pathname.startsWith('/ai-tools'),
    },
    {
      label: 'Campaigns',
      href: '/campaigns',
      icon: Megaphone,
      active: pathname.startsWith('/campaigns'),
    },
    {
      label: 'Content Calendar',
      href: '/calendar',
      icon: Calendar,
      active: pathname.startsWith('/calendar'),
    },
    {
      label: 'Social Accounts',
      href: '/social-accounts',
      icon: Share2,
      active: pathname.startsWith('/social-accounts') || pathname.startsWith('/social-marketing'),
    },
    {
      label: 'SEO & Intelligence',
      href: '/seo',
      icon: Search,
      active: pathname.startsWith('/seo'),
    },
    {
      label: 'CRM & Leads',
      href: '/contacts',
      icon: Users,
      active:
        pathname.startsWith('/contacts') ||
        pathname.startsWith('/deals') ||
        pathname.startsWith('/companies') ||
        pathname.startsWith('/forms') ||
        pathname.startsWith('/tasks'),
    },
    {
      label: 'Video Studio',
      href: '/shorts',
      icon: Video,
      active: pathname.startsWith('/shorts'),
    },
    {
      label: 'Automations',
      href: '/automations',
      icon: Zap,
      active: pathname.startsWith('/automations'),
    },
    {
      label: 'Analytics',
      href: '/analytics',
      icon: BarChart2,
      active: pathname === '/analytics',
    },
  ];

  const bottomNavItems = [
    {
      label: 'Integrations',
      href: '/integrations',
      icon: Plug,
      active: pathname.startsWith('/integrations'),
    },
    {
      label: 'Reports',
      href: '/reports',
      icon: FileText,
      active: pathname.startsWith('/reports'),
    },
    {
      label: 'Settings',
      href: '/settings/workspace',
      icon: Settings,
      active: pathname.startsWith('/settings'),
    },
  ];

  const renderNavContent = () => (
    <div className="flex flex-col h-full justify-between p-4">
      <div>
        {/* Top Brand Logo ("Digi" with 3D faceted cube) */}
        <div className="px-3 pt-2 pb-5 flex items-center justify-between">
          <Link
            href="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className="transition-opacity hover:opacity-90 flex items-center gap-2"
          >
            <Logo size="md" />
          </Link>
          {/* Mobile close button */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-[#526D7D] hover:text-[#17364A] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workspace Switcher Drawer */}
        <div className="mb-4">
          <WorkspaceSwitcher
            workspaces={workspaces}
            currentWorkspaceId={currentWorkspaceId}
          />
        </div>

        {/* Main Navigation Items */}
        <nav className="space-y-1 overflow-y-auto max-h-[calc(100vh-290px)] pr-1">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.active;

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all duration-160 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-[#75D2EE]/45 via-[#75D2EE]/30 to-[#167AA0]/20 text-[#17364A] font-bold border border-[#75D2EE]/80 shadow-[0_4px_16px_rgba(117,210,238,0.3),inset_0_1px_1px_rgba(255,255,255,0.85)]'
                    : 'text-[#526D7D] dark:text-slate-300 hover:text-[#17364A] dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div
                  className={`p-1.5 rounded-xl flex items-center justify-center transition-colors ${
                    isActive
                      ? 'bg-white/85 text-[#167AA0] shadow-2xs'
                      : 'text-[#526D7D] group-hover:text-[#167AA0] dark:text-slate-400 dark:group-hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Integrations & Settings */}
      <div className="pt-4 border-t border-[#75D2EE]/25 space-y-1">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.active;

          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all duration-160 cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-[#75D2EE]/45 via-[#75D2EE]/30 to-[#167AA0]/20 text-[#17364A] font-bold border border-[#75D2EE]/80 shadow-xs'
                  : 'text-[#526D7D] dark:text-slate-300 hover:text-[#17364A] dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/40'
              }`}
            >
              <div
                className={`p-1.5 rounded-xl flex items-center justify-center transition-colors ${
                  isActive
                    ? 'bg-white/85 text-[#167AA0] shadow-2xs'
                    : 'text-[#526D7D] group-hover:text-[#167AA0] dark:text-slate-400 dark:group-hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}

        {/* AI Assistant Contextual Button */}
        <button
          onClick={() => {
            setShowAiModal(true);
            setMobileMenuOpen(false);
          }}
          className="mt-2 flex items-center justify-center gap-2 w-full py-2 px-3 text-xs font-bold rounded-2xl bg-[#167AA0] hover:bg-[#0E526E] text-white shadow-xs glass-button-press transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#75D2EE]" />
          <span>AI Growth Hub</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Header Bar (< md) */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white/70 backdrop-blur-xl border-b border-[#75D2EE]/35 w-full shrink-0">
        <Link href="/dashboard">
          <Logo size="sm" />
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAiModal(true)}
            className="p-1.5 rounded-xl bg-[#D7F1FA] text-[#167AA0] cursor-pointer"
            title="AI Assistant"
          >
            <Sparkles className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 rounded-xl bg-white/90 border border-[#75D2EE]/40 text-[#17364A] cursor-pointer"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Desktop Persistent Floating Sidebar (md and up) */}
      <aside className="hidden md:flex md:w-60 flex-col h-full shrink-0 select-none p-3 pl-4">
        <div className="w-full h-full rounded-[26px] bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/80 dark:border-sky-800/80 shadow-[0_10px_35px_rgba(117,210,238,0.15)] overflow-hidden flex flex-col justify-between">
          {renderNavContent()}
        </div>
      </aside>

      {/* Mobile Slide-Over Drawer Modal */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl h-full flex flex-col z-10 shadow-2xl p-2 animate-in slide-in-from-left duration-200">
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
