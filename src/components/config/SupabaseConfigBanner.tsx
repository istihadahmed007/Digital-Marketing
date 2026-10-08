'use client';

import React, { useState } from 'react';
import { AlertTriangle, Key, ExternalLink, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

interface SupabaseConfigBannerProps {
  isConfigured: boolean;
}

export function SupabaseConfigBanner({ isConfigured }: SupabaseConfigBannerProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  if (isConfigured) {
    return null;
  }

  const handleCopyEnv = () => {
    navigator.clipboard.writeText(`NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co\nNEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/30 text-amber-900 dark:text-amber-200 px-4 py-3 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 rounded-lg text-amber-600 dark:text-amber-400 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">
              Supabase Backend Credentials Needed
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              NexusMark is ready with strict RLS and multi-tenancy. Connect your Supabase project in <code className="bg-amber-500/20 px-1 py-0.5 rounded font-mono">.env.local</code> to activate live authentication and PostgreSQL persistence.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-200 rounded-lg transition-colors cursor-pointer"
          >
            <Key className="w-3.5 h-3.5" />
            <span>Setup Instructions</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <a
            href="https://supabase.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors shadow-sm"
          >
            <span>Supabase Console</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {expanded && (
        <div className="max-w-7xl mx-auto mt-4 pt-3 border-t border-amber-500/20 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-white/60 dark:bg-slate-900/60 p-3 rounded-lg border border-amber-500/20">
            <h4 className="font-semibold mb-1 flex items-center gap-1 text-slate-800 dark:text-slate-200">
              1. Create Supabase Project
            </h4>
            <p className="text-slate-600 dark:text-slate-400">
              Sign up or log in at supabase.com and create a free project. Note down your Project URL and Anon API key from Project Settings → API.
            </p>
          </div>

          <div className="bg-white/60 dark:bg-slate-900/60 p-3 rounded-lg border border-amber-500/20">
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-semibold text-slate-800 dark:text-slate-200">2. Configure .env.local</h4>
              <button
                onClick={handleCopyEnv}
                className="flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy sample'}
              </button>
            </div>
            <p className="text-slate-600 dark:text-slate-400 font-mono text-[11px] bg-slate-100 dark:bg-slate-800 p-1.5 rounded">
              NEXT_PUBLIC_SUPABASE_URL=...<br />
              NEXT_PUBLIC_SUPABASE_ANON_KEY=...
            </p>
          </div>

          <div className="bg-white/60 dark:bg-slate-900/60 p-3 rounded-lg border border-amber-500/20">
            <h4 className="font-semibold mb-1 text-slate-800 dark:text-slate-200">3. Run SQL Migration</h4>
            <p className="text-slate-600 dark:text-slate-400">
              Paste <code className="text-indigo-600 dark:text-indigo-400 font-mono">supabase/migrations/20261007000000_phase1_crm_schema.sql</code> into your Supabase SQL Editor and click Run. All tables and RLS policies will be instantly initialized.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
