'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  WorkflowNode,
  WorkflowEdge,
  WorkflowNodeType,
  AutomationWorkflow,
} from '@/lib/types/crm';
import {
  getWorkflow,
  saveWorkflowGraph,
  publishWorkflow,
  pauseWorkflow,
} from '@/lib/actions/automations';
import { FlowCanvas } from '@/components/automations/FlowCanvas';
import { NodeLibraryDrawer } from '@/components/automations/NodeLibraryDrawer';
import { NodeSettingsDrawer } from '@/components/automations/NodeSettingsDrawer';
import { TestRunDrawer } from '@/components/automations/TestRunDrawer';
import { NODE_DEFINITIONS } from '@/lib/automations/node-registry';
import {
  ArrowLeft,
  Save,
  Play,
  CheckCircle2,
  AlertCircle,
  Pause,
  Loader2,
  Sparkles,
  Layers,
  History,
} from 'lucide-react';
import Link from 'next/link';

export default function WorkflowBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const workflowId = resolvedParams.id;

  const [workspaceId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nexusmark_active_workspace') || 'ws-default';
    }
    return 'ws-default';
  });

  const [workflow, setWorkflow] = useState<AutomationWorkflow | null>(null);
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [edges, setEdges] = useState<WorkflowEdge[]>([]);
  const [name, setName] = useState('');
  const [status, setStatus] = useState<string>('draft');
  const [version, setVersion] = useState(1);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Drawers
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTestRunOpen, setIsTestRunOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const wf = await getWorkflow(workspaceId, workflowId);
        if (wf) {
          setWorkflow(wf);
          setName(wf.name);
          setStatus(wf.status || (wf.is_active ? 'active' : 'draft'));
          setVersion(wf.version || 1);
          setNodes(wf.nodes || []);
          setEdges(wf.edges || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [workspaceId, workflowId]);

  const handleSaveDraft = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await saveWorkflowGraph(workspaceId, workflowId, {
        name,
        graph: { nodes, edges },
      });

      if (res.success && res.workflow) {
        setWorkflow(res.workflow);
        setVersion(res.workflow.version || version + 1);
        setFeedback({ type: 'success', text: 'Workflow graph saved as draft.' });
      } else {
        setFeedback({ type: 'error', text: res.error || 'Failed to save workflow.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Save error' });
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    setFeedback(null);
    try {
      // Save latest state first
      await saveWorkflowGraph(workspaceId, workflowId, {
        name,
        graph: { nodes, edges },
      });

      const res = await publishWorkflow(workspaceId, workflowId);
      if (res.success && res.workflow) {
        setStatus('active');
        setWorkflow(res.workflow);
        setFeedback({ type: 'success', text: 'Workflow validated and activated successfully!' });
      } else {
        setFeedback({
          type: 'error',
          text: res.errors?.join('; ') || res.error || 'Validation failed. Check node configurations.',
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Publish error' });
    } finally {
      setPublishing(false);
      setTimeout(() => setFeedback(null), 6000);
    }
  };

  const handlePause = async () => {
    try {
      const res = await pauseWorkflow(workspaceId, workflowId);
      if (res.success) {
        setStatus('paused');
        setFeedback({ type: 'success', text: 'Workflow paused.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleAddNode = (type: WorkflowNodeType) => {
    const def = NODE_DEFINITIONS[type];
    const newNodeId = `node_${type}_${Date.now()}`;
    const newNode: WorkflowNode = {
      id: newNodeId,
      type,
      label: def.label,
      position: {
        x: Math.round(200 + Math.random() * 80),
        y: Math.round(200 + Math.random() * 80),
      },
      data: { ...def.defaultData },
    };

    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(newNodeId);
  };

  const handleUpdateNode = (updatedNode: WorkflowNode) => {
    setNodes((prev) => prev.map((n) => (n.id === updatedNode.id ? updatedNode : n)));
  };

  const handleDeleteNode = (nodeId: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setEdges((prev) => prev.filter((e) => e.source !== nodeId && e.target !== nodeId));
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
      setIsSettingsOpen(false);
    }
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
      </div>
    );
  }

  const statusBadges = {
    active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    draft: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    paused: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    error: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  };

  return (
    <div className="h-screen w-full flex flex-col bg-slate-950 overflow-hidden text-slate-100">
      {/* Top Navigation & Action Bar */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/90 px-4 flex items-center justify-between shrink-0 z-10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link
            href="/automations"
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
            title="Back to Workflows"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="h-4 w-px bg-slate-800" />

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-sm font-bold text-white bg-transparent border-b border-transparent hover:border-slate-700 focus:border-indigo-500 focus:outline-hidden px-1 py-0.5 rounded transition max-w-xs"
              placeholder="Workflow Name"
            />
            <span
              className={`text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full border ${
                statusBadges[status as keyof typeof statusBadges] || statusBadges.draft
              }`}
            >
              {status}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">v{version}</span>
          </div>
        </div>

        {/* Feedback Alert Pill */}
        {feedback && (
          <div
            className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 shadow-md animate-in fade-in duration-200 ${
              feedback.type === 'success'
                ? 'bg-emerald-950 border border-emerald-800 text-emerald-300'
                : 'bg-rose-950 border border-rose-800 text-rose-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Test Run Button */}
          <button
            type="button"
            onClick={() => setIsTestRunOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            <Play className="w-3.5 h-3.5 text-emerald-400 fill-current" />
            <span>Test Run</span>
          </button>

          {/* Save Draft */}
          <button
            type="button"
            disabled={saving}
            onClick={handleSaveDraft}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Save Draft</span>
          </button>

          {/* Pause / Publish */}
          {status === 'active' ? (
            <button
              type="button"
              onClick={handlePause}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-500 text-white transition shadow-sm"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Pause</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={publishing}
              onClick={handlePublish}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm shadow-indigo-600/30 disabled:opacity-50"
            >
              {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>Publish Flow</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Interactive Workspace Canvas */}
      <main className="flex-1 relative overflow-hidden">
        <FlowCanvas
          nodes={nodes}
          edges={edges}
          onNodesChange={setNodes}
          onEdgesChange={setEdges}
          onOpenLibrary={() => setIsLibraryOpen(true)}
          onOpenSettings={(n) => {
            setSelectedNodeId(n.id);
            setIsSettingsOpen(true);
          }}
          selectedNodeId={selectedNodeId}
          onSelectNode={(id) => {
            setSelectedNodeId(id);
            if (id) setIsSettingsOpen(true);
            else setIsSettingsOpen(false);
          }}
        />

        {/* Node Library Drawer */}
        <NodeLibraryDrawer
          isOpen={isLibraryOpen}
          onClose={() => setIsLibraryOpen(false)}
          onAddNode={handleAddNode}
        />

        {/* Node Settings Drawer */}
        <NodeSettingsDrawer
          node={selectedNode}
          isOpen={isSettingsOpen && Boolean(selectedNode)}
          onClose={() => setIsSettingsOpen(false)}
          onUpdateNode={handleUpdateNode}
          onDeleteNode={handleDeleteNode}
        />

        {/* Test Run Drawer */}
        <TestRunDrawer
          workspaceId={workspaceId}
          workflowId={workflowId}
          workflowName={name}
          nodes={nodes}
          isOpen={isTestRunOpen}
          onClose={() => setIsTestRunOpen(false)}
        />
      </main>
    </div>
  );
}
