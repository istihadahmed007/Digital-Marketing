import React from 'react';
import { cookies } from 'next/headers';
import { getUserWorkspaces, getWorkspaceMembers } from '@/lib/actions/workspaces';
import { notFound } from 'next/navigation';
import { WorkspaceSettingsClient } from '@/components/settings/WorkspaceSettingsClient';

export default async function WorkspaceSettingsPage() {
  const cookieStore = await cookies();
  const workspaces = await getUserWorkspaces();
  const activeWsId =
    cookieStore.get('nexusmark_active_workspace')?.value || workspaces[0]?.id;

  if (!activeWsId) notFound();

  const currentWorkspace = workspaces.find((w) => w.id === activeWsId) || workspaces[0];
  const members = await getWorkspaceMembers(activeWsId);

  return (
    <WorkspaceSettingsClient
      currentWorkspace={currentWorkspace}
      members={members}
    />
  );
}

