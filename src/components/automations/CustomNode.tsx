'use client';

import React from 'react';
import { WorkflowNode, WorkflowNodeType } from '@/lib/types/automation-flow';
import { NODE_DEFINITIONS } from '@/lib/automations/node-registry';
import {
  Play,
  UserPlus,
  UserCheck,
  FileText,
  Briefcase,
  Tag,
  Clock,
  Radio,
  CheckSquare,
  UserCog,
  Tags,
  TrendingUp,
  Mail,
  Send,
  GitFork,
  Hourglass,
  Square,
  Settings,
  Trash2,
  AlertCircle,
  Copy,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  Play,
  UserPlus,
  UserCheck,
  FileText,
  Briefcase,
  Tag,
  Clock,
  Radio,
  CheckSquare,
  UserCog,
  Tags,
  TrendingUp,
  Mail,
  Send,
  GitFork,
  Hourglass,
  Square,
};

interface CustomNodeProps {
  node: WorkflowNode;
  isSelected: boolean;
  onSelect: (nodeId: string) => void;
  onOpenSettings: (node: WorkflowNode) => void;
  onDelete: (nodeId: string) => void;
  onDuplicate: (node: WorkflowNode) => void;
  onStartConnect: (nodeId: string, handleId: string) => void;
  onEndConnect: (nodeId: string, handleId: string) => void;
  isConnectingFrom?: { nodeId: string; handleId: string } | null;
}

export function CustomNode({
  node,
  isSelected,
  onSelect,
  onOpenSettings,
  onDelete,
  onDuplicate,
  onStartConnect,
  onEndConnect,
  isConnectingFrom,
}: CustomNodeProps) {
  const def = NODE_DEFINITIONS[node.type] || NODE_DEFINITIONS.manual;
  const IconComponent = ICON_MAP[def.icon] || Play;

  // Validation: Check if any required field is empty
  const missingRequired = def.fields.some((f) => {
    if (!f.required) return false;
    const val = node.data?.[f.name];
    return val === undefined || val === null || String(val).trim() === '';
  });

  const categoryColors = {
    trigger: 'border-violet-500/80 bg-violet-500/10 text-violet-400',
    action: 'border-sky-500/80 bg-sky-500/10 text-sky-400',
    logic: 'border-emerald-500/80 bg-emerald-500/10 text-emerald-400',
  };

  const badgeColors = {
    trigger: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    action: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    logic: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  };

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node.id);
      }}
      className={`group relative min-w-[240px] max-w-[280px] rounded-2xl border transition-all duration-150 select-none cursor-pointer ${
        isSelected
          ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-950 shadow-xl shadow-indigo-500/20 border-indigo-400 bg-slate-900'
          : 'border-slate-800 bg-slate-900/90 hover:border-slate-700 hover:bg-slate-900 shadow-md'
      }`}
    >
      {/* Top Handle / Inflow (for Actions and Logic) */}
      {def.inputs.map((input) => (
        <div
          key={input.id}
          title={`Inflow: ${input.label}`}
          onClick={(e) => {
            e.stopPropagation();
            onEndConnect(node.id, input.id);
          }}
          className={`absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
            isConnectingFrom && isConnectingFrom.nodeId !== node.id
              ? 'bg-indigo-500 border-white scale-125 animate-pulse shadow-md shadow-indigo-500/50'
              : 'bg-slate-800 border-slate-600 hover:bg-indigo-500 hover:border-white'
          }`}
        >
          <div className="w-2 h-2 rounded-full bg-white" />
        </div>
      ))}

      {/* Node Header */}
      <div className="p-3.5 pb-2.5">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center border shrink-0 ${
                categoryColors[def.category]
              }`}
            >
              <IconComponent className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span
                className={`text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded-full border ${
                  badgeColors[def.category]
                }`}
              >
                {def.category}
              </span>
            </div>
          </div>

          {/* Quick Actions (visible on hover or when selected) */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenSettings(node);
              }}
              title="Configure Node"
              className="p-1 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate(node);
              }}
              title="Duplicate Node"
              className="p-1 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(node.id);
              }}
              title="Delete Node"
              className="p-1 hover:bg-rose-950/80 rounded-md text-slate-400 hover:text-rose-400 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <h4 className="text-xs font-bold text-white truncate">{node.label || def.label}</h4>
        <p className="text-[11px] text-slate-400 truncate mt-0.5">
          {node.data?.subject ||
            node.data?.task_title ||
            node.data?.url ||
            node.data?.field ||
            def.description}
        </p>

        {/* Validation Warning */}
        {missingRequired && (
          <div className="mt-2 flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span className="truncate">Configuration incomplete</span>
          </div>
        )}
      </div>

      {/* Node Bottom Outputs / Handles */}
      {def.outputs.length > 0 && (
        <div className="pt-2 pb-2.5 px-3 border-t border-slate-800/80 bg-slate-950/40 rounded-b-2xl flex items-center justify-between">
          {def.outputs.map((out) => (
            <div key={out.id} className="relative flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
              <span className="truncate">{out.label}</span>
              <button
                type="button"
                title={`Connect from ${out.label}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onStartConnect(node.id, out.id);
                }}
                className="w-4 h-4 rounded-full border-2 border-slate-600 bg-slate-800 hover:bg-indigo-500 hover:border-white transition flex items-center justify-center cursor-crosshair group-hover:scale-110"
              >
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: out.color || '#8b5cf6' }}
                />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
