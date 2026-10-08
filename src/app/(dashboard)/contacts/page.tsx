'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Contact, Company, LeadStatus, LifecycleStage, ContactView } from '@/lib/types/crm';
import {
  getContactsPaginated,
  archiveContact,
  exportContactsCsv,
  getContactViews,
  saveContactView,
} from '@/lib/actions/contacts';
import { getCompanies } from '@/lib/actions/companies';
import { ContactModal } from '@/components/crm/ContactModal';
import { StatusBadge } from '@/components/crm/StatusBadge';
import { EmptyState } from '@/components/crm/EmptyState';
import {
  Users,
  Search,
  Filter,
  Plus,
  UploadCloud,
  Download,
  Building2,
  Archive,
  RefreshCw,
  Loader2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Flame,
  Bookmark,
  Info,
} from 'lucide-react';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [savedViews, setSavedViews] = useState<ContactView[]>([]);
  const [workspaceId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('nexusmark_active_workspace') || 'ws-default'
      );
    }
    return 'ws-default';
  });
  const [loading, setLoading] = useState(true);

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [showArchived, setShowArchived] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [selectedScoreContact, setSelectedScoreContact] = useState<Contact | null>(null);
  const [exporting, setExporting] = useState(false);

  const fetchContacts = async (wsId: string) => {
    setLoading(true);
    try {
      const [res, companyList, viewsList] = await Promise.all([
        getContactsPaginated(wsId, {
          search,
          status: statusFilter,
          stage: stageFilter,
          source: sourceFilter,
          isArchived: showArchived,
          page,
          pageSize,
        }),
        getCompanies(wsId),
        getContactViews(wsId),
      ]);
      setContacts(res.contacts);
      setTotalCount(res.totalCount);
      setTotalPages(res.totalPages);
      setCompanies(companyList);
      setSavedViews(viewsList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts(workspaceId);
  }, [workspaceId, search, statusFilter, stageFilter, sourceFilter, showArchived, page]);

  const handleArchive = async (contact: Contact) => {
    if (!confirm(`Are you sure you want to ${contact.is_archived ? 'unarchive' : 'archive'} ${contact.first_name}?`)) {
      return;
    }
    await archiveContact(workspaceId, contact.id, !contact.is_archived);
    fetchContacts(workspaceId);
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const csvData = await exportContactsCsv(workspaceId, {
        search,
        status: statusFilter,
        stage: stageFilter,
        source: sourceFilter,
        isArchived: showArchived,
      });

      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `nexusmark_contacts_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      alert('Error exporting CSV');
    } finally {
      setExporting(false);
    }
  };

  const handleSaveCurrentView = async () => {
    const viewName = prompt('Enter a name for this saved contact filter view:');
    if (!viewName?.trim()) return;

    await saveContactView(workspaceId, viewName.trim(), {
      status: statusFilter,
      stage: stageFilter,
      source: sourceFilter,
      showArchived,
    });
    const updatedViews = await getContactViews(workspaceId);
    setSavedViews(updatedViews);
  };

  const handleApplyView = (view: ContactView) => {
    if (view.filters?.status) setStatusFilter(view.filters.status);
    if (view.filters?.stage) setStageFilter(view.filters.stage);
    if (view.filters?.source) setSourceFilter(view.filters.source);
    if (view.filters?.showArchived !== undefined) setShowArchived(view.filters.showArchived);
    setPage(1);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Contacts Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage prospects, track rule-based lead scores, marketing consent, and attribution sources.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCsv}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            title="Export matching contacts to CSV"
          >
            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Export CSV
          </button>

          <Link
            href="/contacts/import"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            Import CSV
          </Link>

          <button
            onClick={() => {
              setEditingContact(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            New Contact
          </button>
        </div>
      </div>

      {/* Saved Views Bar */}
      {savedViews.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 font-semibold flex items-center gap-1 shrink-0">
            <Bookmark className="w-3 h-3 text-indigo-500" /> Saved Views:
          </span>
          {savedViews.map((v) => (
            <button
              key={v.id}
              onClick={() => handleApplyView(v)}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 text-slate-700 dark:text-slate-300 text-xs font-medium shrink-0 transition"
            >
              {v.name}
            </button>
          ))}
          <button
            onClick={handleSaveCurrentView}
            className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline shrink-0"
          >
            + Save Current
          </button>
        </div>
      )}

      {/* Filter & Search Controls */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, email, or phone..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
            >
              <option value="all">All Lead Statuses</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="unqualified">Unqualified</option>
              <option value="customer">Customer</option>
            </select>
          </div>

          <div>
            <select
              value={stageFilter}
              onChange={(e) => {
                setStageFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
            >
              <option value="all">All Lifecycle Stages</option>
              <option value="subscriber">Subscriber</option>
              <option value="lead">Lead</option>
              <option value="mql">MQL</option>
              <option value="sql">SQL</option>
              <option value="opportunity">Opportunity</option>
              <option value="customer">Customer</option>
            </select>
          </div>

          <div>
            <select
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
            >
              <option value="all">All Sources</option>
              <option value="organic_search">Organic Search (SEO)</option>
              <option value="form_submission">Form Ingestion</option>
              <option value="website">Direct Website</option>
              <option value="referral">Referral</option>
              <option value="csv_import">CSV Import</option>
              <option value="cold_outreach">Outreach</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => {
                setShowArchived(e.target.checked);
                setPage(1);
              }}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span>Show Archived Contacts</span>
          </label>

          <span>Showing {contacts.length} of {totalCount} records</span>
        </div>
      </div>

      {/* Contacts Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
          <p className="text-xs text-slate-500">Loading contacts...</p>
        </div>
      ) : contacts.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No contacts found"
          description={search ? 'No contacts match your active search and filter criteria.' : 'Start expanding your workspace pipeline by creating your first contact.'}
          actionLabel="Create Contact"
          onAction={() => {
            setEditingContact(null);
            setIsModalOpen(true);
          }}
        />
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="p-3.5">Name / Contact</th>
                  <th className="p-3.5">Company</th>
                  <th className="p-3.5">Lead Score</th>
                  <th className="p-3.5">Lifecycle Stage</th>
                  <th className="p-3.5">Lead Status</th>
                  <th className="p-3.5">Source / UTM</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {contacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                    <td className="p-3.5">
                      <Link
                        href={`/contacts/${contact.id}`}
                        className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 flex items-center gap-1.5"
                      >
                        {contact.first_name} {contact.last_name}
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </Link>
                      <span className="text-[11px] text-slate-400 block font-mono">{contact.email}</span>
                      {contact.job_title && (
                        <span className="text-[11px] text-slate-500">{contact.job_title}</span>
                      )}
                    </td>

                    <td className="p-3.5">
                      {contact.company ? (
                        <Link
                          href={`/companies/${contact.company.id}`}
                          className="font-semibold text-slate-700 dark:text-slate-300 hover:underline flex items-center gap-1"
                        >
                          <Building2 className="w-3 h-3 text-slate-400" />
                          {contact.company.name}
                        </Link>
                      ) : (
                        <span className="text-slate-400 italic">—</span>
                      )}
                    </td>

                    <td className="p-3.5">
                      <button
                        onClick={() => setSelectedScoreContact(contact)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-[11px] transition cursor-pointer ${
                          (contact.lead_score || 0) >= 60
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : (contact.lead_score || 0) >= 30
                            ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400'
                            : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                        title="Click to view transparent lead scoring breakdown"
                      >
                        <Flame className="w-3 h-3 text-amber-500" />
                        {contact.lead_score || 0} pts
                      </button>
                    </td>

                    <td className="p-3.5 uppercase font-semibold text-[10px] tracking-wider text-slate-600 dark:text-slate-400">
                      {contact.lifecycle_stage}
                    </td>

                    <td className="p-3.5">
                      <StatusBadge status={contact.lead_status} />
                    </td>

                    <td className="p-3.5">
                      <span className="capitalize text-slate-700 dark:text-slate-300 font-medium block">
                        {(contact.source || 'direct').replace('_', ' ')}
                      </span>
                      {contact.utm_source && (
                        <span className="text-[10px] font-mono text-indigo-500 block">
                          utm: {contact.utm_source}
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 text-right space-x-2">
                      <button
                        onClick={() => {
                          setEditingContact(contact);
                          setIsModalOpen(true);
                        }}
                        className="text-indigo-600 hover:underline font-semibold"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleArchive(contact)}
                        className="text-slate-400 hover:text-red-500"
                        title={contact.is_archived ? 'Restore' : 'Archive'}
                      >
                        <Archive className="w-3.5 h-3.5 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lead Score Reason Inspection Modal */}
      {selectedScoreContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Lead Score Breakdown: {selectedScoreContact.first_name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedScoreContact(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="text-center py-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                {selectedScoreContact.lead_score || 0}
              </span>
              <span className="text-xs text-slate-400 block">Total Score / 100</span>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Rule-Based Point Contributors:
              </span>
              {Array.isArray(selectedScoreContact.lead_score_reasons) &&
              selectedScoreContact.lead_score_reasons.length > 0 ? (
                <div className="space-y-1.5">
                  {selectedScoreContact.lead_score_reasons.map((r, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl flex items-center justify-between text-xs"
                    >
                      <span className="text-slate-700 dark:text-slate-300">{r.reason}</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">+{r.points}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No specific scoring rules triggered yet.</p>
              )}
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedScoreContact(null)}
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      <ContactModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingContact(null);
        }}
        workspaceId={workspaceId}
        initialContact={editingContact}
        companies={companies}
        onSuccess={() => fetchContacts(workspaceId)}
      />
    </div>
  );
}
