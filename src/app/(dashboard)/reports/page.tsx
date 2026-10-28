'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  Calendar,
  Download,
  Copy,
  Check,
  Sparkles,
  TrendingUp,
  Globe,
  Search,
  Users,
  DollarSign,
  ShieldCheck,
  RefreshCw,
  Loader2,
  Printer,
  ChevronRight,
} from 'lucide-react';
import { getMarketingDashboardMetrics } from '@/lib/actions/dashboard';
import { MarketingDashboardData } from '@/lib/types/dashboard';

export default function ReportsPage() {
  const [workspaceId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nexusmark_active_workspace') || 'ws-default';
    }
    return 'ws-default';
  });

  const [dateRange, setDateRange] = useState<'7d' | '30d'>('7d');
  const [reportData, setReportData] = useState<MarketingDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const data = await getMarketingDashboardMetrics(workspaceId, dateRange, 'all');
        setReportData(data);
      } catch (err) {
        console.error('Failed to load report data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [workspaceId, dateRange]);

  const formatCurrency = (val: number, curr = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr,
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handlePrint = () => {
    window.print();
  };

  const generateReportSummaryText = () => {
    if (!reportData) return '';
    return `GROWTHPILOT AI — WEEKLY EXECUTIVE PERFORMANCE REPORT
Date Range: ${reportData.websiteSessions.dateRange}
Generated: ${new Date().toLocaleDateString()}

1. TRAFFIC & AUDIENCE
• Website Sessions: ${reportData.websiteSessions.value.totalSessions.toLocaleString()} (${reportData.websiteSessions.status})
• Organic Search Clicks: ${reportData.organicSearch.value.clicks.toLocaleString()}
• Search Impressions: ${reportData.organicSearch.value.impressions.toLocaleString()} (CTR: ${reportData.organicSearch.value.ctr}%)

2. CRM & PIPELINE
• Active Leads: ${reportData.crmLeads.value.totalContacts} (${reportData.crmLeads.value.qualifiedLeads} qualified)
• Pipeline Value: ${formatCurrency(reportData.pipelineRevenue.value.totalPipelineValue, reportData.pipelineRevenue.value.currency)}
• Closed Won Revenue: ${formatCurrency(reportData.pipelineRevenue.value.wonRevenue, reportData.pipelineRevenue.value.currency)}

3. CONTENT & AUTOMATION
• Published Posts: ${reportData.socialPosts.value.publishedCount} (Scheduled: ${reportData.socialPosts.value.scheduledCount})
• Automation Health: ${reportData.automationHealth.value.reliabilityRate}% success rate across ${reportData.automationHealth.value.activeWorkflows} workflows

Guaranteed Data Integrity: Sourced from verified databases and authentic API telemetry.`;
  };

  const handleCopySummary = () => {
    navigator.clipboard.writeText(generateReportSummaryText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#75D2EE]/25">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-[#D7F1FA] text-[#167AA0] dark:bg-[#167AA0]/30 dark:text-[#75D2EE] border border-[#75D2EE]/40 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              Executive Growth Reports
            </span>
            <h1 className="text-2xl font-black tracking-tight text-[#17364A] dark:text-white">
              Weekly &amp; Monthly Marketing Reports
            </h1>
          </div>
          <p className="text-xs text-[#526D7D] dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Synthesized marketing performance digests calculated directly from verified website sessions, search clicks, and sales records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Range Selector */}
          <div className="inline-flex p-1 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-[#75D2EE]/30 shadow-xs">
            <button
              onClick={() => setDateRange('7d')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                dateRange === '7d'
                  ? 'bg-[#167AA0] text-white shadow-2xs'
                  : 'text-[#526D7D] hover:text-[#17364A]'
              }`}
            >
              Weekly Report (7D)
            </button>
            <button
              onClick={() => setDateRange('30d')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                dateRange === '30d'
                  ? 'bg-[#167AA0] text-white shadow-2xs'
                  : 'text-[#526D7D] hover:text-[#17364A]'
              }`}
            >
              Monthly Report (30D)
            </button>
          </div>

          <button
            onClick={handleCopySummary}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-white/80 dark:bg-slate-800 border border-[#75D2EE]/40 text-[#17364A] dark:text-slate-200 hover:bg-[#D7F1FA]/30 transition shadow-xs cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-[#167AA0]" />}
            <span>{copied ? 'Copied' : 'Copy Briefing'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-[#167AA0] hover:bg-[#0E526E] text-white transition shadow-xs cursor-pointer glass-button-press"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {loading || !reportData ? (
        <div className="flex flex-col items-center justify-center p-20 glass-panel rounded-2xl">
          <Loader2 className="w-8 h-8 text-[#167AA0] animate-spin mb-3" />
          <p className="text-xs text-[#526D7D]">Aggregating verified marketing telemetry...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Executive Overview Banner */}
          <div className="glass-panel p-6 rounded-2xl border border-[#75D2EE]/50 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#75D2EE]/25">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#167AA0] dark:text-[#75D2EE]">
                  Executive Growth Digest • {reportData.websiteSessions.dateRange}
                </span>
                <h2 className="text-lg font-black text-[#17364A] dark:text-white mt-0.5">
                  GrowthPilot AI Marketing Performance Summary
                </h2>
              </div>
              <span className="text-xs font-mono text-[#526D7D]">
                Generated on {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-white/70 dark:bg-slate-800/40 rounded-xl border border-[#75D2EE]/30">
                <span className="text-[10px] font-bold text-[#526D7D] uppercase">Website Sessions</span>
                <p className="text-xl font-black text-[#17364A] dark:text-white mt-1">
                  {reportData.websiteSessions.status === 'connected'
                    ? reportData.websiteSessions.value.totalSessions.toLocaleString()
                    : 'Disconnected'}
                </p>
                <span className="text-[10px] text-[#526D7D]">GA4 Telemetry</span>
              </div>

              <div className="p-4 bg-white/70 dark:bg-slate-800/40 rounded-xl border border-[#75D2EE]/30">
                <span className="text-[10px] font-bold text-[#526D7D] uppercase">Organic Clicks</span>
                <p className="text-xl font-black text-[#167AA0] dark:text-[#75D2EE] mt-1">
                  {reportData.organicSearch.status === 'connected'
                    ? reportData.organicSearch.value.clicks.toLocaleString()
                    : 'Disconnected'}
                </p>
                <span className="text-[10px] text-[#526D7D]">Search Console</span>
              </div>

              <div className="p-4 bg-white/70 dark:bg-slate-800/40 rounded-xl border border-[#75D2EE]/30">
                <span className="text-[10px] font-bold text-[#526D7D] uppercase">Qualified Leads</span>
                <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {reportData.crmLeads.value.qualifiedLeads}
                </p>
                <span className="text-[10px] text-[#526D7D]">CRM Pipeline</span>
              </div>

              <div className="p-4 bg-white/70 dark:bg-slate-800/40 rounded-xl border border-[#75D2EE]/30">
                <span className="text-[10px] font-bold text-[#526D7D] uppercase">Won Revenue</span>
                <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {formatCurrency(reportData.pipelineRevenue.value.wonRevenue, reportData.pipelineRevenue.value.currency)}
                </p>
                <span className="text-[10px] text-[#526D7D]">Sales Conversions</span>
              </div>
            </div>
          </div>

          {/* Section 2: Detailed Performance Breakdowns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Search & Traffic Acquisition */}
            <div className="glass-panel p-6 rounded-2xl border border-[#75D2EE]/50 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-[#17364A] dark:text-white flex items-center gap-2">
                <Search className="w-4 h-4 text-[#167AA0]" />
                Organic Search &amp; Traffic Channels
              </h3>

              {reportData.organicSearch.status === 'connected' ? (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-3 gap-2 p-3 bg-white/70 dark:bg-slate-800/40 rounded-xl border border-[#75D2EE]/30">
                    <div>
                      <span className="text-[#526D7D]">Impressions:</span>
                      <p className="font-bold text-[#17364A] dark:text-white text-sm">
                        {reportData.organicSearch.value.impressions.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-[#526D7D]">CTR:</span>
                      <p className="font-bold text-[#167AA0] text-sm">
                        {reportData.organicSearch.value.ctr}%
                      </p>
                    </div>
                    <div>
                      <span className="text-[#526D7D]">Avg Rank:</span>
                      <p className="font-bold text-[#17364A] dark:text-white text-sm">
                        #{reportData.organicSearch.value.averagePosition}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="font-bold text-[#526D7D] uppercase tracking-wider text-[10px]">
                      Top Performing Keywords
                    </span>
                    {reportData.organicSearch.value.topQueries.map((q, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-lg bg-white/60 dark:bg-slate-800/30 flex items-center justify-between text-xs border border-[#75D2EE]/20"
                      >
                        <span className="font-semibold text-[#17364A] dark:text-white truncate">
                          {q.query}
                        </span>
                        <span className="font-mono text-[#167AA0] font-bold shrink-0">
                          {q.clicks} clicks
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-[#526D7D] space-y-2">
                  <p>Google Search Console is not connected for live rank reporting.</p>
                  <Link href="/seo" className="text-[#167AA0] font-bold hover:underline">
                    Connect GSC in SEO Hub →
                  </Link>
                </div>
              )}
            </div>

            {/* Inbound Lead Pipeline & Conversion Velocity */}
            <div className="glass-panel p-6 rounded-2xl border border-[#75D2EE]/50 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-[#17364A] dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-[#167AA0]" />
                Inbound Lead Pipeline &amp; Conversion Velocity
              </h3>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2 p-3 bg-white/70 dark:bg-slate-800/40 rounded-xl border border-[#75D2EE]/30">
                  <div>
                    <span className="text-[#526D7D]">Lead-to-Deal Rate:</span>
                    <p className="font-bold text-emerald-600 text-sm">
                      {reportData.crmLeads.value.leadToDealConversionRate}%
                    </p>
                  </div>
                  <div>
                    <span className="text-[#526D7D]">Active Pipeline:</span>
                    <p className="font-bold text-[#167AA0] text-sm">
                      {formatCurrency(reportData.pipelineRevenue.value.totalPipelineValue, reportData.pipelineRevenue.value.currency)}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="font-bold text-[#526D7D] uppercase tracking-wider text-[10px]">
                    Lifecycle Stage Distribution
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(reportData.crmLeads.value.lifecycleDistribution).map(([stage, count]) => (
                      <div
                        key={stage}
                        className="p-2 rounded-lg bg-white/60 dark:bg-slate-800/30 border border-[#75D2EE]/20 text-center"
                      >
                        <span className="text-[10px] uppercase font-bold text-[#526D7D] block">
                          {stage}
                        </span>
                        <span className="text-sm font-bold text-[#17364A] dark:text-white">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Strategic Recommendations */}
          <div className="glass-panel p-6 rounded-2xl border border-[#75D2EE]/50 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-[#17364A] dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#167AA0]" />
              Strategic Growth Next Steps
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {reportData.recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="p-4 bg-white/70 dark:bg-slate-800/40 rounded-xl border border-[#75D2EE]/30 space-y-2 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#D7F1FA] text-[#167AA0]">
                        {rec.category}
                      </span>
                      <span className="text-[10px] font-bold text-sky-700">
                        {rec.impact} impact
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-[#17364A] dark:text-white">
                      {rec.title}
                    </h4>
                    <p className="text-[11px] text-[#526D7D] mt-1 leading-relaxed">
                      {rec.description}
                    </p>
                  </div>

                  <Link
                    href={rec.actionHref}
                    className="text-xs font-bold text-[#167AA0] hover:underline flex items-center gap-1 pt-2 border-t border-[#75D2EE]/20"
                  >
                    <span>{rec.actionLabel}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
