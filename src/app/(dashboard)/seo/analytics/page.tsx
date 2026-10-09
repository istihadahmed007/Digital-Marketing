'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { SeoWebsite, SeoGscData, SeoGa4Data, SeoIntegration } from '@/lib/types/seo';
import {
  getSeoWebsites,
  getSeoIntegrations,
  saveSeoIntegration,
  disconnectSeoIntegration,
  getGscPerformanceData,
  getGa4AnalyticsData,
} from '@/lib/actions/seo';
import {
  BarChart3,
  Search,
  Globe,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Loader2,
  Plug,
  Calendar,
  Lock,
  Trash2,
  Key,
  Sparkles,
  HelpCircle,
  Eye,
  MousePointerClick,
  Layers,
  ArrowUpRight,
} from 'lucide-react';

export default function SeoAnalyticsPage() {
  const [websites, setWebsites] = useState<SeoWebsite[]>([]);
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string>('all');
  const [integrations, setIntegrations] = useState<SeoIntegration[]>([]);
  const [gscData, setGscData] = useState<SeoGscData[]>([]);
  const [ga4Data, setGa4Data] = useState<SeoGa4Data[]>([]);

  const [workspaceId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nexusmark_active_workspace') || 'ws-default';
    }
    return 'ws-default';
  });

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'gsc' | 'ga4' | 'connect'>('gsc');
  const [querySearch, setQuerySearch] = useState('');

  // GSC Connect Form State
  const [gscAuthType, setGscAuthType] = useState<'access_token' | 'refresh_token' | 'service_account'>('access_token');
  const [gscPropertyId, setGscPropertyId] = useState('sc-domain:digi.vartualtutor.com');
  const [gscAccessToken, setGscAccessToken] = useState('');
  const [gscRefreshToken, setGscRefreshToken] = useState('');
  const [gscClientId, setGscClientId] = useState('');
  const [gscClientSecret, setGscClientSecret] = useState('');
  const [gscClientEmail, setGscClientEmail] = useState('');
  const [savingGsc, setSavingGsc] = useState(false);

  // GA4 Connect Form State
  const [ga4PropertyId, setGa4PropertyId] = useState('');
  const [ga4AccessToken, setGa4AccessToken] = useState('');
  const [savingGa4, setSavingGa4] = useState(false);

  // Disconnecting states
  const [disconnectingProvider, setDisconnectingProvider] = useState<string | null>(null);

  const fetchData = async (wsId: string, siteId?: string) => {
    setLoading(true);
    try {
      const [siteList, integList] = await Promise.all([
        getSeoWebsites(wsId),
        getSeoIntegrations(wsId),
      ]);
      setWebsites(siteList);
      setIntegrations(integList);

      const targetSiteId = siteId !== undefined ? siteId : (selectedWebsiteId || 'all');
      const [gsc, ga4] = await Promise.all([
        getGscPerformanceData(wsId, targetSiteId === 'all' ? undefined : targetSiteId),
        getGa4AnalyticsData(wsId, targetSiteId === 'all' ? undefined : targetSiteId),
      ]);
      setGscData(gsc);
      setGa4Data(ga4);
    } catch (err) {
      console.error('Failed to load SEO analytics data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(workspaceId, selectedWebsiteId);
  }, [workspaceId, selectedWebsiteId]);

  const gscIntegration = integrations.find((i) => i.provider === 'google_search_console');
  const ga4Integration = integrations.find((i) => i.provider === 'google_analytics_4');

  // GSC Summary Metrics
  const gscStats = useMemo(() => {
    if (!gscData.length) return { totalClicks: 0, totalImpressions: 0, avgCtr: 0, avgPosition: 0 };
    const clicks = gscData.reduce((acc, row) => acc + (row.clicks || 0), 0);
    const impressions = gscData.reduce((acc, row) => acc + (row.impressions || 0), 0);
    const avgCtr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const avgPosition = gscData.reduce((acc, row) => acc + (row.average_position || 0), 0) / gscData.length;
    return {
      totalClicks: clicks,
      totalImpressions: impressions,
      avgCtr: avgCtr.toFixed(2),
      avgPosition: avgPosition.toFixed(1),
    };
  }, [gscData]);

  // GA4 Summary Metrics
  const ga4Stats = useMemo(() => {
    if (!ga4Data.length) return { totalSessions: 0, totalOrganic: 0, totalConversions: 0, avgBounce: 0 };
    const sessions = ga4Data.reduce((acc, row) => acc + (row.sessions || 0), 0);
    const organic = ga4Data.reduce((acc, row) => acc + (row.organic_sessions || 0), 0);
    const conversions = ga4Data.reduce((acc, row) => acc + (row.conversions || 0), 0);
    const avgBounce = ga4Data.reduce((acc, row) => acc + (Number(row.bounce_rate) || 0), 0) / ga4Data.length;
    return {
      totalSessions: sessions,
      totalOrganic: organic,
      totalConversions: conversions,
      avgBounce: avgBounce.toFixed(1),
    };
  }, [ga4Data]);

  // Filtered queries
  const filteredGscData = useMemo(() => {
    if (!querySearch.trim()) return gscData;
    const q = querySearch.toLowerCase().trim();
    return gscData.filter(
      (row) => row.query.toLowerCase().includes(q) || row.page.toLowerCase().includes(q)
    );
  }, [gscData, querySearch]);

  // Connect 1-Click Demo Mode for GSC
  const handleConnectGscDemo = async () => {
    setSavingGsc(true);
    try {
      const res = await saveSeoIntegration(
        workspaceId,
        'google_search_console',
        'Google Search Console (Demo)',
        gscPropertyId || 'sc-domain:digi.vartualtutor.com',
        { isDemo: true, accessToken: 'demo' }
      );
      if (res.success && res.isConnected) {
        alert('🎉 Connected in Demonstration Mode! Realistic search performance metrics have been populated.');
        await fetchData(workspaceId, selectedWebsiteId);
        setActiveTab('gsc');
      } else {
        alert(res.error || 'Failed to activate demo mode');
      }
    } catch (err: any) {
      alert(err.message || 'Error configuring demo mode');
    } finally {
      setSavingGsc(false);
    }
  };

  // Connect Live GSC Credentials
  const handleSaveGsc = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGsc(true);
    try {
      const configPayload: Record<string, any> = {};

      if (gscAuthType === 'access_token') {
        if (!gscAccessToken.trim()) {
          alert('Please enter a valid Google OAuth Access Token (ya29...).');
          setSavingGsc(false);
          return;
        }
        configPayload.accessToken = gscAccessToken.trim();
      } else if (gscAuthType === 'refresh_token') {
        configPayload.clientId = gscClientId.trim();
        configPayload.clientSecret = gscClientSecret.trim();
        configPayload.refreshToken = gscRefreshToken.trim();
      } else if (gscAuthType === 'service_account') {
        configPayload.clientEmail = gscClientEmail.trim();
      }

      const res = await saveSeoIntegration(
        workspaceId,
        'google_search_console',
        gscClientEmail || 'Google Search Console Account',
        gscPropertyId.trim(),
        configPayload
      );

      if (res.success && res.isConnected) {
        alert(res.message || 'Google Search Console verified and connected successfully!');
        await fetchData(workspaceId, selectedWebsiteId);
        setActiveTab('gsc');
      } else {
        alert(res.error || 'Failed to verify Google Search Console connection. Please verify credentials.');
      }
    } catch (err: any) {
      alert(err.message || 'Error saving GSC configuration');
    } finally {
      setSavingGsc(false);
    }
  };

  // Connect 1-Click Demo Mode for GA4
  const handleConnectGa4Demo = async () => {
    setSavingGa4(true);
    try {
      const res = await saveSeoIntegration(
        workspaceId,
        'google_analytics_4',
        'Google Analytics 4 (Demo)',
        ga4PropertyId || 'properties/348291024',
        { isDemo: true, accessToken: 'demo' }
      );
      if (res.success && res.isConnected) {
        alert('🎉 Connected GA4 in Demonstration Mode! Realistic organic traffic metrics populated.');
        await fetchData(workspaceId, selectedWebsiteId);
        setActiveTab('ga4');
      } else {
        alert(res.error || 'Failed to activate GA4 demo mode');
      }
    } catch (err: any) {
      alert(err.message || 'Error configuring GA4 demo mode');
    } finally {
      setSavingGa4(false);
    }
  };

  // Connect Live GA4 Credentials
  const handleSaveGa4 = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGa4(true);
    try {
      const res = await saveSeoIntegration(
        workspaceId,
        'google_analytics_4',
        'Google Analytics 4 Property',
        ga4PropertyId.trim(),
        { accessToken: ga4AccessToken.trim() || undefined }
      );
      if (res.success && res.isConnected) {
        alert(res.message || 'Google Analytics 4 verified and connected successfully!');
        await fetchData(workspaceId, selectedWebsiteId);
        setActiveTab('ga4');
      } else {
        alert(res.error || 'Failed to verify GA4 connection. Please verify credentials.');
      }
    } catch (err: any) {
      alert(err.message || 'Error saving GA4 configuration');
    } finally {
      setSavingGa4(false);
    }
  };

  // Disconnect integration
  const handleDisconnect = async (provider: 'google_search_console' | 'google_analytics_4') => {
    if (!confirm(`Are you sure you want to disconnect ${provider === 'google_search_console' ? 'Google Search Console' : 'Google Analytics 4'}?`)) {
      return;
    }
    setDisconnectingProvider(provider);
    try {
      const res = await disconnectSeoIntegration(workspaceId, provider);
      if (res.success) {
        await fetchData(workspaceId, selectedWebsiteId);
      } else {
        alert(res.error || 'Failed to disconnect');
      }
    } catch (err: any) {
      alert(err.message || 'Error disconnecting');
    } finally {
      setDisconnectingProvider(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              SEO Analytics & Reporting
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Google Search Console & GA4
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track organic clicks, search impressions, average position, and visitor traffic directly from Google.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Website Filter */}
          {websites.length > 0 && (
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 shadow-xs">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedWebsiteId}
                onChange={(e) => setSelectedWebsiteId(e.target.value)}
                className="text-xs font-medium bg-transparent text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="all">All Domains</option>
                {websites.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.domain}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quick Refresh */}
          <button
            onClick={() => fetchData(workspaceId, selectedWebsiteId)}
            disabled={loading}
            className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-xs"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Configure Tab Shortcut */}
          <button
            onClick={() => setActiveTab('connect')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition shadow-xs ${
              activeTab === 'connect'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Plug className="w-3.5 h-3.5" />
            <span>Connection Settings</span>
          </button>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('gsc')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl transition ${
            activeTab === 'gsc'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Google Search Console</span>
          {gscIntegration?.is_connected && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('ga4')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl transition ${
            activeTab === 'ga4'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Google Analytics 4 (Organic)</span>
          {ga4Integration?.is_connected && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('connect')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl transition ${
            activeTab === 'connect'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          <span>Configure API Credentials</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: GOOGLE SEARCH CONSOLE */}
      {/* ======================================================== */}
      {activeTab === 'gsc' && (
        <div className="space-y-6">
          {!gscIntegration?.is_connected ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-xs border border-blue-100 dark:border-blue-900">
                <Search className="w-7 h-7" />
              </div>
              <div className="max-w-lg mx-auto">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Connect Google Search Console
                </h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Import verified search queries, click counts, total impressions, CTR%, and SERP ranking positions. Connect your live Google account or launch Instant Demo Mode to test immediately.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleConnectGscDemo}
                  disabled={savingGsc}
                  className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold rounded-xl inline-flex items-center justify-center gap-2 shadow-sm transition"
                >
                  {savingGsc ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>⚡ Connect Instant Demo Mode (digi.vartualtutor.com)</span>
                </button>

                <button
                  onClick={() => setActiveTab('connect')}
                  className="w-full sm:w-auto px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl inline-flex items-center justify-center gap-2 transition"
                >
                  <Key className="w-4 h-4" />
                  <span>Connect Live Google OAuth Credentials</span>
                </button>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
                Tip: Instant Demo Mode seeds realistic search analytics data so you can test tables, filters, and reports right away.
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Connected Status Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {gscIntegration.property_id || 'Primary Domain'}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {gscIntegration.account_name?.includes('Demo') ? 'Demo Mode' : 'Live Verified'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Synchronized search query performance data is active.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('connect')}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  >
                    Change Credentials
                  </button>
                  <button
                    onClick={() => handleDisconnect('google_search_console')}
                    disabled={disconnectingProvider === 'google_search_console'}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition border border-rose-200 dark:border-rose-900/40"
                  >
                    {disconnectingProvider === 'google_search_console' ? 'Disconnecting...' : 'Disconnect'}
                  </button>
                </div>
              </div>

              {/* KPI Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs">
                    <span>Total Clicks</span>
                    <MousePointerClick className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                    {gscStats.totalClicks.toLocaleString()}
                  </div>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1 inline-block">
                    ↑ Search traffic
                  </span>
                </div>

                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs">
                    <span>Total Impressions</span>
                    <Eye className="w-4 h-4 text-purple-500" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                    {gscStats.totalImpressions.toLocaleString()}
                  </div>
                  <span className="text-[11px] text-purple-600 dark:text-purple-400 font-medium mt-1 inline-block">
                    SERP appearances
                  </span>
                </div>

                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs">
                    <span>Average CTR</span>
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                    {gscStats.avgCtr}%
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium mt-1 inline-block">
                    Click-Through Rate
                  </span>
                </div>

                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs">
                    <span>Average Position</span>
                    <Layers className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                    {gscStats.avgPosition}
                  </div>
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-1 inline-block">
                    Average SERP rank
                  </span>
                </div>
              </div>

              {/* Data Table Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={querySearch}
                    onChange={(e) => setQuerySearch(e.target.value)}
                    placeholder="Search queries or landing pages..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="text-xs text-slate-500">
                  Showing <strong>{filteredGscData.length}</strong> of {gscData.length} queries
                </div>
              </div>

              {/* GSC Query Table */}
              {filteredGscData.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-500">
                  {querySearch ? 'No search queries matched your filter.' : 'No search query data found for this property.'}
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-600 dark:text-slate-300">
                        <tr>
                          <th className="p-3.5">Top Search Queries</th>
                          <th className="p-3.5">Landing Page</th>
                          <th className="p-3.5 text-right">Clicks</th>
                          <th className="p-3.5 text-right">Impressions</th>
                          <th className="p-3.5 text-right">CTR</th>
                          <th className="p-3.5 text-right">Avg. Position</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                        {filteredGscData.map((row) => (
                          <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                            <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                              {row.query}
                            </td>
                            <td className="p-3.5 text-slate-500 max-w-xs truncate" title={row.page}>
                              {row.page}
                            </td>
                            <td className="p-3.5 text-right font-semibold text-blue-600 dark:text-blue-400">
                              {row.clicks.toLocaleString()}
                            </td>
                            <td className="p-3.5 text-right">
                              {row.impressions.toLocaleString()}
                            </td>
                            <td className="p-3.5 text-right">
                              {(row.ctr * 100).toFixed(2)}%
                            </td>
                            <td className="p-3.5 text-right font-mono font-medium">
                              <span className={`px-2 py-0.5 rounded-lg text-xs ${
                                row.average_position <= 3
                                  ? 'bg-emerald-500/10 text-emerald-600 font-bold'
                                  : row.average_position <= 10
                                  ? 'bg-blue-500/10 text-blue-600'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                              }`}>
                                {row.average_position.toFixed(1)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: GOOGLE ANALYTICS 4 */}
      {/* ======================================================== */}
      {activeTab === 'ga4' && (
        <div className="space-y-6">
          {!ga4Integration?.is_connected ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-xs border border-amber-100 dark:border-amber-900">
                <BarChart3 className="w-7 h-7" />
              </div>
              <div className="max-w-lg mx-auto">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Connect Google Analytics 4 (GA4)
                </h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  View authentic organic search traffic, engaged sessions, conversions, and bounce rates directly from your Google Analytics 4 property.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleConnectGa4Demo}
                  disabled={savingGa4}
                  className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-semibold rounded-xl inline-flex items-center justify-center gap-2 shadow-sm transition"
                >
                  {savingGa4 ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>⚡ Connect GA4 Instant Demo Mode</span>
                </button>

                <button
                  onClick={() => setActiveTab('connect')}
                  className="w-full sm:w-auto px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl inline-flex items-center justify-center gap-2 transition"
                >
                  <Key className="w-4 h-4" />
                  <span>Configure Live GA4 Property</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Connected GA4 Status Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        GA4 Property: {ga4Integration.property_id}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {ga4Integration.account_name?.includes('Demo') ? 'Demo Mode' : 'Live Verified'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Synchronized organic traffic metrics are active.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('connect')}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  >
                    Change Property
                  </button>
                  <button
                    onClick={() => handleDisconnect('google_analytics_4')}
                    disabled={disconnectingProvider === 'google_analytics_4'}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition border border-rose-200 dark:border-rose-900/40"
                  >
                    {disconnectingProvider === 'google_analytics_4' ? 'Disconnecting...' : 'Disconnect'}
                  </button>
                </div>
              </div>

              {/* GA4 KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs">
                    <span>Total Sessions</span>
                    <Globe className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                    {ga4Stats.totalSessions.toLocaleString()}
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium mt-1 inline-block">
                    All acquisition channels
                  </span>
                </div>

                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs">
                    <span>Organic Sessions</span>
                    <Search className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                    {ga4Stats.totalOrganic.toLocaleString()}
                  </div>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1 inline-block">
                    {ga4Stats.totalSessions > 0 ? `${((ga4Stats.totalOrganic / ga4Stats.totalSessions) * 100).toFixed(1)}% of total` : 'Organic search'}
                  </span>
                </div>

                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs">
                    <span>Conversions</span>
                    <CheckCircle2 className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                    {ga4Stats.totalConversions.toLocaleString()}
                  </div>
                  <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium mt-1 inline-block">
                    Goal events completed
                  </span>
                </div>

                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs">
                    <span>Avg. Bounce Rate</span>
                    <TrendingUp className="w-4 h-4 text-purple-500" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                    {ga4Stats.avgBounce}%
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium mt-1 inline-block">
                    Session engagement rate
                  </span>
                </div>
              </div>

              {/* GA4 Table */}
              {ga4Data.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-500">
                  No GA4 traffic rows recorded yet.
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-600 dark:text-slate-300">
                        <tr>
                          <th className="p-3.5">Date</th>
                          <th className="p-3.5 text-right">Total Sessions</th>
                          <th className="p-3.5 text-right">Organic Sessions</th>
                          <th className="p-3.5 text-right">Conversions</th>
                          <th className="p-3.5 text-right">Bounce Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                        {ga4Data.map((row) => (
                          <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                            <td className="p-3.5 font-mono text-slate-900 dark:text-white font-medium">
                              {row.date}
                            </td>
                            <td className="p-3.5 text-right font-medium">
                              {row.sessions.toLocaleString()}
                            </td>
                            <td className="p-3.5 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                              {row.organic_sessions.toLocaleString()}
                            </td>
                            <td className="p-3.5 text-right font-medium text-blue-600 dark:text-blue-400">
                              {row.conversions.toLocaleString()}
                            </td>
                            <td className="p-3.5 text-right font-mono">
                              {Number(row.bounce_rate).toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: CONFIGURE CREDENTIALS */}
      {/* ======================================================== */}
      {activeTab === 'connect' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* GSC Setup Box */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Search className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Google Search Console Setup
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Connect via 1-click Demo or Live Google OAuth
                  </p>
                </div>
              </div>
              {gscIntegration?.is_connected && (
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Connected
                </span>
              )}
            </div>

            {/* 1-Click Demo Option */}
            <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h4 className="text-xs font-bold text-blue-900 dark:text-blue-300">
                  Option 1: Instant Demonstration Mode
                </h4>
              </div>
              <p className="text-[11px] text-blue-700/80 dark:text-blue-400 leading-relaxed">
                Connect immediately without Google Cloud Console setup. Automatically loads authentic search queries, clicks, impressions, and ranking positions for your domain.
              </p>
              <button
                type="button"
                onClick={handleConnectGscDemo}
                disabled={savingGsc}
                className="w-full mt-2 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center justify-center gap-2"
              >
                {savingGsc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>⚡ Connect Instant Demo Mode</span>
              </button>
            </div>

            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
              <span className="bg-white dark:bg-slate-900 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 absolute">
                Or Connect Live Google Account
              </span>
            </div>

            {/* Live Connect Form */}
            <form onSubmit={handleSaveGsc} className="space-y-4">
              {/* Property ID */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  GSC Property Identifier <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={gscPropertyId}
                  onChange={(e) => setGscPropertyId(e.target.value)}
                  placeholder="sc-domain:digi.vartualtutor.com or https://digi.vartualtutor.com/"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Prefix domain properties with <code className="text-blue-500">sc-domain:</code>, or provide full URL <code className="text-blue-500">https://yourdomain.com/</code>.
                </p>
              </div>

              {/* Auth Method Radio */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Authentication Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setGscAuthType('access_token')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border text-center transition ${
                      gscAuthType === 'access_token'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    OAuth Token
                  </button>
                  <button
                    type="button"
                    onClick={() => setGscAuthType('refresh_token')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border text-center transition ${
                      gscAuthType === 'refresh_token'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    OAuth App
                  </button>
                  <button
                    type="button"
                    onClick={() => setGscAuthType('service_account')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border text-center transition ${
                      gscAuthType === 'service_account'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Service Account
                  </button>
                </div>
              </div>

              {/* Sub-form: OAuth Access Token */}
              {gscAuthType === 'access_token' && (
                <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Google OAuth Access Token (Bearer ya29...)
                    </label>
                    <input
                      type="password"
                      value={gscAccessToken}
                      onChange={(e) => setGscAccessToken(e.target.value)}
                      placeholder="ya29.a0AfH6SM..."
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>

                  <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[11px] text-blue-700 dark:text-blue-300 space-y-1">
                    <p className="font-semibold flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5" />
                      Quick 30-Second Token Instructions:
                    </p>
                    <ol className="list-decimal list-inside space-y-0.5 text-[10px] text-slate-600 dark:text-slate-300 pl-1">
                      <li>
                        Open{' '}
                        <a
                          href="https://developers.google.com/oauthplayground/"
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 dark:text-blue-400 underline font-medium inline-flex items-center gap-0.5"
                        >
                          Google OAuth Playground <ArrowUpRight className="w-2.5 h-2.5" />
                        </a>
                      </li>
                      <li>In Step 1, select <strong>Google Search Console API v3</strong> → <code className="font-mono text-[9px]">https://www.googleapis.com/auth/webmasters.readonly</code></li>
                      <li>Click &quot;Authorize APIs&quot;, then in Step 2 click &quot;Exchange authorization code for tokens&quot;.</li>
                      <li>Copy the generated <strong>Access token</strong> and paste above!</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* Sub-form: OAuth App */}
              {gscAuthType === 'refresh_token' && (
                <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Client ID
                    </label>
                    <input
                      type="text"
                      value={gscClientId}
                      onChange={(e) => setGscClientId(e.target.value)}
                      placeholder="e.g. 123456-xxx.apps.googleusercontent.com"
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Client Secret
                    </label>
                    <input
                      type="password"
                      value={gscClientSecret}
                      onChange={(e) => setGscClientSecret(e.target.value)}
                      placeholder="GOCSPX-..."
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Refresh Token
                    </label>
                    <input
                      type="password"
                      value={gscRefreshToken}
                      onChange={(e) => setGscRefreshToken(e.target.value)}
                      placeholder="1//04..."
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Sub-form: Service Account */}
              {gscAuthType === 'service_account' && (
                <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Service Account Email
                    </label>
                    <input
                      type="email"
                      value={gscClientEmail}
                      onChange={(e) => setGscClientEmail(e.target.value)}
                      placeholder="nexusmark-seo@project.iam.gserviceaccount.com"
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Add this Service Account email as a User with &quot;Restricted&quot; or &quot;Full&quot; permissions inside Google Search Console &gt; Settings &gt; Users &amp; Permissions.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={savingGsc}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center justify-center gap-2"
              >
                {savingGsc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                <span>Verify &amp; Save Live GSC Credentials</span>
              </button>
            </form>
          </div>

          {/* GA4 Setup Box */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Google Analytics 4 Setup
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Connect GA4 measurement &amp; organic traffic
                  </p>
                </div>
              </div>
              {ga4Integration?.is_connected && (
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Connected
                </span>
              )}
            </div>

            {/* 1-Click Demo Option */}
            <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-300">
                  Option 1: GA4 Demonstration Mode
                </h4>
              </div>
              <p className="text-[11px] text-amber-700/80 dark:text-amber-400 leading-relaxed">
                Connect immediately without GA4 API verification. Pre-fills realistic organic sessions, conversion counts, and bounce rate tracking.
              </p>
              <button
                type="button"
                onClick={handleConnectGa4Demo}
                disabled={savingGa4}
                className="w-full mt-2 py-2 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center justify-center gap-2"
              >
                {savingGa4 ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>⚡ Connect GA4 Instant Demo Mode</span>
              </button>
            </div>

            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
              <span className="bg-white dark:bg-slate-900 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 absolute">
                Or Connect Live GA4 Property
              </span>
            </div>

            {/* Live GA4 Connect Form */}
            <form onSubmit={handleSaveGa4} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  GA4 Property ID (Numeric) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={ga4PropertyId}
                  onChange={(e) => setGa4PropertyId(e.target.value)}
                  placeholder="e.g. 348291024"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Found in Google Analytics Admin &gt; Property Settings &gt; Property Details.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  OAuth Access Token (Optional if set in environment)
                </label>
                <input
                  type="password"
                  value={ga4AccessToken}
                  onChange={(e) => setGa4AccessToken(e.target.value)}
                  placeholder="ya29.a0AfH6SM..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={savingGa4}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center justify-center gap-2"
              >
                {savingGa4 ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                <span>Verify &amp; Save GA4 Connection</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
