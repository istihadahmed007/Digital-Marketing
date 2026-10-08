import React from 'react';
import { cookies } from 'next/headers';
import { Sidebar } from '@/components/layout/Sidebar';
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
        name: 'Default Workspace (Config Needed)',
        slug: 'default',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ];
  }

  const cookieStore = await cookies();
  const activeWsId =
    cookieStore.get('nexusmark_active_workspace')?.value || workspaces[0]?.id;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      {/* Left Navigation Sidebar */}
      <Sidebar
        workspaces={workspaces}
        currentWorkspaceId={activeWsId}
        userEmail={userEmail}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Supabase Missing Configuration Notice Banner */}
        <SupabaseConfigBanner isConfigured={isConfigured} />

        {/* Page Viewport */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
