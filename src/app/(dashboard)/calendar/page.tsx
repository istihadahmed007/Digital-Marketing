import React from 'react';
import { cookies } from 'next/headers';
import { getUserWorkspaces } from '@/lib/actions/workspaces';
import { getSocialPosts } from '@/lib/actions/content-studio';
import { MarketingCalendarClient } from '@/components/calendar/MarketingCalendarClient';
import { EmptyState } from '@/components/crm/EmptyState';

export default async function CalendarPage() {
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
          description="Create your first workspace to manage marketing campaigns and content schedules."
          actionLabel="Create Workspace"
          actionHref="/workspaces/new"
        />
      </div>
    );
  }

  const posts = await getSocialPosts(activeWsId);

  return (
    <MarketingCalendarClient
      initialPosts={posts}
      workspaceId={activeWsId}
    />
  );
}
