import React from 'react';
import { cookies } from 'next/headers';
import { getDealById, getDealStageHistory } from '@/lib/actions/deals';
import { getActivities } from '@/lib/actions/activities';
import { getUserWorkspaces } from '@/lib/actions/workspaces';
import { notFound } from 'next/navigation';
import { DealDetailClient } from '@/components/crm/DealDetailClient';

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const workspaces = await getUserWorkspaces();
  const activeWsId =
    cookieStore.get('nexusmark_active_workspace')?.value || workspaces[0]?.id;

  if (!activeWsId) notFound();

  const [deal, activities, stageHistory] = await Promise.all([
    getDealById(activeWsId, id),
    getActivities(activeWsId, { deal_id: id }),
    getDealStageHistory(activeWsId, id),
  ]);

  if (!deal) notFound();

  return (
    <DealDetailClient
      deal={deal}
      activities={activities}
      stageHistory={stageHistory}
      workspaceId={activeWsId}
    />
  );
}
