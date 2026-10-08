import React from 'react';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { getContacts } from '@/lib/actions/contacts';
import { getUserWorkspaces } from '@/lib/actions/workspaces';
import { CsvImportWizard } from '@/components/crm/CsvImportWizard';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';

export default async function ContactImportPage() {
  const cookieStore = await cookies();
  const workspaces = await getUserWorkspaces();
  const activeWsId =
    cookieStore.get('nexusmark_active_workspace')?.value || workspaces[0]?.id;

  if (!activeWsId) notFound();

  // Fetch existing contact emails in workspace for duplicate handling
  const existingContacts = await getContacts(activeWsId);
  const existingEmails = existingContacts.map((c) => c.email);

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <Link
            href="/contacts"
            className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors mb-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Contacts</span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            CSV Contact Import
          </h1>
        </div>
      </div>

      {/* Import Wizard */}
      <CsvImportWizard
        workspaceId={activeWsId}
        existingEmails={existingEmails}
      />
    </div>
  );
}
