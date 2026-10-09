'use client';

import React, { useState } from 'react';
import {
  WorkflowNodeType,
  NodeCategory,
  NodeTypeDefinition,
} from '@/lib/types/automation-flow';
import { NODE_DEFINITIONS } from '@/lib/automations/node-registry';
import {
  Search,
  X,
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
  Plus,
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

interface NodeLibraryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAddNode: (type: WorkflowNodeType) => void;
}

export function NodeLibraryDrawer({
  isOpen,
  onClose,
  onAddNode,
}: NodeLibraryDrawerProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  if (!isOpen) return null;

  const allDefinitions = Object.values(NODE_DEFINITIONS);

  const filtered = allDefinitions.filter((def) => {
    const matchesSearch =
      def.label.toLowerCase().includes(search.toLowerCase()) ||
      def.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || def.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories: Array<{ id: string; label: string }> = [
    { id: 'all', label: 'All Nodes' },
    { id: 'trigger', label: 'Triggers' },
    { id: 'action', label: 'Actions' },
    { id: 'logic', label: 'Logic' },
  ];

  const categoryBadges = {
    trigger: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    action: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    logic: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  };

  return (
    <div className="absolute top-0 left-0 bottom-0 w-80 bg-slate-900 border-r border-slate-800 z-30 shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">Node Library</h3>
          <p className="text-[11px] text-slate-400">Add steps to your automation graph</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search & Categories */}
      <div className="p-3 border-b border-slate-800 space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search nodes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
          />
        </div>

        <div className="flex gap-1">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCategory(c.id)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition ${
                selectedCategory === c.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Node List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            No matching nodes found.
          </div>
        ) : (
          filtered.map((nodeDef) => {
            const Icon = ICON_MAP[nodeDef.icon] || Play;
            return (
              <div
                key={nodeDef.type}
                onClick={() => {
                  onAddNode(nodeDef.type);
                  onClose();
                }}
                className="p-3 rounded-xl border border-slate-800/80 bg-slate-950/60 hover:bg-slate-800/80 hover:border-slate-700 transition cursor-pointer group flex items-start gap-3"
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border"
                  style={{
                    backgroundColor: `${nodeDef.color}15`,
                    borderColor: `${nodeDef.color}50`,
                    color: nodeDef.color,
                  }}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <h5 className="text-xs font-bold text-white group-hover:text-indigo-400 transition truncate">
                      {nodeDef.label}
                    </h5>
                    <span
                      className={`text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.2 rounded-full border shrink-0 ${
                        categoryBadges[nodeDef.category]
                      }`}
                    >
                      {nodeDef.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {nodeDef.description}
                  </p>
                </div>
                <Plus className="w-4 h-4 text-slate-600 group-hover:text-white transition shrink-0 mt-2" />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
