import React from 'react';
import { cookies } from 'next/headers';
import { getContactById } from '@/lib/actions/contacts';
import { getActivities } from '@/lib/actions/activities';
import { getTasks } from '@/lib/actions/tasks';
import { getUserWorkspaces } from '@/lib/actions/workspaces';
import { notFound } from 'next/navigation';
import { ContactDetailClient } from '@/components/crm/ContactDetailClient';

export default async function ContactDetailPage({
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

  const [contact, activities, tasks] = await Promise.all([
    getContactById(activeWsId, id),
    getActivities(activeWsId, { contact_id: id }),
    getTasks(activeWsId, { contact_id: id }),
  ]);

  if (!contact) notFound();

  return (
    <ContactDetailClient
      contact={contact}
      activities={activities}
      tasks={tasks}
      workspaceId={activeWsId}
    />
  );
}
