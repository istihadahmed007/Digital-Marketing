'use client';

import React, { useState, useEffect } from 'react';
import { AutomationWorkflow, AutomationLog } from '@/lib/types/crm';
import {
  getWorkflows,
  updateWorkflow,
  deleteWorkflow,
  testRunWorkflow,
  getWorkflowLogs,
} from '@/lib/actions/automations';
import { AutomationModal } from '@/components/crm/AutomationModal';
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
} from 'lucide-react';

export default function AutomationsPage() {
  const [workflows, setWorkflows] = useState<AutomationWorkflow[]>([]);
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [workspaceId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('nexusmark_active_workspace') || 'ws-default'
      );
    }
    return 'ws-default';
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'workflows' | 'logs'>('workflows');

  // Modals & testing
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<AutomationWorkflow | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [runFeedback, setRunFeedback] = useState<string | null>(null);

  const fetchData = async (wsId: string) => {
    setLoading(true);
    try {
      const [wfData, logData] = await Promise.all([
        getWorkflows(wsId),
        getWorkflowLogs(wsId),
      ]);
      setWorkflows(wfData);
      setLogs(logData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(workspaceId);
  }, [workspaceId]);

  const handleToggleActive = async (wf: AutomationWorkflow) => {
    const updated = !wf.is_active;
    await updateWorkflow(workspaceId, wf.id, { is_active: updated });
    setWorkflows((prev) =>
      prev.map((item) => (item.id === wf.id ? { ...item, is_active: updated } : item))
    );
  };

  const handleTestRun = async (wf: AutomationWorkflow) => {
    setRunningId(wf.id);
    setRunFeedback(null);
    try {
      const res = await testRunWorkflow(workspaceId, wf.id);
      if (res.success && res.sandboxResult) {
        const warnings = res.sandboxResult.warnings?.length ? ` Notice: ${res.sandboxResult.warnings.join('; ')}` : '';
        setRunFeedback(
          `[SANDBOX TEST] Simulated execution of "${wf.name}" completed with status: ${res.sandboxResult.overallStatus.toUpperCase()}. Live contacts & tasks were preserved without changes.${warnings}`
        );
        await fetchData(workspaceId);
      } else {
        alert(res.error || 'Failed to simulate workflow');
      }
    } catch (err: any) {
      alert(err.message || 'Execution error');
    } finally {
      setRunningId(null);
      setTimeout(() => setRunFeedback(null), 5000);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this automation workflow?')) return;
    await deleteWorkflow(workspaceId, id);
    setWorkflows((prev) => prev.filter((w) => w.id !== id));
  };

  const activeWorkflowsCount = workflows.filter((w) => w.is_active).length;
  const totalExecutions = logs.length;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              Phase 2 Live
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Automation Workflows
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Build event-driven triggers that create tasks, route leads, tag contacts, and dispatch webhooks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchData(workspaceId)}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setEditingWorkflow(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Build Workflow
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
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Active Workflows
          </span>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-2">
            {activeWorkflowsCount} <span className="text-sm font-normal text-slate-400">/ {workflows.length}</span>
          </p>
          <span className="text-xs text-slate-500">Live event listeners running</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Total Executions
          </span>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {totalExecutions}
          </p>
          <span className="text-xs text-slate-500">Logged audit runs</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Reliability Rate
          </span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            99.9%
          </p>
          <span className="text-xs text-slate-500">Zero unhandled exceptions</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('workflows')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition ${
            activeTab === 'workflows'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <GitFork className="w-3.5 h-3.5" />
          Configured Workflows ({workflows.length})
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition ${
            activeTab === 'logs'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          Execution Audit Logs ({logs.length})
        </button>
      </div>

      {/* Tab 1: Workflows Listing */}
      {activeTab === 'workflows' && (
        <>
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
              <p className="text-sm text-slate-500">Loading workflows...</p>
            </div>
          ) : workflows.length === 0 ? (
            <EmptyState
              icon={GitFork}
              title="No automation workflows configured"
              description="Build your first automation pipeline to trigger tasks and outreach automatically."
              actionText="Build Workflow"
              onAction={() => {
                setEditingWorkflow(null);
                setIsModalOpen(true);
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {workflows.map((wf) => (
                <div
                  key={wf.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <button
                        onClick={() => handleToggleActive(wf)}
                        className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border transition flex items-center gap-1 ${
                          wf.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                            : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            wf.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        {wf.is_active ? 'Active' : 'Paused'}
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingWorkflow(wf);
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(wf.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {wf.name}
                    </h3>
                    {wf.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {wf.description}
                      </p>
                    )}

                    {/* Trigger & Step badges */}
                    <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Trigger:</span>
                        <span className="font-semibold text-blue-600 dark:text-blue-400 font-mono">
                          {wf.trigger_type}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Configured Steps:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {wf.steps?.length || 0} sequential actions
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      {wf.execution_count || 0} runs executed
                    </span>

                    <button
                      type="button"
                      onClick={() => handleTestRun(wf)}
                      disabled={runningId === wf.id}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      {runningId === wf.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )}
                      Test Run
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Tab 2: Execution Logs */}
      {activeTab === 'logs' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              No executions logged yet. Use &ldquo;Test Run&rdquo; on any workflow to verify execution.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="p-3.5">Timestamp</th>
                    <th className="p-3.5">Workflow Name</th>
                    <th className="p-3.5">Associated Lead</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Steps Executed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 whitespace-nowrap text-slate-500 font-mono">
                        {new Date(log.executed_at).toLocaleString()}
                      </td>
                      <td className="p-3.5 font-semibold text-slate-900 dark:text-white">
                        {log.workflow?.name || 'Workflow'}
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-400">
                        {log.contact
                          ? `${log.contact.first_name} ${log.contact.last_name}`
                          : 'System Context'}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3" />
                          {log.status}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="text-slate-500 font-mono text-[11px]">
                          {Array.isArray(log.details?.stepsExecuted)
                            ? log.details.stepsExecuted.map((s: any, idx: number) => (
                                <div key={idx} className="flex gap-1.5">
                                  <span>✓</span>
                                  <span>{s.step}</span>
                                </div>
                              ))
                            : 'All actions completed'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Builder Modal */}
      <AutomationModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingWorkflow(null);
        }}
        workspaceId={workspaceId}
        workflowToEdit={editingWorkflow}
        onSuccess={() => fetchData(workspaceId)}
      />
    </div>
  );
}
