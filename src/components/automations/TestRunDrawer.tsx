'use client';

import React, { useState } from 'react';
import {
  WorkflowNode,
  WorkflowExecution,
} from '@/lib/types/automation-flow';
import { testRunWorkflowGraph, sendTestEmailToCurrentUser } from '@/lib/actions/automations';
import { ExecutionResult } from '@/lib/automations/execution-engine';
import {
  X,
  Play,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Mail,
  ChevronDown,
  ChevronRight,
  Code,
} from 'lucide-react';

interface TestRunDrawerProps {
  workspaceId: string;
  workflowId: string;
  workflowName: string;
  nodes: WorkflowNode[];
  isOpen: boolean;
  onClose: () => void;
}

export function TestRunDrawer({
  workspaceId,
  workflowId,
  workflowName,
  nodes,
  isOpen,
  onClose,
}: TestRunDrawerProps) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  // Test email state
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testEmailFeedback, setTestEmailFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const emailNodes = nodes.filter((n) => n.type === 'send_email');

  const handleRunTest = async () => {
    setRunning(true);
    setError(null);
    setResult(null);

    try {
      const res = await testRunWorkflowGraph(workspaceId, workflowId);
      if (res.success && res.result) {
        setResult(res.result);
        // Expand first node by default
        if (res.result.nodeExecutions.length > 0) {
          setExpandedNodes({ [res.result.nodeExecutions[0].nodeId]: true });
        }
      } else {
        setError(res.error || 'Test run failed');
      }
    } catch (err: any) {
      setError(err.message || 'Execution error');
    } finally {
      setRunning(false);
    }
  };

  const handleSendTestEmail = async (nodeId: string) => {
    const confirmed = window.confirm(
      'Send a real test email to your logged-in email address to preview template rendering?'
    );
    if (!confirmed) return;

    setSendingTestEmail(true);
    setTestEmailFeedback(null);
    try {
      const res = await sendTestEmailToCurrentUser(workspaceId, workflowId, nodeId);
      if (res.success) {
        setTestEmailFeedback(res.message || 'Test email dispatched successfully.');
      } else {
        setTestEmailFeedback(`Error: ${res.error || 'Failed to dispatch test email'}`);
      }
    } catch (err: any) {
      setTestEmailFeedback(`Error: ${err.message}`);
    } finally {
      setSendingTestEmail(false);
    }
  };

  const toggleExpand = (nodeId: string) => {
    setExpandedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  return (
    <div className="absolute top-0 right-0 bottom-0 w-[440px] bg-slate-900 border-l border-slate-800 z-30 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
            <Play className="w-3.5 h-3.5 fill-current" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Test Run Sandbox</h3>
            <p className="text-[11px] text-slate-400">Dry-run workflow evaluation</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Safety Notice Banner */}
      <div className="p-3 bg-emerald-950/40 border-b border-emerald-900/40 text-[11px] text-emerald-300 flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <span>
          <strong>Dry Run Guarantee:</strong> Validates expressions and credentials without mutating CRM tables, creating real tasks, or dispatching external emails/webhooks.
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Run Button */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
          <div>
            <span className="text-xs font-semibold text-slate-200 block">Simulate Full Flow</span>
            <span className="text-[11px] text-slate-500">Traverse graph from trigger using sample context</span>
          </div>
          <button
            type="button"
            disabled={running}
            onClick={handleRunTest}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-50 shadow-xs"
          >
            {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>Run Test</span>
          </button>
        </div>

        {/* Test Email Section */}
        {emailNodes.length > 0 && (
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Mail className="w-3.5 h-3.5 text-indigo-400" />
              <span>Real Test Email Preview</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Verify how your email template renders in an actual inbox. Sends strictly to your own user email with confirmation.
            </p>
            <div className="space-y-1.5">
              {emailNodes.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  disabled={sendingTestEmail}
                  onClick={() => handleSendTestEmail(n.id)}
                  className="w-full text-left px-3 py-2 text-xs rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 transition flex items-center justify-between"
                >
                  <span className="truncate">Send test for &ldquo;{n.label}&rdquo;</span>
                  <span className="text-[10px] text-indigo-400 font-semibold shrink-0">Send to Me</span>
                </button>
              ))}
            </div>
            {testEmailFeedback && (
              <p className="text-[11px] text-indigo-300 bg-indigo-950/40 p-2 rounded-lg border border-indigo-900/50">
                {testEmailFeedback}
              </p>
            )}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-900/60 text-xs text-rose-300 flex items-start gap-2">
            <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="block">Simulation Failed</strong>
              <p className="text-[11px] text-rose-300/80">{error}</p>
            </div>
          </div>
        )}

        {/* Results Trace */}
        {result && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Execution Trace ({result.nodeExecutions.length} Steps)
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {result.durationMs}ms
              </span>
            </div>

            <div className="space-y-2">
              {result.nodeExecutions.map((step, idx) => {
                const isExpanded = expandedNodes[step.nodeId];
                const isSuccess = step.status === 'succeeded';
                const isFailed = step.status === 'failed';

                return (
                  <div
                    key={`${step.nodeId}_${idx}`}
                    className="rounded-xl border border-slate-800 bg-slate-950/80 overflow-hidden"
                  >
                    <div
                      onClick={() => toggleExpand(step.nodeId)}
                      className="p-3 flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-900/60 transition"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isSuccess ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : isFailed ? (
                          <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        )}
                        <span className="text-xs font-semibold text-white truncate">
                          {step.nodeLabel}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 font-mono">
                          {step.durationMs}ms
                        </span>
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* Step Details */}
                    {isExpanded && (
                      <div className="p-3 pt-0 border-t border-slate-800/80 bg-slate-950/40 text-[11px] space-y-2">
                        {step.errorMessage && (
                          <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-900/50 text-rose-300 text-[10px]">
                            {step.errorMessage}
                          </div>
                        )}

                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Simulated Output:
                          </span>
                          <pre className="p-2 rounded-lg bg-slate-900 text-slate-300 font-mono text-[10px] overflow-x-auto max-h-40">
                            {JSON.stringify(step.outputData, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
