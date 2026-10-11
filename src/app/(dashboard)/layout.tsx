import React from 'react';
import { cookies } from 'next/headers';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { SupabaseConfigBanner } from '@/components/config/SupabaseConfigBanner';
import { getSupabaseEnv } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';
import { getUserWorkspaces } from '@/lib/actions/workspaces';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isConfigured } = getSupabaseEnv();
  const supabase = await createClient();

  let userEmail = 'demo@nexusmark.local';
  let workspaces = [];

  if (isConfigured && supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect('/login');
    }

    userEmail = user.email || '';
    workspaces = await getUserWorkspaces();

    if (workspaces.length === 0) {
      // Need onboarding workspace creation
      redirect('/workspaces/new');
    }
  } else {
    // Graceful unconfigured development state
    workspaces = [
      {
        id: 'ws-default',
        name: 'Default Workspace',
        slug: 'default',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ];
  }

  const cookieStore = await cookies();
  const activeWsId =
    cookieStore.get('nexusmark_active_workspace')?.value || workspaces[0]?.id;
  const currentWorkspace = workspaces.find((w) => w.id === activeWsId) || workspaces[0];

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden text-[#17364A] dark:text-slate-100 font-sans relative bg-gradient-to-br from-[#EDF9FD] via-[#F8FDFF] to-[#D7F1FA] dark:from-[#081721] dark:via-[#0D2231] dark:to-[#081721]">
      {/* Soft flowing liquid ribbons background layer (reproducing the waves in the reference design) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
        <svg
          viewBox="0 0 1440 900"
          className="w-full h-full object-cover opacity-60 dark:opacity-25"
          fill="none"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="liquid-ribbon-1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#75D2EE" stopOpacity="0.45" />
              <stop offset="50%" stopColor="#A8EBFC" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#167AA0" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="liquid-ribbon-2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#75D2EE" stopOpacity="0.5" />
              <stop offset="60%" stopColor="#D7F1FA" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#F8FDFF" stopOpacity="0" />
            </linearGradient>
            <filter id="soft-blur" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="35" />
            </filter>
          </defs>

          {/* Sweeping top-to-bottom right wave */}
          <path
            d="M850 -50 C 1100 200, 1350 450, 1480 950 L 1480 -50 Z"
            fill="url(#liquid-ribbon-1)"
            filter="url(#soft-blur)"
          />

          {/* Flowing ribbon behind center and bottom */}
          <path
            d="M -100 450 C 350 300, 650 750, 1200 600 C 1350 550, 1450 700, 1500 850 L -100 950 Z"
            fill="url(#liquid-ribbon-2)"
            filter="url(#soft-blur)"
          />

          {/* Soft ambient highlights */}
          <circle cx="1150" cy="180" r="280" fill="#75D2EE" fillOpacity="0.18" filter="url(#soft-blur)" />
          <circle cx="200" cy="750" r="320" fill="#A8EBFC" fillOpacity="0.25" filter="url(#soft-blur)" />
        </svg>
      </div>

      {/* Navigation (Mobile Header + Desktop Floating Sidebar) */}
      <Sidebar
        workspaces={workspaces}
        currentWorkspaceId={activeWsId}
        userEmail={userEmail}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        {/* Top Header matching reference (Search, Notifications, Profile) */}
        <Header userEmail={userEmail} workspaceName={currentWorkspace?.name} />

        {/* Supabase Missing Configuration Notice Banner */}
        <SupabaseConfigBanner isConfigured={isConfigured} />

        {/* Page Viewport */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 pb-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
