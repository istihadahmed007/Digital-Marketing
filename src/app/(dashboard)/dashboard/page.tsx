import React from 'react';
import { cookies } from 'next/headers';
import { getUserWorkspaces } from '@/lib/actions/workspaces';
import { getMarketingDashboardMetrics } from '@/lib/actions/dashboard';
import { MarketingDashboardClient } from '@/components/dashboard/MarketingDashboardClient';
import { EmptyState } from '@/components/crm/EmptyState';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const workspaces = await getUserWorkspaces();
  const activeWsId =
    cookieStore.get('nexusmark_active_workspace')?.value || workspaces[0]?.id;

  if (!activeWsId) {
    return (
      <div className="py-12">
        <EmptyState
          iconName="building"
          title="No Active Workspace Selected"
          description="Create your first workspace to begin managing customers, campaigns, and Shorts."
          actionLabel="Create Workspace"
          actionHref="/workspaces/new"
        />
      </div>
    );
  }

  const dashboardData = await getMarketingDashboardMetrics(activeWsId, '30d', 'all');

  return (
    <MarketingDashboardClient
      initialData={dashboardData}
      workspaceId={activeWsId}
    />
  );
}
