'use client';

import React, { useState } from 'react';
import { Workspace } from '@/lib/types/crm';
import { Building2, ChevronDown, Plus, Check } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface WorkspaceSwitcherProps {
  workspaces: Workspace[];
  currentWorkspaceId?: string;
}

function persistWorkspace(id: string) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('nexusmark_active_workspace', id);
      document.cookie = `nexusmark_active_workspace=${id}; path=/; max-age=31536000`;
    } catch {
      // storage unavailable
    }
  }
}

export function WorkspaceSwitcher({
  workspaces,
  currentWorkspaceId,
}: WorkspaceSwitcherProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('nexusmark_active_workspace');
      if (stored && workspaces.some((w) => w.id === stored)) {
        return stored;
      }
    }
    return currentWorkspaceId || (workspaces[0]?.id ?? '');
  });

  const activeWorkspace =
    workspaces.find((w) => w.id === selectedId) || workspaces[0];

  const handleSelect = (ws: Workspace) => {
    setSelectedId(ws.id);
    setIsOpen(false);
    persistWorkspace(ws.id);
    router.refresh();
  };

  return (
    <div className="relative w-full">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all text-left group shadow-xs cursor-pointer"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 font-bold text-xs uppercase">
            {activeWorkspace ? activeWorkspace.name.substring(0, 2) : <Building2 className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
              {activeWorkspace ? activeWorkspace.name : 'Select Workspace'}
            </p>
            <p className="text-[10px] text-slate-600 dark:text-slate-400 truncate">
              {activeWorkspace ? activeWorkspace.slug : 'No workspace'}
            </p>
          </div>
        </div>
        <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 shrink-0 transition-transform duration-200" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1.5 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-40 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Workspaces ({workspaces.length})
            </div>

            <div className="max-h-48 overflow-y-auto space-y-0.5">
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => handleSelect(ws)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-lg transition-colors cursor-pointer ${
                    ws.id === activeWorkspace?.id
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="truncate">{ws.name}</span>
                  {ws.id === activeWorkspace?.id && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              ))}
            </div>

            <div className="mt-1 pt-1 border-t border-slate-100 dark:border-slate-800">
              <Link
                href="/workspaces/new"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Workspace</span>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
