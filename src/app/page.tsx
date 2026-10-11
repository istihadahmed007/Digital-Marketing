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
  Compass,
  Globe,
  Radio,
  Clock,
  TrendingUp,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen text-[#17364A] dark:text-[#F0F9FF] flex flex-col font-sans selection:bg-[#167AA0] selection:text-white">
      {/* Top Navbar */}
      <header className="glass-header sticky top-0 z-40 border-b border-[#75D2EE]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Logo size="md" />

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-[#526D7D] dark:text-slate-300">
            <a href="#journey" className="hover:text-[#167AA0] dark:hover:text-[#75D2EE] transition-colors">
              Campaign Journey
            </a>
            <a href="#features" className="hover:text-[#167AA0] dark:hover:text-[#75D2EE] transition-colors">
              Tools &amp; Features
            </a>
            <a href="#customers" className="hover:text-[#167AA0] dark:hover:text-[#75D2EE] transition-colors">
              Customers &amp; CRM
            </a>
            <a href="#shorts" className="hover:text-[#167AA0] dark:hover:text-[#75D2EE] transition-colors">
              Video Studio
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-3.5 py-2 text-xs font-semibold text-[#17364A] dark:text-slate-200 hover:text-[#167AA0] dark:hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-[#167AA0] hover:bg-[#126383] text-white shadow-xs transition-all duration-140 glass-button-press focus-visible:ring-2 focus-visible:ring-[#75D2EE]"
            >
              <span>Open Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28 px-4 sm:px-6">
        {/* Soft atmospheric gradient highlights */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[380px] bg-gradient-to-tr from-[#D7F1FA]/60 via-[#EDF9FD]/40 to-[#75D2EE]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-pill text-[#167AA0] dark:text-sky-300 text-xs font-bold shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#167AA0]" />
            <span>The Clear, Professional Marketing Workspace for Non-Marketers</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-[#17364A] dark:text-white leading-[1.14]">
            Connect with customers, create Shorts, and steer your{' '}
            <span className="bg-gradient-to-r from-[#167AA0] via-[#0E7490] to-[#0284C7] bg-clip-text text-transparent">
              Campaign Journey
            </span>
            .
          </h1>

          <p className="text-base sm:text-lg text-[#526D7D] dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Everything your business needs: organized customer relationships, email broadcasts, AI-assisted vertical Shorts, and an interactive campaign journey that connects actions to real results.
          </p>

          {/* Clear Starting Actions */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
            <Link
              href="/campaigns/journey"
              className="flex items-center gap-2 px-5 py-3 text-sm font-bold rounded-xl bg-[#167AA0] hover:bg-[#126383] text-white shadow-xs transition-all duration-140 glass-button-press focus-visible:ring-2 focus-visible:ring-[#75D2EE]"
            >
              <Compass className="w-4 h-4 text-[#75D2EE]" />
              <span>Explore Campaign Journey</span>
            </Link>

            <Link
              href="/shorts"
              className="flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-xl glass-panel bg-white/70 hover:bg-white text-[#17364A] dark:text-white border border-[#75D2EE]/50 transition-all duration-140 shadow-xs preview-tile-3d"
            >
              <Video className="w-4 h-4 text-purple-600" />
              <span>Make Video Shorts</span>
            </Link>

            <Link
              href="/contacts"
              className="flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-xl glass-panel bg-white/70 hover:bg-white text-[#17364A] dark:text-white border border-[#75D2EE]/50 transition-all duration-140 shadow-xs preview-tile-3d"
            >
              <Users className="w-4 h-4 text-[#167AA0]" />
              <span>Manage Customers</span>
            </Link>
          </div>

          <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-[#526D7D] dark:text-slate-400 font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Transparent, ice-blue liquid glass interface
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Multi-tenant PostgreSQL row security
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Official YouTube &amp; Facebook publishing
            </span>
          </div>
        </div>
      </section>

      {/* Campaign Journey Overview Section */}
      <section id="journey" className="py-16 md:py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass-pill text-xs font-bold">
              <Compass className="w-3.5 h-3.5" />
              <span>Unified Campaign Progression</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#17364A] dark:text-white">
              Understand Your Marketing Across Four Clear Touchpoints
            </h2>
            <p className="text-xs sm:text-sm text-[#526D7D] dark:text-slate-400 leading-relaxed">
              Organize every customer interaction across Time, Channel, Customer Lifecycle, and Verified Outcome without confusion.
            </p>
          </div>

          {/* 4 Touchpoints Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-panel p-5 rounded-2xl border border-[#75D2EE]/45 shadow-xs space-y-2 preview-tile-3d">
              <div className="p-2.5 rounded-xl bg-[#D7F1FA] dark:bg-sky-950 text-[#167AA0] dark:text-sky-300 w-fit">
                <Clock className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[#17364A] dark:text-white">
                1. Timeline &amp; Schedule
              </h3>
              <p className="text-xs text-[#526D7D] dark:text-slate-400 leading-relaxed">
                Clear chronological timeline from scheduled video drops to active broadcasts and completed follow-ups.
              </p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-[#75D2EE]/45 shadow-xs space-y-2 preview-tile-3d">
              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 w-fit">
                <Radio className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[#17364A] dark:text-white">
                2. Connected Channels
              </h3>
              <p className="text-xs text-[#526D7D] dark:text-slate-400 leading-relaxed">
                Shorts Video Studio, Email Newsletters, Search rankings, Inbound Forms, and CRM Sales deals in harmony.
              </p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-[#75D2EE]/45 shadow-xs space-y-2 preview-tile-3d">
              <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 w-fit">
                <Users className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[#17364A] dark:text-white">
                3. Customer Journey
              </h3>
              <p className="text-xs text-[#526D7D] dark:text-slate-400 leading-relaxed">
                Guides prospects from first discovery through nurture, product consideration, and deal closing.
              </p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-[#75D2EE]/45 shadow-xs space-y-2 preview-tile-3d">
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 w-fit">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[#17364A] dark:text-white">
                4. Verified Outcomes
              </h3>
              <p className="text-xs text-[#526D7D] dark:text-slate-400 leading-relaxed">
                Real deliverability numbers, video virality scores, lead submissions, and closed deal revenues.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Working Modules */}
      <section id="features" className="py-16 md:py-24 px-4 sm:px-6 border-t border-[#75D2EE]/30">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#17364A] dark:text-white">
              Tools Built for Clarity &amp; Real Growth
            </h2>
            <p className="text-xs sm:text-sm text-[#526D7D] dark:text-slate-400">
              Every tool is genuine, functional, and connected to your database.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Feature 1: Customers */}
            <div id="customers" className="glass-panel p-6 rounded-3xl border border-[#75D2EE]/45 space-y-4 preview-tile-3d">
              <div className="w-10 h-10 rounded-xl bg-[#D7F1FA] dark:bg-sky-950 text-[#167AA0] dark:text-sky-400 flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#17364A] dark:text-white">
                Customer Directory &amp; Deals
              </h3>
              <p className="text-xs text-[#526D7D] dark:text-slate-400 leading-relaxed">
                Keep your contacts, company accounts, sales opportunities, and website lead forms organized in one clean place.
              </p>
              <Link
                href="/contacts"
                className="text-xs font-bold text-[#167AA0] dark:text-sky-400 flex items-center gap-1 hover:underline"
              >
                <span>View Customers</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Feature 2: Shorts Studio */}
            <div id="shorts" className="glass-panel p-6 rounded-3xl border border-[#75D2EE]/45 space-y-4 preview-tile-3d">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                <Video className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#17364A] dark:text-white">
                Shorts Video Studio
              </h3>
              <p className="text-xs text-[#526D7D] dark:text-slate-400 leading-relaxed">
                Upload long recordings or enter links. The studio transcribes speech, cuts 30–60s vertical clips, adds readable subtitles, and publishes to YouTube &amp; Facebook.
              </p>
              <Link
                href="/shorts"
                className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1 hover:underline"
              >
                <span>Open Video Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Feature 3: Campaigns */}
            <div className="glass-panel p-6 rounded-3xl border border-[#75D2EE]/45 space-y-4 preview-tile-3d">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <Mail className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#17364A] dark:text-white">
                Email Announcements
              </h3>
              <p className="text-xs text-[#526D7D] dark:text-slate-400 leading-relaxed">
                Draft beautiful email updates, announcements, and newsletters with real deliverability statistics.
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
            <div className="glass-panel p-6 rounded-3xl border border-[#75D2EE]/45 space-y-4 preview-tile-3d">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <GitFork className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#17364A] dark:text-white">
                Automated Follow-ups
              </h3>
              <p className="text-xs text-[#526D7D] dark:text-slate-400 leading-relaxed">
                Automatically send confirmation emails and notify team members whenever a new customer submits a lead form.
              </p>
              <Link
                href="/automations"
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 hover:underline"
              >
                <span>Setup Follow-ups</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#75D2EE]/30 py-8 px-4 sm:px-6 glass-header">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#526D7D] dark:text-slate-400">
          <Logo size="sm" />
          <p>© {new Date().getFullYear()} NexusMark. Clear marketing workspace.</p>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="hover:text-[#167AA0]">
              Overview
            </Link>
            <Link href="/campaigns/journey" className="hover:text-[#167AA0]">
              Campaign Journey
            </Link>
            <Link href="/contacts" className="hover:text-[#167AA0]">
              Customers
            </Link>
            <Link href="/shorts" className="hover:text-[#167AA0]">
              Video Studio
            </Link>
            <Link href="/campaigns" className="hover:text-[#167AA0]">
              Campaigns
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
