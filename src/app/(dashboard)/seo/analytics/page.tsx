'use client';

import React, { useState, useEffect } from 'react';
import { SeoWebsite, SeoGscData, SeoGa4Data, SeoIntegration } from '@/lib/types/seo';
import {
  getSeoWebsites,
  getSeoIntegrations,
  saveSeoIntegration,
  getGscPerformanceData,
  getGa4AnalyticsData,
} from '@/lib/actions/seo';
import {
  BarChart3,
  Search,
  Globe,
  TrendingUp,
  Sliders,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Loader2,
  Plug,
  Calendar,
  Lock,
} from 'lucide-react';

export default function SeoAnalyticsPage() {
  const [websites, setWebsites] = useState<SeoWebsite[]>([]);
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string>('');
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

  // Connect form state
  const [gscPropertyId, setGscPropertyId] = useState('');
  const [gscClientEmail, setGscClientEmail] = useState('');
  const [savingGsc, setSavingGsc] = useState(false);

  const [ga4PropertyId, setGa4PropertyId] = useState('');
  const [savingGa4, setSavingGa4] = useState(false);

  const fetchData = async (wsId: string) => {
    setLoading(true);
    try {
      const [siteList, integList] = await Promise.all([
        getSeoWebsites(wsId),
        getSeoIntegrations(wsId),
      ]);
      setWebsites(siteList);
      setIntegrations(integList);

      const siteId = siteList[0]?.id || '';
      setSelectedWebsiteId(siteId);

      if (siteId) {
        const [gsc, ga4] = await Promise.all([
          getGscPerformanceData(wsId, siteId),
          getGa4AnalyticsData(wsId, siteId),
        ]);
        setGscData(gsc);
        setGa4Data(ga4);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(workspaceId);
  }, [workspaceId]);

  const gscIntegration = integrations.find((i) => i.provider === 'google_search_console');
  const ga4Integration = integrations.find((i) => i.provider === 'google_analytics_4');

  const handleSaveGsc = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGsc(true);
    try {
      const res = await saveSeoIntegration(
        workspaceId,
        'google_search_console',
        gscClientEmail || 'Google Search Console Account',
        gscPropertyId,
        { clientEmail: gscClientEmail },
        true
      );
      if (res.success) {
        alert('Google Search Console configuration saved!');
        await fetchData(workspaceId);
      }
    } catch (err: any) {
      alert(err.message || 'Error saving GSC configuration');
    } finally {
      setSavingGsc(false);
    }
  };

  const handleSaveGa4 = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGa4(true);
    try {
      const res = await saveSeoIntegration(
        workspaceId,
        'google_analytics_4',
        'Google Analytics 4 Property',
        ga4PropertyId,
        {},
        true
      );
      if (res.success) {
        alert('Google Analytics 4 configuration saved!');
        await fetchData(workspaceId);
      }
    } catch (err: any) {
      alert(err.message || 'Error saving GA4 configuration');
    } finally {
      setSavingGa4(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              SEO Analytics
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Google Search Console & GA4 Performance
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Import actual queries, clicks, impressions, and average position from authorized Google properties.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('connect')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <Plug className="w-3.5 h-3.5" />
            Provider Settings
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('gsc')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
            activeTab === 'gsc'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Google Search Console
        </button>
        <button
          onClick={() => setActiveTab('ga4')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
            activeTab === 'ga4'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Google Analytics 4 (Organic)
        </button>
        <button
          onClick={() => setActiveTab('connect')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
            activeTab === 'connect'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Configure Credentials
        </button>
      </div>

      {/* TAB 1: GOOGLE SEARCH CONSOLE */}
      {activeTab === 'gsc' && (
        <div className="space-y-4">
          {!gscIntegration?.is_connected ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Connect Google Search Console
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Connect your verified property through Google Service Account or OAuth credentials to import live queries, clicks, impressions, CTR, and average position.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('connect')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 shadow-xs transition"
              >
                Configure GSC Connection
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                <span>Property: <strong className="text-slate-900 dark:text-white">{gscIntegration.property_id}</strong></span>
                <span className="text-[11px] font-mono text-emerald-600">✓ Connected & Synchronized</span>
              </div>

              {gscData.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-500">
                  No query data returned for this property in the requested date range.
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-600 dark:text-slate-300">
                        <tr>
                          <th className="p-3.5">Top Queries</th>
                          <th className="p-3.5">Clicks</th>
                          <th className="p-3.5">Impressions</th>
                          <th className="p-3.5">CTR</th>
                          <th className="p-3.5">Average Position</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                        {gscData.map((row) => (
                          <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                            <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                              {row.query}
                            </td>
                            <td className="p-3.5 font-semibold text-blue-600 dark:text-blue-400">
                              {row.clicks.toLocaleString()}
                            </td>
                            <td className="p-3.5">
                              {row.impressions.toLocaleString()}
                            </td>
                            <td className="p-3.5">
                              {(row.ctr * 100).toFixed(2)}%
                            </td>
                            <td className="p-3.5 font-mono">
                              {row.average_position.toFixed(1)}
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

      {/* TAB 2: GOOGLE ANALYTICS 4 */}
      {activeTab === 'ga4' && (
        <div className="space-y-4">
          {!ga4Integration?.is_connected ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Connect Google Analytics 4 (GA4)
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Connect your GA4 property to view authentic organic search traffic, engaged sessions, and conversions without estimating.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('connect')}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 shadow-xs transition"
              >
                Configure GA4 Connection
              </button>
            </div>
          ) : (
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-500">
              GA4 Property: <strong className="text-slate-900 dark:text-white">{ga4Integration.property_id}</strong>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CREDENTIALS CONFIGURATION */}
      {activeTab === 'connect' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* GSC Config Box */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Google Search Console Setup
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Provide your verified GSC Property ID and authorized service account email.
            </p>

            <form onSubmit={handleSaveGsc} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  GSC Property URL / Domain
                </label>
                <input
                  type="text"
                  required
                  value={gscPropertyId}
                  onChange={(e) => setGscPropertyId(e.target.value)}
                  placeholder="sc-domain:yourcompany.com"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Service Account Email (Optional)
                </label>
                <input
                  type="email"
                  value={gscClientEmail}
                  onChange={(e) => setGscClientEmail(e.target.value)}
                  placeholder="nexusmark-seo@your-project.iam.gserviceaccount.com"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <button
                type="submit"
                disabled={savingGsc}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
              >
                {savingGsc ? 'Saving...' : 'Save GSC Connection'}
              </button>
            </form>
          </div>

          {/* GA4 Config Box */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Google Analytics 4 Setup
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Connect your GA4 measurement or Property ID.
            </p>

            <form onSubmit={handleSaveGa4} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  GA4 Property ID
                </label>
                <input
                  type="text"
                  required
                  value={ga4PropertyId}
                  onChange={(e) => setGa4PropertyId(e.target.value)}
                  placeholder="e.g. 123456789"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <button
                type="submit"
                disabled={savingGa4}
                className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold shadow-xs transition"
              >
                {savingGa4 ? 'Saving...' : 'Save GA4 Connection'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
