'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Logo } from '@/components/brand/Logo';
import { Loader2, ArrowRight, AlertCircle } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectedFrom = searchParams.get('redirectedFrom') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    if (!supabase) {
      setError(
        'Supabase backend credentials are missing. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env.local file.'
      );
      setLoading(false);
      return;
    }

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      if (data.session) {
        router.push(redirectedFrom);
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 rounded-xl flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-[#17364A] dark:text-slate-300 mb-1">
          Email Address
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#75D2EE]/40 bg-white/90 dark:bg-slate-900/90 text-[#17364A] dark:text-white placeholder-[#526D7D]/60 focus:outline-none focus:ring-2 focus:ring-[#167AA0] transition shadow-xs"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-semibold text-[#17364A] dark:text-slate-300">
            Password
          </label>
          <Link
            href="/forgot-password"
            className="text-[11px] text-[#167AA0] dark:text-[#75D2EE] font-medium hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••••••"
          className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#75D2EE]/40 bg-white/90 dark:bg-slate-900/90 text-[#17364A] dark:text-white placeholder-[#526D7D]/60 focus:outline-none focus:ring-2 focus:ring-[#167AA0] transition shadow-xs"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="flex items-center justify-center gap-2 w-full py-2.5 text-xs font-bold rounded-xl bg-[#167AA0] hover:bg-[#126484] text-white shadow-md shadow-[#167AA0]/20 transition-all disabled:opacity-50 cursor-pointer glass-button-press"
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <>
            <span>Sign In</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </>
        )}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-gradient-to-br from-[#F8FDFF] via-[#EDF9FD] to-[#D7F1FA] text-[#17364A]">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="flex justify-center mb-3">
            <Logo size="lg" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#17364A] dark:text-white">
            Welcome back
          </h1>
          <p className="text-xs text-[#526D7D] dark:text-slate-400 mt-1">
            Sign in to access your marketing workspace and CRM data
          </p>
        </div>

        <div className="p-6 sm:p-8 rounded-3xl border border-[#75D2EE]/30 glass-panel-opaque shadow-[0_20px_60px_rgba(22,122,160,0.12)]">
          <Suspense
            fallback={
              <div className="py-8 flex justify-center text-[#167AA0]">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            }
          >
            <LoginForm />
          </Suspense>

          <div className="mt-4 pt-4 border-t border-[#D7F1FA] dark:border-slate-800 text-center text-xs text-[#526D7D] dark:text-slate-400">
            Don&apos;t have an account yet?{' '}
            <Link
              href="/register"
              className="font-bold text-[#167AA0] dark:text-[#75D2EE] hover:underline"
            >
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
