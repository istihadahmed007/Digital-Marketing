'use client';

import React, { useState } from 'react';
import {
  WorkflowNode,
  NodeFieldSchema,
} from '@/lib/types/automation-flow';
import { NODE_DEFINITIONS } from '@/lib/automations/node-registry';
import { resolveExpressions } from '@/lib/automations/expression-resolver';
import {
  X,
  Sparkles,
  HelpCircle,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Code,
  Tag,
} from 'lucide-react';

interface NodeSettingsDrawerProps {
  node: WorkflowNode | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateNode: (updatedNode: WorkflowNode) => void;
  onDeleteNode: (nodeId: string) => void;
}

const SAMPLE_CONTEXT = {
  trigger: {
    type: 'contact_created',
    email: 'alex.sample@nexusmark.test',
    contact: {
      id: 'cnt_sample_123',
      first_name: 'Alex',
      last_name: 'Johnson',
      email: 'alex.sample@nexusmark.test',
      phone: '+1 555-0192',
      lead_score: 85,
      lifecycle_stage: 'lead',
      company_name: 'Acme Growth Labs',
    },
    deal: {
      id: 'deal_sample_456',
      title: 'Enterprise Growth Package',
      amount: 15000,
      stage: 'proposal',
    },
    timestamp: '2026-10-09T00:00:00Z',
  },
  workflow: {
    name: 'Inbound Growth Accelerator',
  },
};

const SUGGESTED_TOKENS = [
  { token: '{{trigger.contact.first_name}}', label: 'First Name', preview: 'Alex' },
  { token: '{{trigger.contact.last_name}}', label: 'Last Name', preview: 'Johnson' },
  { token: '{{trigger.contact.email}}', label: 'Email', preview: 'alex.sample@nexusmark.test' },
  { token: '{{trigger.contact.lead_score}}', label: 'Lead Score', preview: '85' },
  { token: '{{trigger.contact.company_name}}', label: 'Company', preview: 'Acme Growth Labs' },
  { token: '{{trigger.deal.title}}', label: 'Deal Title', preview: 'Enterprise Growth Package' },
  { token: '{{trigger.deal.amount}}', label: 'Deal Amount', preview: '$15,000' },
  { token: '{{trigger.deal.stage}}', label: 'Deal Stage', preview: 'proposal' },
];

export function NodeSettingsDrawer({
  node,
  isOpen,
  onClose,
  onUpdateNode,
  onDeleteNode,
}: NodeSettingsDrawerProps) {
  const [activeTokenField, setActiveTokenField] = useState<string | null>(null);

  if (!isOpen || !node) return null;

  const def = NODE_DEFINITIONS[node.type] || NODE_DEFINITIONS.manual;
  const data = node.data || {};

  const handleFieldChange = (fieldName: string, value: any) => {
    const updated = {
      ...node,
      data: {
        ...data,
        [fieldName]: value,
      },
    };
    onUpdateNode(updated);
  };

  const handleLabelChange = (newLabel: string) => {
    onUpdateNode({
      ...node,
      label: newLabel,
    });
  };

  const handleInsertToken = (fieldName: string, token: string) => {
    const currentVal = data[fieldName] || '';
    handleFieldChange(fieldName, `${currentVal} ${token}`.trim());
  };

  return (
    <div className="absolute top-0 right-0 bottom-0 w-96 bg-slate-900 border-l border-slate-800 z-30 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full border"
              style={{
                backgroundColor: `${def.color}20`,
                borderColor: `${def.color}40`,
                color: def.color,
              }}
            >
              {def.category}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">ID: {node.id}</span>
          </div>
          <input
            type="text"
            value={node.label || def.label}
            onChange={(e) => handleLabelChange(e.target.value)}
            className="text-sm font-bold text-white bg-transparent border-b border-transparent hover:border-slate-700 focus:border-indigo-500 focus:outline-hidden py-0.5"
            placeholder="Node Label"
          />
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Description */}
      <div className="px-4 py-2.5 bg-slate-950/60 border-b border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
        <HelpCircle className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
        <span>{def.description}</span>
      </div>

      {/* Form Fields */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {def.fields.map((field) => {
          const value = data[field.name] ?? field.defaultValue ?? '';
          const isInvalid = field.required && (value === undefined || value === null || String(value).trim() === '');

          return (
            <div key={field.name} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-200 flex items-center gap-1">
                  <span>{field.label}</span>
                  {field.required && <span className="text-rose-400">*</span>}
                </label>

                {field.supportsExpressions && (
                  <button
                    type="button"
                    onClick={() =>
                      setActiveTokenField(
                        activeTokenField === field.name ? null : field.name
                      )
                    }
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Insert Token</span>
                  </button>
                )}
              </div>

              {/* Token Picker Dropdown */}
              {field.supportsExpressions && activeTokenField === field.name && (
                <div className="p-2.5 rounded-xl bg-slate-950 border border-indigo-500/30 space-y-2 animate-in fade-in duration-150">
                  <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block">
                    Available Trigger Tokens:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {SUGGESTED_TOKENS.map((t) => (
                      <button
                        key={t.token}
                        type="button"
                        onClick={() => handleInsertToken(field.name, t.token)}
                        className="px-2 py-1 text-[10px] font-mono rounded-lg bg-slate-900 hover:bg-indigo-950/80 text-slate-300 hover:text-indigo-300 border border-slate-800 hover:border-indigo-500/50 transition"
                        title={`Sample value: ${t.preview}`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Field Control */}
              {field.type === 'select' ? (
                <select
                  value={value}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-hidden focus:border-indigo-500"
                >
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : field.type === 'textarea' ? (
                <textarea
                  rows={4}
                  value={value}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-hidden focus:border-indigo-500"
                />
              ) : field.type === 'number' ? (
                <input
                  type="number"
                  value={value}
                  onChange={(e) => handleFieldChange(field.name, Number(e.target.value))}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-hidden focus:border-indigo-500"
                />
              ) : (
                <input
                  type="text"
                  value={value}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-hidden focus:border-indigo-500"
                />
              )}

              {/* Description & Validation */}
              {field.description && (
                <p className="text-[11px] text-slate-500 leading-tight">
                  {field.description}
                </p>
              )}

              {/* Live Preview for Expressions */}
              {field.supportsExpressions && typeof value === 'string' && value.includes('{{') && (
                <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                    Resolved Sample Preview:
                  </span>
                  <p className="text-indigo-300 font-mono text-[11px] break-all">
                    {resolveExpressions(value, SAMPLE_CONTEXT)}
                  </p>
                </div>
              )}

              {isInvalid && (
                <span className="text-[10px] text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  This field is required
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            onDeleteNode(node.id);
            onClose();
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-xl transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete Node</span>
        </button>

        <button
          type="button"
          onClick={onClose}
          className="px-4 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition shadow-xs"
        >
          Done
        </button>
      </div>
    </div>
  );
}
