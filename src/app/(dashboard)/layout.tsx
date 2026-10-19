import React from 'react';
import { cookies } from 'next/headers';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { SupabaseConfigBanner } from '@/components/config/SupabaseConfigBanner';
import { getSupabaseEnv } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';
import { getUserWorkspaces } from '@/lib/actions/workspaces';
import { LiquidBackground } from '@/components/layout/LiquidBackground';
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
      {/* Exact Fluid Liquid Silk Ribbon 3D Background Layer */}
      <LiquidBackground showSwitcher={true} />

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
