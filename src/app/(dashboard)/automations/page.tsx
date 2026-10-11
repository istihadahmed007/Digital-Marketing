'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AutomationWorkflow,
  WorkflowExecution,
} from '@/lib/types/crm';
import {
  getWorkflows,
  createWorkflow,
  publishWorkflow,
  pauseWorkflow,
  deleteWorkflow,
  testRunWorkflowGraph,
  getWorkflowExecutions,
  retryExecution,
} from '@/lib/actions/automations';
import { ExecutionDetailDrawer } from '@/components/automations/ExecutionDetailDrawer';
import { EmptyState } from '@/components/crm/EmptyState';
import {
  GitFork,
  Plus,
  Play,
  Trash2,
  Edit2,
  CheckCircle2,
  History,
  RefreshCw,
  Loader2,
  AlertCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Pause,
  ExternalLink,
  Layers,
  ChevronRight,
  Filter,
  CheckCircle,
  XCircle,
  RotateCw,
  Zap,
} from 'lucide-react';

export default function AutomationsPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<AutomationWorkflow[]>([]);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [workspaceId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('nexusmark_active_workspace') || 'ws-default'
      );
    }
    return 'ws-default';
  });

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'workflows' | 'executions'>('workflows');

  // Filters for executions
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [workflowFilter, setWorkflowFilter] = useState<string>('all');

  // Modals & testing
  const [creating, setCreating] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [runFeedback, setRunFeedback] = useState<string | null>(null);
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);

  const fetchData = async (wsId: string) => {
    setLoading(true);
    try {
      const [wfData, execData] = await Promise.all([
        getWorkflows(wsId),
        getWorkflowExecutions(wsId, { limit: 100 }),
      ]);
      setWorkflows(wfData);
      setExecutions(execData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(workspaceId);
  }, [workspaceId]);

  const handleCreateWorkflow = async () => {
    setCreating(true);
    try {
      const res = await createWorkflow(workspaceId, {
        name: 'New Visual Workflow',
        description: 'Automated event-driven execution pipeline',
        trigger_type: 'contact_created',
      });
      if (res.success && res.workflow) {
        router.push(`/automations/${res.workflow.id}`);
      } else {
        alert(res.error || 'Failed to create workflow');
      }
    } catch (err: any) {
      alert(err.message || 'Creation error');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (wf: AutomationWorkflow) => {
    try {
      if (wf.status === 'active' || wf.is_active) {
        const res = await pauseWorkflow(workspaceId, wf.id);
        if (res.success) {
          setWorkflows((prev) =>
            prev.map((item) =>
              item.id === wf.id ? { ...item, status: 'paused', is_active: false } : item
            )
          );
        } else {
          alert(res.error || 'Failed to pause workflow');
        }
      } else {
        const res = await publishWorkflow(workspaceId, wf.id);
        if (res.success) {
          setWorkflows((prev) =>
            prev.map((item) =>
              item.id === wf.id ? { ...item, status: 'active', is_active: true } : item
            )
          );
        } else {
          alert(res.error || 'Validation failed. Open canvas to review node configuration.');
        }
      }
    } catch (err: any) {
      alert(err.message || 'Toggle error');
    }
  };

  const handleTestRun = async (wf: AutomationWorkflow) => {
    setRunningId(wf.id);
    setRunFeedback(null);
    try {
      const res = await testRunWorkflowGraph(workspaceId, wf.id);
      if (res.success && res.result) {
        setRunFeedback(
          `[SAFE DRY-RUN] Workflow "${wf.name}" executed successfully through ${res.result.nodeExecutions.length} nodes in ${res.result.durationMs}ms. Real contacts and emails were preserved without modification.`
        );
        await fetchData(workspaceId);
      } else {
        alert(res.result?.error || 'Dry-run test encountered an issue');
      }
    } catch (err: any) {
      alert(err.message || 'Execution error');
    } finally {
      setRunningId(null);
      setTimeout(() => setRunFeedback(null), 6000);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this workflow and all its graph configuration?')) return;
    await deleteWorkflow(workspaceId, id);
    setWorkflows((prev) => prev.filter((w) => w.id !== id));
  };

  const handleInspectExecution = (execId: string) => {
    setSelectedExecutionId(execId);
    setIsDetailDrawerOpen(true);
  };

  // Filtered executions
  const filteredExecutions = executions.filter((exec) => {
    if (statusFilter !== 'all' && exec.status !== statusFilter) return false;
    if (workflowFilter !== 'all' && exec.workflow_id !== workflowFilter) return false;
    return true;
  });

  const activeWorkflowsCount = workflows.filter((w) => w.is_active || w.status === 'active').length;
  const totalRuns = executions.length;
  const succeededRuns = executions.filter((e) => e.status === 'succeeded').length;
  const successRate = totalRuns > 0 ? Math.round((succeededRuns / totalRuns) * 100) : 100;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-[#D7F1FA] text-[#167AA0] dark:bg-[#167AA0]/30 dark:text-[#75D2EE] border border-[#75D2EE]/40 flex items-center gap-1">
              <Zap className="w-3 h-3" />
              NexusFlow Engine
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-[#17364A] dark:text-white">
              Automation Workflows
            </h1>
          </div>
          <p className="text-sm text-[#526D7D] dark:text-slate-400 mt-1">
            Build event-driven node workflows with real visual routing, conditional branching, and durable execution.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchData(workspaceId)}
            className="p-2 text-[#526D7D] hover:text-[#17364A] dark:hover:text-slate-200 rounded-xl hover:bg-[#D7F1FA]/30 transition glass-button-press cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleCreateWorkflow}
            disabled={creating}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#167AA0] hover:bg-[#0E526E] disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-sm shadow-[#167AA0]/25 transition glass-button-press cursor-pointer"
          >
            {creating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Build Visual Workflow
          </button>
        </div>
      </div>

      {runFeedback && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{runFeedback}</span>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-5 glass-panel preview-tile-3d rounded-2xl shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-[#526D7D]">
            Active Workflows
          </span>
          <p className="text-2xl font-black text-[#167AA0] dark:text-[#75D2EE] mt-2">
            {activeWorkflowsCount} <span className="text-sm font-normal text-[#526D7D]">/ {workflows.length}</span>
          </p>
          <span className="text-xs text-[#526D7D]">Live event listeners running</span>
        </div>

        <div className="p-5 glass-panel preview-tile-3d rounded-2xl shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-[#526D7D]">
            Total Executions
          </span>
          <p className="text-2xl font-black text-[#17364A] dark:text-white mt-2">
            {totalRuns}
          </p>
          <span className="text-xs text-[#526D7D]">Durable execution runs logged</span>
        </div>

        <div className="p-5 glass-panel preview-tile-3d rounded-2xl shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-[#526D7D]">
            Reliability Rate
          </span>
          <p className="text-2xl font-black text-[#167AA0] dark:text-[#75D2EE] mt-2">
            {successRate}%
          </p>
          <span className="text-xs text-[#526D7D]">{succeededRuns} successful runs</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#75D2EE]/20 pb-2">
        <button
          onClick={() => setActiveTab('workflows')}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition cursor-pointer ${
            activeTab === 'workflows'
              ? 'bg-[#167AA0] text-white shadow-sm shadow-[#167AA0]/25'
              : 'text-[#526D7D] hover:text-[#17364A] hover:bg-[#D7F1FA]/30'
          }`}
        >
          <GitFork className="w-3.5 h-3.5" />
          Workflow Pipelines ({workflows.length})
        </button>
        <button
          onClick={() => setActiveTab('executions')}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition cursor-pointer ${
            activeTab === 'executions'
              ? 'bg-[#167AA0] text-white shadow-sm shadow-[#167AA0]/25'
              : 'text-[#526D7D] hover:text-[#17364A] hover:bg-[#D7F1FA]/30'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          Execution History ({executions.length})
        </button>
      </div>

      {/* Tab 1: Workflows Listing */}
      {activeTab === 'workflows' && (
        <>
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 glass-panel rounded-2xl">
              <Loader2 className="w-8 h-8 text-[#167AA0] animate-spin mb-3" />
              <p className="text-sm text-[#526D7D]">Loading workflows...</p>
            </div>
          ) : workflows.length === 0 ? (
            <EmptyState
              icon={GitFork}
              title="No automation workflows configured"
              description="Build your first node-based workflow pipeline to trigger tasks, send emails, and dispatch webhooks automatically."
              actionLabel="Build Visual Workflow"
              onAction={handleCreateWorkflow}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {workflows.map((wf) => {
                const nodeCount = wf.nodes?.length || wf.steps?.length || 1;
                const edgeCount = wf.edges?.length || Math.max(0, nodeCount - 1);
                const isLive = wf.status === 'active' || wf.is_active;

                return (
                  <div
                    key={wf.id}
                    className="glass-panel preview-tile-3d rounded-2xl p-5 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      {/* Top status bar */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleActive(wf)}
                            className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border transition flex items-center gap-1.5 cursor-pointer ${
                              isLive
                                ? 'bg-[#D7F1FA] text-[#167AA0] border-[#75D2EE]/40 dark:bg-[#167AA0]/30 dark:text-[#75D2EE]'
                                : wf.status === 'draft'
                                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
                                : 'bg-white/60 text-[#526D7D] border-[#75D2EE]/30 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                            title={isLive ? 'Click to Pause' : 'Click to Publish'}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isLive
                                  ? 'bg-[#167AA0]'
                                  : wf.status === 'draft'
                                  ? 'bg-amber-500'
                                  : 'bg-slate-400'
                              }`}
                            />
                            {isLive ? 'Active' : wf.status === 'draft' ? 'Draft' : 'Paused'}
                          </button>

                          <span className="text-[11px] font-mono text-[#526D7D] bg-white/70 dark:bg-slate-800/80 px-2 py-0.5 rounded-md border border-[#75D2EE]/20">
                            v{wf.version || 1}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <Link
                            href={`/automations/${wf.id}`}
                            className="p-1.5 text-[#526D7D] hover:text-[#167AA0] dark:hover:text-[#75D2EE] hover:bg-[#D7F1FA]/30 rounded-lg transition"
                            title="Open Visual Canvas"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={() => handleDelete(wf.id)}
                            className="p-1.5 text-[#526D7D] hover:text-red-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Title & Description */}
                      <Link href={`/automations/${wf.id}`} className="group block">
                        <h3 className="text-base font-bold text-[#17364A] dark:text-white group-hover:text-[#167AA0] dark:group-hover:text-[#75D2EE] transition flex items-center gap-1.5">
                          {wf.name}
                          <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition text-[#167AA0] dark:text-[#75D2EE]" />
                        </h3>
                      </Link>
                      {wf.description && (
                        <p className="text-xs text-[#526D7D] mt-1 line-clamp-2">
                          {wf.description}
                        </p>
                      )}

                      {/* Graph Metrics */}
                      <div className="mt-4 p-3 bg-white/70 dark:bg-slate-800/40 border border-[#75D2EE]/20 rounded-xl space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[#526D7D]">Trigger Type:</span>
                          <span className="font-semibold text-[#167AA0] dark:text-[#75D2EE] font-mono">
                            {wf.trigger_type || 'manual'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#526D7D]">Canvas Graph:</span>
                          <span className="font-semibold text-[#17364A] dark:text-slate-300 flex items-center gap-1">
                            <Layers className="w-3 h-3 text-[#526D7D]" />
                            {nodeCount} {nodeCount === 1 ? 'node' : 'nodes'} • {edgeCount} connections
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-4 pt-3 border-t border-[#75D2EE]/20 flex items-center justify-between">
                      <span className="text-xs text-[#526D7D]">
                        {wf.execution_count || 0} runs executed
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleTestRun(wf)}
                          disabled={runningId === wf.id}
                          className="px-3 py-1.5 bg-[#D7F1FA] hover:bg-[#D7F1FA]/70 text-[#167AA0] dark:bg-[#167AA0]/30 dark:text-[#75D2EE] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition glass-button-press cursor-pointer"
                          title="Safe dry-run execution"
                        >
                          {runningId === wf.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Play className="w-3.5 h-3.5" />
                          )}
                          Test Run
                        </button>

                        <Link
                          href={`/automations/${wf.id}`}
                          className="px-3 py-1.5 bg-[#167AA0] hover:bg-[#0E526E] text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition glass-button-press"
                        >
                          Open Canvas
                          <ChevronRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Tab 2: Execution History */}
      {activeTab === 'executions' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 glass-panel rounded-2xl text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-[#526D7D] ml-1" />
              <span className="font-semibold text-[#17364A] dark:text-slate-300">Status:</span>
              {['all', 'succeeded', 'failed', 'running', 'waiting'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition capitalize cursor-pointer ${
                    statusFilter === st
                      ? 'bg-[#167AA0] text-white shadow-xs'
                      : 'text-[#526D7D] hover:bg-[#D7F1FA]/30'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#17364A] dark:text-slate-300">Workflow:</span>
              <select
                value={workflowFilter}
                onChange={(e) => setWorkflowFilter(e.target.value)}
                className="px-2.5 py-1 bg-white/70 dark:bg-slate-800 border border-[#75D2EE]/30 focus:border-[#167AA0] rounded-lg text-[#17364A] dark:text-slate-300 focus:outline-hidden"
              >
                <option value="all">All Workflows</option>
                {workflows.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="glass-panel-opaque rounded-2xl overflow-hidden shadow-xs">
            {filteredExecutions.length === 0 ? (
              <div className="p-12 text-center text-[#526D7D] text-sm">
                No execution runs found matching your filter criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#D7F1FA]/40 dark:bg-[#17364A]/40 border-b border-[#75D2EE]/30 font-semibold text-[#17364A] dark:text-slate-300">
                    <tr>
                      <th className="p-3.5">Execution Run</th>
                      <th className="p-3.5">Workflow</th>
                      <th className="p-3.5">Trigger</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Duration</th>
                      <th className="p-3.5">Timestamp</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#75D2EE]/15 text-[#17364A] dark:text-slate-300">
                    {filteredExecutions.map((exec) => (
                      <tr
                        key={exec.id}
                        onClick={() => handleInspectExecution(exec.id)}
                        className="hover:bg-[#D7F1FA]/20 dark:hover:bg-[#17364A]/30 cursor-pointer transition"
                      >
                        <td className="p-3.5 whitespace-nowrap font-mono text-[#167AA0] dark:text-[#75D2EE] font-semibold">
                          #{exec.id.slice(0, 8)}
                        </td>
                        <td className="p-3.5 font-semibold text-[#17364A] dark:text-white">
                          <div className="flex items-center gap-1.5">
                            <span>{exec.workflow?.name || 'Workflow'}</span>
                            <span className="text-[10px] text-[#526D7D] font-mono">
                              v{exec.workflow_version || 1}
                            </span>
                          </div>
                        </td>
                        <td className="p-3.5 font-mono text-[11px] text-[#526D7D] dark:text-slate-400">
                          {exec.trigger_type}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 w-fit ${
                              exec.status === 'succeeded'
                                ? 'bg-[#D7F1FA] text-[#167AA0] border border-[#75D2EE]/40 dark:bg-[#167AA0]/30 dark:text-[#75D2EE]'
                                : exec.status === 'failed'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400'
                                : exec.status === 'waiting'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400'
                                : 'bg-[#D7F1FA]/60 text-[#167AA0] border border-[#75D2EE]/30'
                            }`}
                          >
                            {exec.status === 'succeeded' && <CheckCircle className="w-3 h-3" />}
                            {exec.status === 'failed' && <XCircle className="w-3 h-3" />}
                            {exec.status === 'waiting' && <Clock className="w-3 h-3" />}
                            {exec.status === 'running' && <Loader2 className="w-3 h-3 animate-spin" />}
                            {exec.status}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-[#526D7D]">
                          {exec.duration_ms ? `${exec.duration_ms}ms` : '—'}
                        </td>
                        <td className="p-3.5 whitespace-nowrap text-[#526D7D] font-mono">
                          {new Date(exec.started_at).toLocaleString()}
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInspectExecution(exec.id);
                            }}
                            className="px-2.5 py-1 bg-white/80 hover:bg-[#D7F1FA]/50 border border-[#75D2EE]/30 text-[#17364A] dark:text-slate-300 rounded-lg text-xs font-semibold transition glass-button-press cursor-pointer"
                          >
                            Inspect Trace
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Execution Detail Drawer */}
      <ExecutionDetailDrawer
        isOpen={isDetailDrawerOpen}
        onClose={() => setIsDetailDrawerOpen(false)}
        workspaceId={workspaceId}
        executionId={selectedExecutionId}
        onRetried={() => fetchData(workspaceId)}
      />
    </div>
  );
}
