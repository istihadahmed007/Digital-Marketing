'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createWorkspace } from '@/lib/actions/workspaces';
import { Building2, Loader2, Sparkles, ArrowRight } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';

export default function NewWorkspacePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await createWorkspace(name.trim());
      if (!res.success || !res.workspace) {
        setError(res.error || 'Failed to create workspace');
        setLoading(false);
        return;
      }

      // Set cookie and local storage
      localStorage.setItem('nexusmark_active_workspace', res.workspace.id);
      document.cookie = `nexusmark_active_workspace=${res.workspace.id}; path=/; max-age=31536000`;

      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EDF9FD] via-[#F8FDFF] to-[#D7F1FA] dark:from-[#0a1824] dark:via-[#102434] dark:to-[#0a1824] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Ambient background glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-[#75D2EE]/25 blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-[#167AA0]/15 blur-3xl pointer-events-none translate-x-1/3 translate-y-1/3" />

      <div className="w-full max-w-md space-y-6 relative z-10 animate-in fade-in zoom-in-95 duration-200">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Logo size="lg" />
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#75D2EE]/15 border border-[#75D2EE]/30 flex items-center justify-center text-[#167AA0] dark:text-[#75D2EE] mx-auto mb-3 shadow-xs">
            <Building2 className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#17364A] dark:text-white">
            Create Your Workspace
          </h1>
          <p className="text-xs text-[#526D7D] dark:text-slate-300 mt-1 max-w-xs mx-auto">
            Every CRM contact, deal, company, and campaign belongs strictly to your isolated workspace.
          </p>
        </div>

        <div className="p-8 rounded-3xl glass-panel-opaque border border-[#75D2EE]/40 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 rounded-xl">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#17364A] dark:text-slate-300 mb-1">
                Workspace / Organization Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Acme Marketing, Alpha Global"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#75D2EE]/30 dark:border-slate-700 bg-white/80 dark:bg-slate-800 text-[#17364A] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#167AA0]"
              />
            </div>

            <div className="p-3 rounded-xl bg-[#D7F1FA]/35 dark:bg-slate-800/50 border border-[#75D2EE]/25 flex items-start gap-2.5 text-[11px] text-[#526D7D] dark:text-slate-300">
              <Sparkles className="w-4 h-4 text-[#167AA0] dark:text-[#75D2EE] shrink-0 mt-0.5" />
              <span>
                You will automatically become the <strong>Owner</strong> of this workspace with full team management rights.
              </span>
            </div>

            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex items-center justify-center gap-2 w-full py-3 text-xs font-bold rounded-xl bg-[#167AA0] hover:bg-[#0E526E] text-white shadow-md shadow-[#167AA0]/20 glass-button-press transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <span>Launch Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
