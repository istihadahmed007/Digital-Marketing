'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Company } from '@/lib/types/crm';
import { getCompanies, archiveCompany } from '@/lib/actions/companies';
import { CompanyModal } from '@/components/crm/CompanyModal';
import { EmptyState } from '@/components/crm/EmptyState';
import {
  Building2,
  Search,
  Plus,
  Globe,
  MapPin,
  Archive,
  Loader2,
  ExternalLink,
} from 'lucide-react';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [workspaceId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('nexusmark_active_workspace') || 'ws-default'
      );
    }
    return 'ws-default';
  });
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [industryFilter, setIndustryFilter] = useState('all');
  const [showArchived, setShowArchived] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  const fetchCompanies = async (wsId: string) => {
    setLoading(true);
    try {
      const list = await getCompanies(wsId, {
        search,
        industry: industryFilter,
        isArchived: showArchived,
      });
      setCompanies(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies(workspaceId);
  }, [workspaceId, search, industryFilter, showArchived]);

  const handleArchive = async (company: Company) => {
    if (
      !confirm(
        `Are you sure you want to ${
          company.is_archived ? 'unarchive' : 'archive'
        } ${company.name}?`
      )
    ) {
      return;
    }

    await archiveCompany(workspaceId, company.id, !company.is_archived);
    fetchCompanies(workspaceId);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#D7F1FA] dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#17364A] dark:text-white">
            Companies & Organizations
          </h1>
          <p className="text-xs text-[#526D7D] dark:text-slate-400 mt-1">
            Track business accounts, domains, industries, and associated contacts.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingCompany(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-[#167AA0] hover:bg-[#126484] text-white shadow-xs transition-all glass-button-press cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Company</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl border border-[#75D2EE]/30 glass-panel flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#526D7D] absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company name, domain, city..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[#75D2EE]/30 bg-white/90 dark:bg-slate-800 text-[#17364A] dark:text-white placeholder-[#526D7D]/60 focus:outline-none focus:ring-2 focus:ring-[#167AA0]"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
              showArchived
                ? 'bg-[#D7F1FA] dark:bg-amber-950/50 border-[#167AA0] text-[#167AA0] dark:text-amber-300'
                : 'border-[#75D2EE]/30 bg-white/80 text-[#526D7D] hover:bg-[#D7F1FA]/50'
            }`}
          >
            {showArchived ? 'Viewing Archived' : 'Show Archived'}
          </button>
        </div>
      </div>

      {/* Data Table */}
      {loading ? (
        <div className="p-12 flex justify-center text-[#167AA0]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : companies.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={showArchived ? 'No Archived Companies' : 'No Companies Found'}
          description={
            showArchived
              ? 'There are no archived companies in this workspace.'
              : search
              ? 'No companies matched your search.'
              : 'Add organizations and key business accounts to link with your deals and contacts.'
          }
          actionLabel={showArchived ? undefined : 'Add First Company'}
          onAction={showArchived ? undefined : () => setIsModalOpen(true)}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#75D2EE]/30 glass-panel-opaque shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#EDF9FD]/80 dark:bg-slate-800/80 border-b border-[#D7F1FA] dark:border-slate-800 text-[#17364A] dark:text-slate-300 font-semibold">
                <tr>
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4">Industry</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Tags</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D7F1FA]/50 dark:divide-slate-800">
                {companies.map((company) => (
                  <tr
                    key={company.id}
                    className="hover:bg-[#F8FDFF]/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#D7F1FA] border border-[#75D2EE]/40 flex items-center justify-center text-[#167AA0] font-bold text-xs uppercase shrink-0">
                          {company.name.substring(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/companies/${company.id}`}
                            className="font-bold text-[#17364A] dark:text-white hover:text-[#167AA0] dark:hover:text-[#75D2EE] block truncate"
                          >
                            {company.name}
                          </Link>
                          {company.domain && (
                            <span className="text-[11px] text-[#526D7D] flex items-center gap-1">
                              <Globe className="w-3 h-3 text-[#75D2EE]" />
                              <span>{company.domain}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-[#526D7D] dark:text-slate-300">
                      {company.industry || '—'}
                    </td>

                    <td className="py-3 px-4 text-[#526D7D] dark:text-slate-300">
                      {company.size ? `${company.size} employees` : '—'}
                    </td>

                    <td className="py-3 px-4 text-[#526D7D] dark:text-slate-300">
                      {company.city || company.country ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#526D7D]" />
                          <span>
                            {[company.city, company.country].filter(Boolean).join(', ')}
                          </span>
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {company.tags && company.tags.length > 0 ? (
                          company.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-1.5 py-0.5 rounded text-[10px] bg-[#D7F1FA]/60 text-[#167AA0] font-medium"
                            >
                              #{tag}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/companies/${company.id}`}
                          className="p-1.5 rounded-lg text-[#526D7D] hover:text-[#167AA0] hover:bg-[#D7F1FA]/50 transition-colors"
                          title="View Company"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => {
                            setEditingCompany(company);
                            setIsModalOpen(true);
                          }}
                          className="px-2 py-1 text-[11px] font-semibold text-[#167AA0] hover:bg-[#D7F1FA]/50 rounded-lg transition-colors cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleArchive(company)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                          title={company.is_archived ? 'Unarchive' : 'Archive'}
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Company Modal */}
      <CompanyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        workspaceId={workspaceId}
        initialCompany={editingCompany}
        onSuccess={() => fetchCompanies(workspaceId)}
      />
    </div>
  );
}
