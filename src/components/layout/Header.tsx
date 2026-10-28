'use client';

import React, { useState } from 'react';
import { Search, Bell, ChevronDown, User, Sparkles, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface HeaderProps {
  userEmail?: string;
  workspaceName?: string;
}

export function Header({ userEmail = 'demo@nexusmark.local', workspaceName = 'GrowthPilot Workspace' }: HeaderProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const getInitials = (email: string) => {
    if (!email) return 'IA';
    const parts = email.split('@')[0].split(/[._-]/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.push('/login');
    router.refresh();
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/contacts?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="w-full flex items-center justify-between gap-4 px-6 py-3.5 select-none z-20">
      {/* Search Input Bar (As seen in design reference) */}
      <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 w-4 h-4 text-[#526D7D]/70 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your workspace"
            className="w-full pl-10 pr-4 py-2 text-xs rounded-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-[#75D2EE]/40 dark:border-sky-800 text-[#17364A] dark:text-white placeholder-[#526D7D]/60 focus:outline-hidden focus:ring-2 focus:ring-[#167AA0]/40 focus:border-[#75D2EE] shadow-xs transition-all"
          />
        </div>
      </form>

      {/* Right Controls: Notifications & User Avatar Dropdown */}
      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="p-2 rounded-full text-[#526D7D] dark:text-slate-300 hover:text-[#17364A] hover:bg-white/60 dark:hover:bg-slate-800 transition-all cursor-pointer relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#167AA0] ring-2 ring-white dark:ring-slate-900" />
          </button>

          {notificationsOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setNotificationsOpen(false)} />
              <div className="absolute right-0 mt-2 w-72 glass-panel-opaque p-3 rounded-2xl shadow-xl z-40 animate-in fade-in zoom-in-95 duration-140">
                <div className="text-xs font-bold text-[#17364A] dark:text-white pb-2 border-b border-[#75D2EE]/20">
                  Notifications
                </div>
                <div className="py-2 space-y-2 text-xs text-[#526D7D] dark:text-slate-300">
                  <div className="p-2 rounded-xl bg-[#D7F1FA]/30 dark:bg-slate-800/40">
                    <p className="font-semibold text-[#17364A] dark:text-white">Shorts Studio ready</p>
                    <p className="text-[11px] text-[#526D7D] dark:text-slate-400 mt-0.5">High-retention viral moment detection active.</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Profile Avatar with dropdown */}
        <div className="relative">
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-1.5 p-1 pr-2 rounded-full hover:bg-white/50 dark:hover:bg-slate-800 transition-all cursor-pointer group"
          >
            {/* Ice-blue Avatar Circle matching IA in reference */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#167AA0] via-[#43B8DE] to-[#75D2EE] flex items-center justify-center text-white text-xs font-bold shadow-xs">
              {getInitials(userEmail)}
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#526D7D] group-hover:text-[#17364A] dark:text-slate-400 transition-transform duration-140" />
          </button>

          {profileDropdownOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setProfileDropdownOpen(false)} />
              <div className="absolute right-0 mt-2 w-56 glass-panel-opaque p-2 rounded-2xl shadow-2xl z-40 animate-in fade-in zoom-in-95 duration-140 border border-[#75D2EE]/40">
                <div className="px-3 py-2 border-b border-[#75D2EE]/20 mb-1">
                  <p className="text-xs font-bold text-[#17364A] dark:text-white truncate">{userEmail}</p>
                  <p className="text-[10px] text-[#526D7D] dark:text-slate-400 truncate">{workspaceName}</p>
                </div>
                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    router.push('/settings/workspace');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#526D7D] hover:text-[#17364A] dark:text-slate-300 dark:hover:text-white hover:bg-[#D7F1FA]/40 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-[#167AA0]" />
                  <span>Workspace Settings</span>
                </button>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
