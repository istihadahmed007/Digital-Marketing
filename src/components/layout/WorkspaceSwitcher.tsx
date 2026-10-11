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
        className="w-full flex items-center justify-between p-2.5 rounded-xl border border-sky-200/80 dark:border-sky-800/80 bg-white/70 dark:bg-slate-900/70 hover:bg-white dark:hover:bg-slate-800 transition-all text-left group shadow-xs cursor-pointer"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-950/70 border border-sky-200 dark:border-sky-800/50 flex items-center justify-center text-sky-700 dark:text-sky-300 shrink-0 font-bold text-xs uppercase">
            {activeWorkspace ? activeWorkspace.name.substring(0, 2) : <Building2 className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {activeWorkspace ? activeWorkspace.name : 'Select Workspace'}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
              {activeWorkspace ? activeWorkspace.slug : 'No workspace'}
            </p>
          </div>
        </div>
        <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 shrink-0 transition-transform duration-200" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1.5 p-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-sky-200 dark:border-sky-800 rounded-2xl shadow-xl z-40 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Workspaces ({workspaces.length})
            </div>

            <div className="max-h-48 overflow-y-auto space-y-0.5">
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => handleSelect(ws)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-xl transition-colors cursor-pointer ${
                    ws.id === activeWorkspace?.id
                      ? 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 font-bold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-sky-50/50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="truncate">{ws.name}</span>
                  {ws.id === activeWorkspace?.id && <Check className="w-3.5 h-3.5 shrink-0 text-sky-600" />}
                </button>
              ))}
            </div>

            <div className="mt-1 pt-1 border-t border-sky-100 dark:border-sky-800">
              <Link
                href="/workspaces/new"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-sky-600 dark:text-sky-400 font-semibold hover:bg-sky-50 dark:hover:bg-slate-800 rounded-lg transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Workspace</span>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
