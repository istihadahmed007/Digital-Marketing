'use client';

import React, { useState, useEffect } from 'react';
import {
  WorkflowExecution,
  WorkflowNodeExecution,
} from '@/lib/types/crm';
import { getExecutionDetail, retryExecution } from '@/lib/actions/automations';
import {
  X,
  RotateCw,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Code2,
  Hash,
  Shield,
  Layers,
  Sparkles,
} from 'lucide-react';

interface ExecutionDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  executionId: string | null;
  onRetried?: () => void;
}

export function ExecutionDetailDrawer({
  isOpen,
  onClose,
  workspaceId,
  executionId,
  onRetried,
}: ExecutionDetailDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [data, setData] = useState<{
    execution: WorkflowExecution;
    nodeExecutions: WorkflowNodeExecution[];
  } | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [retryFeedback, setRetryFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !executionId) {
      setData(null);
      return;
    }

    async function load() {
      setLoading(true);
      try {
        const res = await getExecutionDetail(workspaceId, executionId!);
        setData(res);
        if (res?.nodeExecutions?.length) {
          // Default expand failed nodes or last node
          const initialExpanded: Record<string, boolean> = {};
          res.nodeExecutions.forEach((n) => {
            if (n.status === 'failed') initialExpanded[n.id] = true;
          });
          if (Object.keys(initialExpanded).length === 0) {
            initialExpanded[res.nodeExecutions[0].id] = true;
          }
          setExpandedNodes(initialExpanded);
        }
      } catch (err) {
        console.error('Failed to load execution detail:', err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [isOpen, executionId, workspaceId]);

  if (!isOpen) return null;

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const handleRetry = async () => {
    if (!executionId) return;
    setRetrying(true);
    setRetryFeedback(null);
    try {
      const res = await retryExecution(workspaceId, executionId);
      if (res.success) {
        setRetryFeedback('Retry dispatched! New execution run created.');
        if (onRetried) onRetried();
      } else {
        setRetryFeedback(`Retry failed: ${res.error}`);
      }
    } catch (err: any) {
      setRetryFeedback(`Error: ${err.message || 'Retry failed'}`);
    } finally {
      setRetrying(false);
    }
  };

  const exec = data?.execution;
  const nodes = data?.nodeExecutions || [];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs font-mono font-bold rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                Run #{executionId?.slice(0, 8)}
              </span>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Execution Details
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Inspecting node-by-node execution telemetry and input/output payloads.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-16">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
              <p className="text-xs text-slate-400">Loading execution telemetry...</p>
            </div>
          ) : !exec ? (
            <div className="text-center p-12 text-slate-400 text-sm">
              Execution record not found.
            </div>
          ) : (
            <>
              {/* Status & Summary Card */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 text-xs font-bold rounded-full flex items-center gap-1.5 ${
                        exec.status === 'succeeded'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : exec.status === 'failed'
                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                          : exec.status === 'waiting'
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                          : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                      }`}
                    >
                      {exec.status === 'succeeded' && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {exec.status === 'failed' && <XCircle className="w-3.5 h-3.5" />}
                      {exec.status === 'waiting' && <Clock className="w-3.5 h-3.5" />}
                      {exec.status === 'running' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {exec.status.toUpperCase()}
                    </span>

                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {exec.workflow?.name || 'Automation Workflow'}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      (v{exec.workflow_version || 1})
                    </span>
                  </div>

                  {/* Retry Action */}
                  <button
                    onClick={handleRetry}
                    disabled={retrying}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs transition"
                  >
                    {retrying ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RotateCw className="w-3.5 h-3.5" />
                    )}
                    Retry Execution
                  </button>
                </div>

                {retryFeedback && (
                  <div className="p-2.5 rounded-lg text-xs bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    {retryFeedback}
                  </div>
                )}

                {/* Metadata grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Trigger Type</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200 font-mono">
                      {exec.trigger_type}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Duration</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {exec.duration_ms ? `${exec.duration_ms}ms` : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Started At</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {new Date(exec.started_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Idempotency</span>
                    <span className="font-mono text-[11px] text-slate-500 truncate block" title={exec.idempotency_key}>
                      {exec.idempotency_key ? exec.idempotency_key.slice(0, 14) + '...' : '—'}
                    </span>
                  </div>
                </div>

                {/* Overall Error Message */}
                {exec.error_message && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Error Reason:</p>
                      <p className="mt-0.5 font-mono">{exec.error_message}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Trigger Payload Inspection */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5" />
                  Trigger Input Payload
                </span>
                <div className="p-3 bg-slate-900 rounded-xl font-mono text-[11px] text-slate-200 overflow-x-auto max-h-40">
                  <pre>{JSON.stringify(exec.trigger_data || {}, null, 2)}</pre>
                </div>
              </div>

              {/* Node Execution Steps Timeline */}
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  Node Execution Trace ({nodes.length} nodes)
                </span>

                {nodes.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    No individual node execution steps recorded yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {nodes.map((node, index) => {
                      const isExpanded = !!expandedNodes[node.id];
                      return (
                        <div
                          key={node.id}
                          className={`rounded-xl border transition ${
                            node.status === 'succeeded'
                              ? 'border-emerald-200 dark:border-emerald-800/60 bg-white dark:bg-slate-900'
                              : node.status === 'failed'
                              ? 'border-rose-300 dark:border-rose-800 bg-rose-50/20 dark:bg-rose-950/20'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                          }`}
                        >
                          {/* Node Row Header */}
                          <div
                            onClick={() => toggleNode(node.id)}
                            className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition rounded-xl"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                {index + 1}
                              </span>

                              <div className="flex items-center gap-2">
                                {node.status === 'succeeded' && (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                )}
                                {node.status === 'failed' && (
                                  <XCircle className="w-4 h-4 text-rose-500" />
                                )}
                                {node.status === 'running' && (
                                  <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                                )}
                                {node.status === 'waiting' && (
                                  <Clock className="w-4 h-4 text-amber-500" />
                                )}

                                <span className="text-xs font-bold text-slate-900 dark:text-white">
                                  {node.node_label || node.node_id}
                                </span>

                                <span className="px-2 py-0.5 text-[10px] rounded-md font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                  {node.node_type}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              {node.duration_ms !== undefined && (
                                <span className="text-[11px] font-mono text-slate-400">
                                  {node.duration_ms}ms
                                </span>
                              )}
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                          </div>

                          {/* Node Collapsible Body */}
                          {isExpanded && (
                            <div className="p-3.5 pt-0 border-t border-slate-100 dark:border-slate-800/80 space-y-3 mt-1">
                              {/* Error Message if failed */}
                              {node.error_message && (
                                <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
                                  <span className="font-bold">Error:</span> {node.error_message}
                                </div>
                              )}

                              {/* Input Data */}
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                  Input Parameters / Resolved Values
                                </span>
                                <div className="p-2.5 bg-slate-900 rounded-lg font-mono text-[10px] text-slate-300 max-h-32 overflow-y-auto">
                                  <pre>{JSON.stringify(node.input_data || {}, null, 2)}</pre>
                                </div>
                              </div>

                              {/* Output Data */}
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                  Output Data / Result
                                </span>
                                <div className="p-2.5 bg-slate-900 rounded-lg font-mono text-[10px] text-emerald-400 max-h-32 overflow-y-auto">
                                  <pre>{JSON.stringify(node.output_data || {}, null, 2)}</pre>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900 shrink-0">
          <span className="text-xs text-slate-400">
            NexusFlow Engine • Protected by Row Level Security
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
