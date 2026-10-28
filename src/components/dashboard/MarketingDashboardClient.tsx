'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  MarketingDashboardData,
  DashboardDateRange,
  DashboardChannel,
  MetricConnectionStatus,
} from '@/lib/types/dashboard';
import {
  Users,
  DollarSign,
  TrendingUp,
  Globe,
  Search,
  Share2,
  Calendar,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Filter,
  Layers,
  Activity,
  Mail,
  Video,
  FileText,
  Plug,
  XCircle,
} from 'lucide-react';
import { getMarketingDashboardMetrics } from '@/lib/actions/dashboard';

interface Props {
  initialData: MarketingDashboardData;
  workspaceId: string;
}

export function MarketingDashboardClient({ initialData, workspaceId }: Props) {
  const [data, setData] = useState<MarketingDashboardData>(initialData);
  const [dateRange, setDateRange] = useState<DashboardDateRange>(initialData.dateRange || '30d');
  const [channel, setChannel] = useState<DashboardChannel>(initialData.channel || 'all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleFilterChange = async (newRange: DashboardDateRange, newChannel: DashboardChannel) => {
    setDateRange(newRange);
    setChannel(newChannel);
    setIsRefreshing(true);
    try {
      const refreshed = await getMarketingDashboardMetrics(workspaceId, newRange, newChannel);
      setData(refreshed);
    } catch (err) {
      console.error('Failed to refresh dashboard metrics:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatCurrency = (val: number, curr = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr,
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return 'Not available';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const renderStatusBadge = (status: MetricConnectionStatus, sourceName: string) => {
    if (status === 'connected') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {sourceName} • Verified Live
        </span>
      );
    }
    if (status === 'empty') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#D7F1FA] text-[#167AA0] dark:bg-[#167AA0]/30 dark:text-[#75D2EE] border border-[#75D2EE]/40">
          <span className="w-1.5 h-1.5 rounded-full bg-[#167AA0]" />
          {sourceName} • 0 Records
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
        <AlertTriangle className="w-3 h-3" />
        {sourceName} • Unconfigured
      </span>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Welcome Header & Real Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#75D2EE]/25">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-[#17364A] dark:text-white">
              GrowthPilot AI Command Center
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#D7F1FA] text-[#167AA0] dark:bg-[#167AA0]/30 dark:text-[#75D2EE] border border-[#75D2EE]/40">
              Live Operations
            </span>
          </div>
          <p className="text-xs text-[#526D7D] dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Centralized marketing automation cockpit backed strictly by authenticated APIs, CRM databases, and real execution pipelines.
          </p>
        </div>

        {/* Global Date & Channel Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Date Filter Tabs */}
          <div className="inline-flex p-1 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-[#75D2EE]/30 shadow-xs">
            {(['7d', '30d', '90d'] as DashboardDateRange[]).map((r) => (
              <button
                key={r}
                onClick={() => handleFilterChange(r, channel)}
                disabled={isRefreshing}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  dateRange === r
                    ? 'bg-[#167AA0] text-white shadow-2xs'
                    : 'text-[#526D7D] hover:text-[#17364A] dark:text-slate-300'
                }`}
              >
                {r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>

          {/* Refresh Action */}
          <button
            onClick={() => handleFilterChange(dateRange, channel)}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-white/80 dark:bg-slate-800 border border-[#75D2EE]/40 text-[#526D7D] hover:text-[#167AA0] transition shadow-xs cursor-pointer"
            title="Refresh All Real Sources"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#167AA0]' : ''}`} />
          </button>

          {/* Quick Create CTA */}
          <Link
            href="/ai-studio"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-[#167AA0] hover:bg-[#0E526E] text-white shadow-xs transition-all duration-140 glass-button-press"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#75D2EE]" />
            <span>AI Content Studio</span>
          </Link>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* SECTION 1: EXECUTIVE KPI SUMMARY                                       */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Website Sessions */}
        <div className="glass-panel p-5 rounded-2xl border border-[#75D2EE]/45 shadow-xs preview-tile-3d flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#526D7D] dark:text-slate-400">
                Website Sessions
              </span>
              <div className="p-2 rounded-xl bg-[#D7F1FA] text-[#167AA0] dark:bg-sky-950/60 dark:text-sky-400">
                <Globe className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3">
              {data.websiteSessions.status === 'connected' ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-[#17364A] dark:text-white">
                      {data.websiteSessions.value.totalSessions.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-emerald-600 font-semibold">
                      {data.websiteSessions.value.organicSessions.toLocaleString()} organic
                    </span>
                  </div>
                  <p className="text-[11px] text-[#526D7D] mt-1">
                    {data.websiteSessions.value.conversionRate}% conversion rate
                  </p>
                </>
              ) : (
                <div className="py-1">
                  <span className="text-sm font-bold text-amber-700 dark:text-amber-400">
                    Integration Disconnected
                  </span>
                  <p className="text-[11px] text-[#526D7D] mt-1 leading-snug">
                    Connect Google Analytics 4 to stream live sessions.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#75D2EE]/25 flex items-center justify-between text-[11px]">
            {renderStatusBadge(data.websiteSessions.status, 'GA4')}
            <Link
              href={data.websiteSessions.setupHref || '/integrations'}
              className="text-[#167AA0] font-bold hover:underline flex items-center gap-0.5"
            >
              <span>{data.websiteSessions.status === 'connected' ? 'Analytics' : 'Connect'}</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* 2. Organic Search Clicks */}
        <div className="glass-panel p-5 rounded-2xl border border-[#75D2EE]/45 shadow-xs preview-tile-3d flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#526D7D] dark:text-slate-400">
                Search Performance
              </span>
              <div className="p-2 rounded-xl bg-[#D7F1FA] text-[#167AA0] dark:bg-sky-950/60 dark:text-sky-400">
                <Search className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3">
              {data.organicSearch.status === 'connected' ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-[#17364A] dark:text-white">
                      {data.organicSearch.value.clicks.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-[#526D7D]">clicks</span>
                  </div>
                  <p className="text-[11px] text-[#526D7D] mt-1">
                    {data.organicSearch.value.impressions.toLocaleString()} impressions • {data.organicSearch.value.ctr}% CTR
                  </p>
                </>
              ) : (
                <div className="py-1">
                  <span className="text-sm font-bold text-amber-700 dark:text-amber-400">
                    GSC Disconnected
                  </span>
                  <p className="text-[11px] text-[#526D7D] mt-1 leading-snug">
                    Link Search Console to track keyword clicks and rankings.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#75D2EE]/25 flex items-center justify-between text-[11px]">
            {renderStatusBadge(data.organicSearch.status, 'GSC')}
            <Link
              href="/seo"
              className="text-[#167AA0] font-bold hover:underline flex items-center gap-0.5"
            >
              <span>SEO Hub</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* 3. Qualified Leads */}
        <div className="glass-panel p-5 rounded-2xl border border-[#75D2EE]/45 shadow-xs preview-tile-3d flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#526D7D] dark:text-slate-400">
                Audience &amp; Qualified Leads
              </span>
              <div className="p-2 rounded-xl bg-[#D7F1FA] text-[#167AA0] dark:bg-sky-950/60 dark:text-sky-400">
                <Users className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-[#17364A] dark:text-white">
                  {data.crmLeads.value.totalContacts.toLocaleString()}
                </span>
                <span className="text-[11px] text-[#167AA0] font-bold">
                  {data.crmLeads.value.qualifiedLeads} qualified
                </span>
              </div>
              <p className="text-[11px] text-[#526D7D] mt-1">
                {data.crmLeads.value.formsActive} active lead capture forms
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#75D2EE]/25 flex items-center justify-between text-[11px]">
            {renderStatusBadge('connected', 'CRM')}
            <Link
              href="/contacts"
              className="text-[#167AA0] font-bold hover:underline flex items-center gap-0.5"
            >
              <span>Directory</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* 4. Sales Pipeline Value */}
        <div className="glass-panel p-5 rounded-2xl border border-[#75D2EE]/45 shadow-xs preview-tile-3d flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#526D7D] dark:text-slate-400">
                Pipeline Value &amp; Won
              </span>
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-[#17364A] dark:text-white">
                  {formatCurrency(data.pipelineRevenue.value.totalPipelineValue, data.pipelineRevenue.value.currency)}
                </span>
              </div>
              <p className="text-[11px] text-emerald-600 font-bold mt-1">
                {formatCurrency(data.pipelineRevenue.value.wonRevenue, data.pipelineRevenue.value.currency)} won conversions
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#75D2EE]/25 flex items-center justify-between text-[11px]">
            {renderStatusBadge('connected', 'Deals')}
            <Link
              href="/deals"
              className="text-emerald-600 font-bold hover:underline flex items-center gap-0.5"
            >
              <span>Pipeline</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* SECTION 2: AI GROWTH RECOMMENDATIONS (DATA-GROUNDED)                 */}
      {/* ===================================================================== */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#167AA0] dark:text-[#75D2EE]" />
            <h2 className="text-xs font-black text-[#17364A] dark:text-white uppercase tracking-wider">
              AI Growth Recommendations (Real-Time Diagnostics)
            </h2>
          </div>
          <span className="text-[11px] text-[#526D7D] font-mono">
            {data.recommendations.length} action items detected
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.recommendations.map((rec) => (
            <div
              key={rec.id}
              className="glass-panel p-5 rounded-2xl border border-[#75D2EE]/50 shadow-xs flex flex-col justify-between hover:border-[#167AA0] transition-colors preview-tile-3d"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#D7F1FA] text-[#167AA0] dark:bg-[#167AA0]/30 dark:text-[#75D2EE]">
                    {rec.category.replace('_', ' ')}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      rec.impact === 'high'
                        ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                        : 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300'
                    }`}
                  >
                    {rec.impact} impact
                  </span>
                </div>

                <h3 className="text-sm font-bold text-[#17364A] dark:text-white">
                  {rec.title}
                </h3>
                <p className="text-xs text-[#526D7D] dark:text-slate-400 mt-1.5 leading-relaxed">
                  {rec.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-[#75D2EE]/25">
                <Link
                  href={rec.actionHref}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#167AA0] dark:text-[#75D2EE] hover:underline"
                >
                  <span>{rec.actionLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===================================================================== */}
      {/* SECTION 3: SOCIAL PUBLISHING, CALENDAR & AUTOMATION HEALTH             */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Social Publishing & Content Calendar Overview */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-[#75D2EE]/50 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#75D2EE]/25">
            <div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#167AA0]" />
                <h3 className="text-sm font-bold text-[#17364A] dark:text-white">
                  Social Publishing &amp; Marketing Calendar
                </h3>
              </div>
              <p className="text-[11px] text-[#526D7D] mt-0.5">
                Multi-platform publishing states, scheduled releases, and approval queues
              </p>
            </div>
            <Link
              href="/calendar"
              className="text-xs text-[#167AA0] font-bold hover:underline flex items-center gap-1"
            >
              <span>Full Calendar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-white/70 dark:bg-slate-800/40 rounded-xl border border-[#75D2EE]/30">
              <span className="text-[10px] font-bold text-[#526D7D] uppercase tracking-wider block">
                Published
              </span>
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {data.socialPosts.value.publishedCount}
              </p>
              <span className="text-[10px] text-[#526D7D]">live posts</span>
            </div>

            <div className="p-3.5 bg-white/70 dark:bg-slate-800/40 rounded-xl border border-[#75D2EE]/30">
              <span className="text-[10px] font-bold text-[#526D7D] uppercase tracking-wider block">
                Scheduled
              </span>
              <p className="text-xl font-black text-[#167AA0] dark:text-[#75D2EE] mt-1">
                {data.socialPosts.value.scheduledCount}
              </p>
              <span className="text-[10px] text-[#526D7D]">upcoming dates</span>
            </div>

            <div className="p-3.5 bg-white/70 dark:bg-slate-800/40 rounded-xl border border-[#75D2EE]/30">
              <span className="text-[10px] font-bold text-[#526D7D] uppercase tracking-wider block">
                Pending Approval
              </span>
              <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
                {data.socialPosts.value.pendingApprovalCount}
              </p>
              <span className="text-[10px] text-[#526D7D]">needs review</span>
            </div>

            <div className="p-3.5 bg-white/70 dark:bg-slate-800/40 rounded-xl border border-[#75D2EE]/30">
              <span className="text-[10px] font-bold text-[#526D7D] uppercase tracking-wider block">
                Failed Dispatches
              </span>
              <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
                {data.socialPosts.value.failedCount}
              </p>
              <span className="text-[10px] text-[#526D7D]">retry required</span>
            </div>
          </div>

          {/* Quick Publishing Shortcuts */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-[#D7F1FA]/40 via-white/50 to-[#EDF9FD]/60 dark:from-slate-900 dark:to-sky-950/30 border border-[#75D2EE]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-[#17364A] dark:text-white">
                Create &amp; Schedule Multi-Channel Content
              </p>
              <p className="text-[11px] text-[#526D7D] dark:text-slate-400 mt-0.5">
                Generate platform-formatted Facebook captions, TikTok scripts, and SEO briefs in Bangla &amp; English.
              </p>
            </div>
            <Link
              href="/ai-studio"
              className="px-3.5 py-1.5 rounded-xl bg-[#167AA0] hover:bg-[#0E526E] text-white text-xs font-bold shrink-0 text-center glass-button-press"
            >
              Draft in AI Studio →
            </Link>
          </div>
        </div>

        {/* Automation Engine & Execution Health */}
        <div className="glass-panel p-6 rounded-2xl border border-[#75D2EE]/50 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#75D2EE]/25">
            <div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#167AA0]" />
                <h3 className="text-sm font-bold text-[#17364A] dark:text-white">
                  Automation Health
                </h3>
              </div>
              <p className="text-[11px] text-[#526D7D] mt-0.5">
                Event triggers &amp; durable execution runs
              </p>
            </div>
            <Link href="/automations" className="text-xs text-[#167AA0] font-bold hover:underline">
              Pipelines →
            </Link>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 bg-white/70 dark:bg-slate-800/40 rounded-xl border border-[#75D2EE]/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#526D7D] uppercase font-bold">Active Listeners</span>
                <p className="text-lg font-black text-[#17364A] dark:text-white">
                  {data.automationHealth.value.activeWorkflows} workflows
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Running
              </span>
            </div>

            <div className="p-3.5 bg-white/70 dark:bg-slate-800/40 rounded-xl border border-[#75D2EE]/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#526D7D] uppercase font-bold">Reliability Rate</span>
                <p className="text-lg font-black text-[#167AA0] dark:text-[#75D2EE]">
                  {data.automationHealth.value.reliabilityRate}%
                </p>
              </div>
              <span className="text-xs font-mono text-[#526D7D]">
                {data.automationHealth.value.succeededExecutions} / {data.automationHealth.value.totalExecutions}
              </span>
            </div>

            {data.automationHealth.value.failedExecutions > 0 && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-xs text-rose-700 flex items-center justify-between">
                <span className="font-semibold">
                  {data.automationHealth.value.failedExecutions} failed runs detected
                </span>
                <Link href="/automations" className="font-bold underline text-[11px]">
                  Diagnose
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* SECTION 4: DATA SOURCE INTEGRITY & AUDIT TELEMETRY                    */}
      {/* ===================================================================== */}
      <section className="glass-panel p-5 rounded-2xl border border-[#75D2EE]/40 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#526D7D]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold text-[#17364A] dark:text-white">
              Data Verification Guarantee:
            </span>
            <span>Zero mock metrics or simulated customer analytics.</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span>Range: {data.websiteSessions.dateRange}</span>
            <span>Last Synced: {formatTime(data.websiteSessions.lastUpdated)}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
