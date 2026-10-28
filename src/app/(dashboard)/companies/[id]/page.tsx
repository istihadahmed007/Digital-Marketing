import React from 'react';
import { cookies } from 'next/headers';
import { getCompanyById } from '@/lib/actions/companies';
import { getActivities } from '@/lib/actions/activities';
import { getUserWorkspaces } from '@/lib/actions/workspaces';
import { notFound } from 'next/navigation';
import { CompanyDetailClient } from '@/components/crm/CompanyDetailClient';

export default async function CompanyDetailPage({
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

  const [companyData, activities] = await Promise.all([
    getCompanyById(activeWsId, id),
    getActivities(activeWsId, { company_id: id }),
  ]);

  if (!companyData.company) notFound();

  return (
    <CompanyDetailClient
      company={companyData.company}
      contacts={companyData.contacts}
      deals={companyData.deals}
      activities={activities}
      workspaceId={activeWsId}
    />
  );
}
