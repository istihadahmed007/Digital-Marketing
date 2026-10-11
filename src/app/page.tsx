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
  Compass,
  Globe,
  Radio,
  Layers,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Navbar */}
      <header className="glass-header sticky top-0 z-40 border-b border-sky-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Logo size="md" />

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <a href="#journey" className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
              4D Journey
            </a>
            <a href="#features" className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
              Features
            </a>
            <a href="#customers" className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
              Customers
            </a>
            <a href="#shorts" className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
              Video Studio
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition-all"
            >
              <span>Open Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28 px-4 sm:px-6">
        {/* Soft atmospheric gradient circle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-sky-200/40 via-blue-100/30 to-indigo-100/20 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-pill text-sky-800 dark:text-sky-300 text-xs font-bold shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-sky-600" />
            <span>The Clear, Professional Marketing Workspace for Non-Marketers</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-950 dark:text-white leading-[1.12]">
            Connect with customers, create Shorts, and steer your <span className="bg-gradient-to-r from-sky-600 to-blue-700 bg-clip-text text-transparent">4D Campaign Journey</span>.
          </h1>

          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Everything your business needs: organized customer relationships, email broadcasts, AI-assisted vertical Shorts, and an interactive 4D campaign view that connects actions to real results.
          </p>

          {/* Clear Starting Actions */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
            <Link
              href="/campaigns/journey"
              className="flex items-center gap-2 px-5 py-3 text-sm font-bold rounded-xl bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition-all"
            >
              <Compass className="w-4 h-4" />
              <span>Explore 4D Campaign Journey</span>
            </Link>

            <Link
              href="/shorts"
              className="flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-xl glass-panel text-purple-700 dark:text-purple-300 hover:bg-purple-50 transition-all shadow-xs"
            >
              <Video className="w-4 h-4 text-purple-600" />
              <span>Make Video Shorts</span>
            </Link>

            <Link
              href="/contacts"
              className="flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-xl glass-panel text-slate-800 dark:text-slate-200 hover:bg-sky-50 transition-all shadow-xs"
            >
              <Users className="w-4 h-4 text-sky-600" />
              <span>Manage Customers</span>
            </Link>
          </div>

          <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Transparent, ice-blue glass interface
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              True multi-tenant PostgreSQL protection
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Official YouTube &amp; Facebook publishing
            </span>
          </div>
        </div>
      </section>

      {/* 4D Campaign Journey Showcase Section */}
      <section id="journey" className="py-16 md:py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass-pill text-xs font-bold">
              <Compass className="w-3.5 h-3.5" />
              <span>The 4D Marketing Model</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-950 dark:text-white">
              Understand Your Marketing Across Four Clear Coordinates
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              No technical buzzwords or imaginary physics. The 4D model organizes every real activity by Time, Channel, Customer Stage, and Verified Outcome.
            </p>
          </div>

          {/* 4 Coordinates Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-panel p-5 rounded-2xl border border-sky-200/70 shadow-xs space-y-2 glass-panel-interactive">
              <div className="p-2.5 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 w-fit">
                <span className="font-bold text-xs">1. Time Axis</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Scheduled, Live, or Done
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Clear chronological timeline from upcoming scheduled broadcasts to currently running campaigns and completed activities.
              </p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-sky-200/70 shadow-xs space-y-2 glass-panel-interactive">
              <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 w-fit">
                <span className="font-bold text-xs">2. Channel Axis</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                All Connected Channels
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Video Studio, Email Campaigns, SEO rankings, Inbound Lead Forms, and CRM Sales pipeline under one roof.
              </p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-sky-200/70 shadow-xs space-y-2 glass-panel-interactive">
              <div className="p-2.5 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 w-fit">
                <span className="font-bold text-xs">3. Customer Stage</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Discover → Consider → Convert
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Guides prospects from discovering your brand through awareness, nurturing interest, and converting into customers.
              </p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-sky-200/70 shadow-xs space-y-2 glass-panel-interactive">
              <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 w-fit">
                <span className="font-bold text-xs">4. Verified Outcome</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Real Numbers Only
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Live delivery counts, open rates, video virality scores, lead form inquiries, and closed sales dollar amounts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Working Modules */}
      <section id="features" className="py-16 md:py-24 px-4 sm:px-6 border-t border-sky-200/70">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
              Tools Built for Clarity &amp; Real Growth
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Every tool is genuine, functional, and connected to your database.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Feature 1: Customers */}
            <div id="customers" className="glass-panel p-6 rounded-3xl border border-sky-200/70 space-y-4 glass-panel-interactive">
              <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
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
                className="text-xs font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1 hover:underline"
              >
                <span>View Customers</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Feature 2: Shorts Studio */}
            <div id="shorts" className="glass-panel p-6 rounded-3xl border border-sky-200/70 space-y-4 glass-panel-interactive">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                <Video className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Video Studio
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Upload long recordings. The studio transcribes speech, cuts 30–60s vertical clips, adds readable subtitles, and publishes to YouTube &amp; Facebook.
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
            <div className="glass-panel p-6 rounded-3xl border border-sky-200/70 space-y-4 glass-panel-interactive">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <Mail className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Email Announcements
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
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
            <div className="glass-panel p-6 rounded-3xl border border-sky-200/70 space-y-4 glass-panel-interactive">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
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
      <footer className="mt-auto border-t border-sky-200/70 py-8 px-4 sm:px-6 glass-header">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <Logo size="sm" />
          <p>© {new Date().getFullYear()} NexusMark. Clear marketing workspace.</p>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="hover:text-sky-600">
              Overview
            </Link>
            <Link href="/campaigns/journey" className="hover:text-sky-600">
              4D Journey
            </Link>
            <Link href="/contacts" className="hover:text-sky-600">
              Customers
            </Link>
            <Link href="/shorts" className="hover:text-sky-600">
              Video Studio
            </Link>
            <Link href="/campaigns" className="hover:text-sky-600">
              Campaigns
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
