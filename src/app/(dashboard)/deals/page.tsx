'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Deal, DealStage, Contact, Company, Pipeline } from '@/lib/types/crm';
import { getDeals, updateDealStage } from '@/lib/actions/deals';
import { getContacts } from '@/lib/actions/contacts';
import { getCompanies } from '@/lib/actions/companies';
import { getPipelines, createPipeline } from '@/lib/actions/pipelines';
import { DealModal } from '@/components/crm/DealModal';
import { StatusBadge } from '@/components/crm/StatusBadge';
import { EmptyState } from '@/components/crm/EmptyState';
import {
  TrendingUp,
  Plus,
  LayoutGrid,
  List,
  Calendar,
  Building2,
  DollarSign,
  Loader2,
  ArrowRight,
  MoreVertical,
  GitBranch,
  X,
} from 'lucide-react';

const PIPELINE_STAGES: { id: DealStage; label: string; color: string }[] = [
  { id: 'lead', label: 'Lead', color: 'border-t-sky-500' },
  { id: 'qualified', label: 'Qualified', color: 'border-t-indigo-500' },
  { id: 'proposal', label: 'Proposal', color: 'border-t-purple-500' },
  { id: 'negotiation', label: 'Negotiation', color: 'border-t-amber-500' },
  { id: 'closed_won', label: 'Closed Won', color: 'border-t-emerald-500' },
  { id: 'closed_lost', label: 'Closed Lost', color: 'border-t-rose-500' },
];

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('');
  const [isNewPipelineModalOpen, setIsNewPipelineModalOpen] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState('');
  const [isCreatingPipeline, setIsCreatingPipeline] = useState(false);

  const [workspaceId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('nexusmark_active_workspace') || 'ws-default'
      );
    }
    return 'ws-default';
  });
  const [loading, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [selectedDefaultStage, setSelectedDefaultStage] = useState<DealStage>('lead');

  const fetchDeals = async (wsId: string) => {
    setLoading(true);
    try {
      const [dealList, contactList, companyList, pipelineList] = await Promise.all([
        getDeals(wsId),
        getContacts(wsId),
        getCompanies(wsId),
        getPipelines(wsId),
      ]);
      setDeals(dealList);
      setContacts(contactList);
      setCompanies(companyList);
      setPipelines(pipelineList);
      if (pipelineList.length > 0) {
        setSelectedPipelineId((prev) => prev || pipelineList[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals(workspaceId);
  }, [workspaceId]);

  const handleStageMove = async (dealId: string, newStage: DealStage) => {
    // Optimistic update
    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, stage: newStage } : d))
    );
    await updateDealStage(workspaceId, dealId, newStage);
  };

  const handleCreatePipeline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPipelineName.trim()) return;
    setIsCreatingPipeline(true);
    const res = await createPipeline(workspaceId, newPipelineName.trim(), [
      { name: 'Lead Discovery', probability: 10, color: '#3b82f6' },
      { name: 'Initial Demo', probability: 35, color: '#8b5cf6' },
      { name: 'Proposal Sent', probability: 65, color: '#ec4899' },
      { name: 'Contract Negotiations', probability: 85, color: '#f59e0b' },
      { name: 'Closed Won', probability: 100, color: '#10b981' },
      { name: 'Closed Lost', probability: 0, color: '#ef4444' },
    ]);
    setIsCreatingPipeline(false);
    if (res.success && res.pipeline) {
      setPipelines((prev) => [...prev, res.pipeline!]);
      setSelectedPipelineId(res.pipeline.id);
      setNewPipelineName('');
      setIsNewPipelineModalOpen(false);
    }
  };

  const getStageTotal = (stage: DealStage) => {
    const total = deals
      .filter((d) => d.stage === stage)
      .reduce((sum, d) => sum + Number(d.amount), 0);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(total);
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Deals & Sales Pipeline
            </h1>
            {pipelines.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-xl">
                <GitBranch className="w-3.5 h-3.5 text-indigo-500" />
                <select
                  value={selectedPipelineId}
                  onChange={(e) => setSelectedPipelineId(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 border-none focus:outline-hidden cursor-pointer"
                >
                  {pipelines.map((p) => (
                    <option key={p.id} value={p.id} className="dark:bg-slate-900 text-slate-900 dark:text-white">
                      {p.name} {p.is_default ? '(Default)' : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setIsNewPipelineModalOpen(true)}
                  className="p-1 hover:text-indigo-600 text-slate-400 cursor-pointer"
                  title="Create custom pipeline"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Visual pipeline stages, forecasted deal values, and win probabilities.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-slate-200/60 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Kanban Board View"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Table List View"
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>

          <button
            onClick={() => {
              setEditingDeal(null);
              setSelectedDefaultStage('lead');
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Deal</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center text-indigo-600">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : deals.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="No Deals In Workspace Pipeline"
          description="Create your first deal to begin tracking expected revenue, conversion probabilities, and customer negotiations."
          actionLabel="Create First Deal"
          onAction={() => setIsModalOpen(true)}
        />
      ) : viewMode === 'kanban' ? (
        /* KANBAN BOARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 overflow-x-auto pb-4">
          {PIPELINE_STAGES.map((stage) => {
            const stageDeals = deals.filter((d) => d.stage === stage.id);

            return (
              <div
                key={stage.id}
                className={`flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-3 min-w-[240px] border-t-4 ${stage.color} shadow-2xs`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60 dark:border-slate-800">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      {stage.label}
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {getStageTotal(stage.id)}
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {stageDeals.length}
                  </span>
                </div>

                {/* Deal Cards in Column */}
                <div className="space-y-2 flex-1 overflow-y-auto max-h-[600px]">
                  {stageDeals.length === 0 ? (
                    <div className="py-8 text-center text-[11px] text-slate-400">
                      No deals in this stage
                    </div>
                  ) : (
                    stageDeals.map((deal) => (
                      <div
                        key={deal.id}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-md transition-all group"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <Link
                            href={`/deals/${deal.id}`}
                            className="font-bold text-xs text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 line-clamp-2"
                          >
                            {deal.title}
                          </Link>
                        </div>

                        <div className="mt-2 flex items-baseline justify-between">
                          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            {deal.currency} {deal.amount.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {deal.probability}% win
                          </span>
                        </div>

                        {/* Associated Account */}
                        {(deal.company || deal.contact) && (
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 truncate flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>
                              {deal.company?.name || `${deal.contact?.first_name} ${deal.contact?.last_name}`}
                            </span>
                          </p>
                        )}

                        {/* Expected Close Date */}
                        {deal.expected_close_date && (
                          <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3 shrink-0" />
                            <span>
                              Close: {new Date(deal.expected_close_date).toLocaleDateString()}
                            </span>
                          </p>
                        )}

                        {/* Quick Stage Mover Dropdown */}
                        <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <span className="text-[9px] uppercase font-bold text-slate-400">
                            Move:
                          </span>
                          <select
                            value={deal.stage}
                            onChange={(e) =>
                              handleStageMove(deal.id, e.target.value as DealStage)
                            }
                            className="text-[10px] py-0.5 px-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                          >
                            {PIPELINE_STAGES.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add deal to this stage button */}
                <button
                  onClick={() => {
                    setEditingDeal(null);
                    setSelectedDefaultStage(stage.id);
                    setIsModalOpen(true);
                  }}
                  className="mt-2 w-full py-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-indigo-600 hover:bg-slate-200/50 dark:hover:bg-slate-800/60 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Deal</span>
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE LIST VIEW */
        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                <tr>
                  <th className="py-3 px-4">Deal Title</th>
                  <th className="py-3 px-4">Value</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">Win Prob.</th>
                  <th className="py-3 px-4">Account / Contact</th>
                  <th className="py-3 px-4">Close Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {deals.map((deal) => (
                  <tr
                    key={deal.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <Link
                        href={`/deals/${deal.id}`}
                        className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400"
                      >
                        {deal.title}
                      </Link>
                    </td>

                    <td className="py-3 px-4 font-bold text-indigo-600 dark:text-indigo-400">
                      {deal.currency} {deal.amount.toLocaleString()}
                    </td>

                    <td className="py-3 px-4">
                      <StatusBadge status={deal.stage} type="deal_stage" />
                    </td>

                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-mono">
                      {deal.probability}%
                    </td>

                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {deal.company?.name ||
                        (deal.contact ? `${deal.contact.first_name} ${deal.contact.last_name}` : '—')}
                    </td>

                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                      {deal.expected_close_date
                        ? new Date(deal.expected_close_date).toLocaleDateString()
                        : '—'}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setEditingDeal(deal);
                          setIsModalOpen(true);
                        }}
                        className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Deal Modal */}
      <DealModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        workspaceId={workspaceId}
        contacts={contacts}
        companies={companies}
        initialDeal={editingDeal}
        defaultStage={selectedDefaultStage}
        onSuccess={() => fetchDeals(workspaceId)}
      />

      {/* New Pipeline Modal */}
      {isNewPipelineModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Create Sales Pipeline
                </h3>
              </div>
              <button
                onClick={() => setIsNewPipelineModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePipeline} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Pipeline Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Enterprise Sales, Partnership Funnel"
                  value={newPipelineName}
                  onChange={(e) => setNewPipelineName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
                Will be initialized with 6 standardized probability stages (Discovery, Demo, Proposal, Negotiations, Won, Lost) configurable per deal.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewPipelineModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingPipeline}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isCreatingPipeline ? 'Creating...' : 'Create Pipeline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

