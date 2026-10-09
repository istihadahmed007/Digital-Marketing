'use client';

import React, { useState, useEffect } from 'react';
import {
  AutomationWorkflow,
  AutomationTriggerType,
  AutomationStep,
} from '@/lib/types/crm';
import { createWorkflow, updateWorkflow } from '@/lib/actions/automations';
import {
  X,
  GitFork,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  Mail,
  CheckSquare,
  Tag,
  Globe,
  ArrowDown,
} from 'lucide-react';

interface AutomationModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  workflowToEdit?: AutomationWorkflow | null;
  onSuccess: () => void;
}

export function AutomationModal({
  isOpen,
  onClose,
  workspaceId,
  workflowToEdit,
  onSuccess,
}: AutomationModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] =
    useState<AutomationTriggerType>('form_submission');
  const [isActive, setIsActive] = useState(true);

  const defaultSteps: AutomationStep[] = [
    {
      id: 'step-1',
      type: 'send_email',
      title: 'Send Welcome Email',
      config: { subject: 'Thanks for connecting with us!' },
    },
    {
      id: 'step-2',
      type: 'create_task',
      title: 'Schedule Sales Discovery Task',
      config: { task_title: 'Review inbound lead details', priority: 'high' },
    },
    {
      id: 'step-3',
      type: 'add_tag',
      title: 'Tag Contact as Inbound Qualified',
      config: { tag: 'mql-inbound' },
    },
  ];

  const [steps, setSteps] = useState<AutomationStep[]>(defaultSteps);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (workflowToEdit) {
      setName(workflowToEdit.name);
      setDescription(workflowToEdit.description || '');
      setTriggerType(workflowToEdit.trigger_type);
      setIsActive(workflowToEdit.is_active);
      setSteps(
        Array.isArray(workflowToEdit.steps) && workflowToEdit.steps.length > 0
          ? workflowToEdit.steps
          : defaultSteps
      );
    } else {
      setName('');
      setDescription('');
      setTriggerType('form_submission');
      setIsActive(true);
      setSteps(defaultSteps);
    }
    setError(null);
  }, [workflowToEdit, isOpen]);

  const handleAddStep = (type: AutomationStep['type']) => {
    const newStep: AutomationStep = {
      id: `step-${Date.now()}`,
      type,
      title:
        type === 'send_email'
          ? 'Send Automated Notification'
          : type === 'create_task'
          ? 'Create Follow-up Task'
          : type === 'add_tag'
          ? 'Add CRM Tag'
          : 'Trigger Outbound Webhook',
      config: {},
    };
    setSteps((prev) => [...prev, newStep]);
  };

  const handleRemoveStep = (id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  };

  const handleStepTitleChange = (id: string, newTitle: string) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title: newTitle } : s))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Workflow name is required.');
      return;
    }

    if (steps.length === 0) {
      setError('Please add at least one action step.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (workflowToEdit) {
        const res = await updateWorkflow(workspaceId, workflowToEdit.id, {
          name,
          description: description || null,
          trigger_type: triggerType,
          steps,
          is_active: isActive,
        });

        if (!res.success) {
          setError(res.error || 'Failed to update workflow');
          setLoading(false);
          return;
        }
      } else {
        const res = await createWorkflow(workspaceId, {
          name,
          description: description || undefined,
          trigger_type: triggerType,
          steps,
          is_active: isActive,
        });

        if (!res.success) {
          setError(res.error || 'Failed to create workflow');
          setLoading(false);
          return;
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <GitFork className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {workflowToEdit ? 'Edit Workflow' : 'Build Automation Workflow'}
              </h2>
              <p className="text-xs text-slate-500">
                Trigger automated actions across contacts, tasks, and outbound notifications
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Workflow Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Inbound Demo Request Onboarding"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary of workflow objective"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Trigger Selection */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-2 border border-slate-200 dark:border-slate-700/60">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                1. Trigger Event (When this happens)
              </label>
              <select
                value={triggerType}
                onChange={(e) => setTriggerType(e.target.value as AutomationTriggerType)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              >
                <option value="form_submission">Form Submitted (New lead captures)</option>
                <option value="contact_created">Contact Created (New prospect added)</option>
                <option value="contact_updated">Contact Updated (Profile/Lifecycle change)</option>
                <option value="deal_stage_changed">Deal Stage Changed (e.g. Won or Proposal)</option>
                <option value="tag_added">Tag Added to Contact</option>
                <option value="schedule">Scheduled / Time Trigger (Periodic automation)</option>
                <option value="webhook_incoming">Incoming Webhook (External API triggers)</option>
                <option value="manual">Manual Execution (On-demand runs)</option>
              </select>
            </div>
          </div>

          {/* Sequential Steps Builder */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                2. Actions Pipeline (Do these in sequence)
              </label>
            </div>

            <div className="space-y-2">
              {steps.map((step, idx) => (
                <div key={step.id}>
                  {idx > 0 && (
                    <div className="flex justify-center py-1">
                      <ArrowDown className="w-4 h-4 text-slate-400" />
                    </div>
                  )}
                  <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-2.5 flex-1">
                      <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0">
                        {step.type === 'send_email' && <Mail className="w-4 h-4" />}
                        {step.type === 'create_task' && <CheckSquare className="w-4 h-4" />}
                        {step.type === 'add_tag' && <Tag className="w-4 h-4" />}
                        {step.type === 'webhook' && <Globe className="w-4 h-4" />}
                      </div>
                      <input
                        type="text"
                        value={step.title}
                        onChange={(e) => handleStepTitleChange(step.id, e.target.value)}
                        className="flex-1 text-xs font-semibold bg-transparent border-0 focus:ring-0 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveStep(step.id)}
                      className="p-1 text-slate-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Step Buttons */}
            <div className="pt-2">
              <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                Add Step:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleAddStep('send_email')}
                  className="px-2.5 py-1 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 flex items-center gap-1 transition"
                >
                  <Mail className="w-3 h-3 text-blue-500" /> Email Action
                </button>
                <button
                  type="button"
                  onClick={() => handleAddStep('create_task')}
                  className="px-2.5 py-1 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 flex items-center gap-1 transition"
                >
                  <CheckSquare className="w-3 h-3 text-emerald-500" /> Follow-up Task
                </button>
                <button
                  type="button"
                  onClick={() => handleAddStep('add_tag')}
                  className="px-2.5 py-1 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 flex items-center gap-1 transition"
                >
                  <Tag className="w-3 h-3 text-purple-500" /> Add Tag
                </button>
                <button
                  type="button"
                  onClick={() => handleAddStep('webhook')}
                  className="px-2.5 py-1 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 flex items-center gap-1 transition"
                >
                  <Globe className="w-3 h-3 text-amber-500" /> Webhook Ping
                </button>
              </div>
            </div>
          </div>

          {/* Active switch */}
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
            <div>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                Enable Workflow
              </span>
              <p className="text-xs text-slate-500">
                Active workflows trigger immediately upon matched events
              </p>
            </div>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {workflowToEdit ? 'Save Changes' : 'Create Workflow'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
