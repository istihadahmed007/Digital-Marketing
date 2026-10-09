import React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import {
  Users,
  Mail,
  Video,
  GitFork,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  FileText,
  ShieldCheck,
  Play,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo size="md" />

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <a href="#features" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              How It Works
            </a>
            <a href="#customers" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Customers
            </a>
            <a href="#shorts" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Shorts Studio
            </a>
            <a href="#campaigns" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Email Campaigns
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/25 transition-all"
            >
              <span>Open Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-20 md:pt-28 md:pb-28 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>The Simple Growth Platform for Modern Businesses</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-950 dark:text-white leading-[1.12]">
            Connect with customers, send emails, and create viral Shorts.
          </h1>

          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Everything you need to organize customer relationships, send email updates, and turn your videos into 30–60 second vertical clips for YouTube and Facebook.
          </p>

          {/* Clear Starting Actions */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <Link
              href="/contacts"
              className="flex items-center gap-2 px-5 py-3 text-sm font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all"
            >
              <Users className="w-4 h-4" />
              <span>Add a Customer</span>
            </Link>

            <Link
              href="/campaigns"
              className="flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 transition-all shadow-xs"
            >
              <Mail className="w-4 h-4 text-indigo-500" />
              <span>Create an Email</span>
            </Link>

            <Link
              href="/shorts"
              className="flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-100 transition-all shadow-xs"
            >
              <Video className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Make Shorts</span>
            </Link>
          </div>

          <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              No technical setup needed
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Private workspace data protection
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Official YouTube &amp; Facebook publishing
            </span>
          </div>
        </div>
      </section>

      {/* Core Working Modules */}
      <section id="features" className="py-20 px-6 border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/60">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
              Tools Built for Clarity &amp; Real Growth
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              Every tool is ready to use today. No confusing buzzwords or broken demos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1: Customers */}
            <div id="customers" className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-4 hover:border-indigo-500/50 transition-all">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Customer Directory &amp; Deals
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Keep your contacts, company accounts, sales opportunities, and website lead forms organized in one clean place.
              </p>
              <Link
                href="/contacts"
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline"
              >
                <span>View Customers</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Feature 2: Shorts Studio */}
            <div id="shorts" className="p-6 rounded-2xl border border-purple-200 dark:border-purple-800/80 bg-purple-50/30 dark:bg-purple-950/20 space-y-4 hover:border-purple-500/50 transition-all">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                <Video className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Shorts Studio
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Upload long landscape recordings. The studio transcribes speech, cuts 30–60s vertical clips, adds readable subtitles, and publishes to YouTube &amp; Facebook.
              </p>
              <Link
                href="/shorts"
                className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1 hover:underline"
              >
                <span>Open Shorts Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Feature 3: Campaigns */}
            <div id="campaigns" className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-4 hover:border-indigo-500/50 transition-all">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <Mail className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Email Announcements
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Draft beautiful email updates, announcements, and newsletters to stay in touch with your audience.
              </p>
              <Link
                href="/campaigns"
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline"
              >
                <span>Write an Email</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Feature 4: Follow-ups */}
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-4 hover:border-indigo-500/50 transition-all">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <GitFork className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Automated Follow-ups
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Automatically send confirmation emails and notify team members whenever a new customer submits a lead form.
              </p>
              <Link
                href="/automations"
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline"
              >
                <span>Setup Follow-ups</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 py-8 px-6 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <Logo size="sm" />
          <p>© {new Date().getFullYear()} NexusMark. Clear, all-in-one growth software.</p>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="hover:text-indigo-600">
              Home
            </Link>
            <Link href="/contacts" className="hover:text-indigo-600">
              Customers
            </Link>
            <Link href="/shorts" className="hover:text-indigo-600">
              Shorts Studio
            </Link>
            <Link href="/campaigns" className="hover:text-indigo-600">
              Campaigns
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
