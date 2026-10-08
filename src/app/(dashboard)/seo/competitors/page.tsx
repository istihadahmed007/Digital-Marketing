'use client';

import React, { useState, useEffect } from 'react';
import {
  getSeoWebsites,
  compareCompetitorPages,
  getBacklinkProviderStatus,
} from '@/lib/actions/seo';
import { SeoWebsite, CompetitorComparisonResult } from '@/lib/types/seo';
import {
  GitCompare,
  Link2,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Clock,
  FileText,
  Layers,
  Zap,
  Plug,
} from 'lucide-react';

export default function CompetitorsAndBacklinksPage() {
  const [workspaceId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nexusmark_active_workspace') || 'ws-default';
    }
    return 'ws-default';
  });

  const [websites, setWebsites] = useState<SeoWebsite[]>([]);
  const [backlinkStatus, setBacklinkStatus] = useState<{
    isConnected: boolean;
    provider: string | null;
    accountName: string | null;
    message: string;
  } | null>(null);

  const [myUrl, setMyUrl] = useState('');
  const [competitorUrl, setCompetitorUrl] = useState('');
  const [isComparing, setIsComparing] = useState(false);
  const [comparison, setComparison] = useState<CompetitorComparisonResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!workspaceId) return;
    async function loadData() {
      const [sites, status] = await Promise.all([
        getSeoWebsites(workspaceId),
        getBacklinkProviderStatus(workspaceId),
      ]);
      setWebsites(sites);
      setBacklinkStatus(status);
      if (sites.length > 0 && !myUrl) {
        setMyUrl(`https://${sites[0].domain}`);
      }
    }
    loadData();
  }, [workspaceId]);

  const handleCompare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) return;
    if (!myUrl.trim() || !competitorUrl.trim()) {
      setErrorMsg('Please specify both your target URL and the competitor URL.');
      return;
    }

    setErrorMsg('');
    setIsComparing(true);
    setComparison(null);

    const res = await compareCompetitorPages(workspaceId, myUrl, competitorUrl);
    setIsComparing(false);

    if (!res.success || !res.comparison) {
      setErrorMsg(res.error || 'Failed to compare URLs.');
    } else {
      setComparison(res.comparison);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">
          <GitCompare className="w-4 h-4" />
          <span>Competitive Intelligence & Links</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Backlinks & Competitor Architecture
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Compare live page architectures against organic rivals and audit external backlink provider status.
        </p>
      </div>

      {/* Backlink Data Source Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl ${
              backlinkStatus?.isConnected
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                : 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'
            }`}>
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Backlink Indexing Provider
                </h2>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  backlinkStatus?.isConnected
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                }`}>
                  {backlinkStatus?.isConnected ? 'Active Provider' : 'Unconfigured'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {backlinkStatus?.message || 'Loading provider connection status...'}
              </p>
            </div>
          </div>

          <a
            href="/integrations"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 transition-colors"
          >
            <Plug className="w-3.5 h-3.5" />
            <span>Configure Provider</span>
          </a>
        </div>

        {!backlinkStatus?.isConnected && (
          <div className="mt-4 p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-300 space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Strict Data Integrity Policy</span>
            </div>
            <p className="leading-relaxed">
              NexusMark strictly prohibits generating mock link graphs, synthetic domain ratings, or fabricated competitor backlink profiles. To access backlink indices, configure an authorized data provider (e.g. DataForSEO API or OpenPageRank).
            </p>
            <div className="text-[11px] font-mono bg-white dark:bg-slate-950 p-2.5 rounded-lg border border-amber-200/60 dark:border-amber-900/50 text-slate-700 dark:text-slate-300">
              Required Environment Variables: <span className="text-indigo-600 dark:text-indigo-400 font-semibold">DATAFORSEO_LOGIN</span>, <span className="text-indigo-600 dark:text-indigo-400 font-semibold">DATAFORSEO_PASSWORD</span>
            </div>
          </div>
        )}
      </div>

      {/* Live Site-Crawl Comparison Section */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-6">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-indigo-600" />
            <span>Live Competitor On-Page Architecture Comparison</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Perform an authentic, direct HTML crawl comparing your landing page against any public competitor page. Inspect content depth, speed signals, heading hierarchy, and structured data differences.
          </p>
        </div>

        <form onSubmit={handleCompare} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Your Page URL
              </label>
              <input
                type="url"
                value={myUrl}
                onChange={(e) => setMyUrl(e.target.value)}
                placeholder="https://yourdomain.com/landing-page"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-mono text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                required
              />
              {websites.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <span className="text-[10px] text-slate-400">Verified sites:</span>
                  {websites.map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setMyUrl(`https://${w.domain}`)}
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      {w.domain}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Competitor URL
              </label>
              <input
                type="url"
                value={competitorUrl}
                onChange={(e) => setCompetitorUrl(e.target.value)}
                placeholder="https://competitor.com/competing-page"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-mono text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isComparing}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            {isComparing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Crawling & Analyzing Both Pages...</span>
              </>
            ) : (
              <>
                <GitCompare className="w-4 h-4" />
                <span>Run Live Crawl Comparison</span>
              </>
            )}
          </button>
        </form>

        {/* Comparison Output */}
        {comparison && (
          <div className="space-y-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            {/* Actionable Insights */}
            {comparison.insights.length > 0 && (
              <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-950 dark:text-indigo-200">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>Comparative Architectural Insights</span>
                </div>
                <ul className="space-y-1.5">
                  {comparison.insights.map((insight, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-indigo-900 dark:text-indigo-300">
                      <ArrowRight className="w-3 h-3 text-indigo-500 shrink-0 mt-0.5" />
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Side-by-Side Comparison Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* My Page Card */}
              <div className="p-5 rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/20 dark:bg-indigo-950/10 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-indigo-100 dark:border-indigo-900/40">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      Your Page
                    </span>
                    <h3 className="text-xs font-mono text-slate-800 dark:text-slate-200 truncate max-w-xs" title={comparison.myUrl}>
                      {comparison.myUrl}
                    </h3>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300">
                    HTTP {comparison.myPage?.status_code || 200}
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Title Tag</span>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {comparison.myPage?.title || <span className="text-rose-500">Missing Title</span>}
                    </p>
                    <span className="text-[10px] text-slate-500">{comparison.myPage?.title_length || 0} characters</span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Primary Heading (H1)</span>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {comparison.myPage?.h1 || <span className="text-rose-500">Missing H1</span>}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Content Depth</span>
                      <span className="text-base font-bold text-slate-900 dark:text-white">
                        {comparison.myPage?.word_count || 0}
                      </span>
                      <span className="text-[10px] text-slate-400 block">words</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Server Speed</span>
                      <span className="text-base font-bold text-slate-900 dark:text-white">
                        {comparison.myPage?.load_time_ms || 0}ms
                      </span>
                      <span className="text-[10px] text-slate-400 block">load time</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-500 block">H2 Subheadings</span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {comparison.myPage?.h2_count || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Internal Links</span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {comparison.myPage?.internal_links_count || 0}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Schema.org JSON-LD</span>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {comparison.myPage?.has_schema ? (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Structured Data Present ({comparison.myPage.structured_data_types.join(', ') || 'Detected'})
                        </span>
                      ) : (
                        <span className="text-slate-400">No JSON-LD Detected</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Competitor Page Card */}
              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                      Competitor Page
                    </span>
                    <h3 className="text-xs font-mono text-slate-800 dark:text-slate-200 truncate max-w-xs" title={comparison.competitorUrl}>
                      {comparison.competitorUrl}
                    </h3>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                    HTTP {comparison.competitorPage?.status_code || 200}
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Title Tag</span>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {comparison.competitorPage?.title || <span className="text-rose-500">Missing Title</span>}
                    </p>
                    <span className="text-[10px] text-slate-500">{comparison.competitorPage?.title_length || 0} characters</span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Primary Heading (H1)</span>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {comparison.competitorPage?.h1 || <span className="text-rose-500">Missing H1</span>}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Content Depth</span>
                      <span className="text-base font-bold text-slate-900 dark:text-white">
                        {comparison.competitorPage?.word_count || 0}
                      </span>
                      <span className="text-[10px] text-slate-400 block">words</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Server Speed</span>
                      <span className="text-base font-bold text-slate-900 dark:text-white">
                        {comparison.competitorPage?.load_time_ms || 0}ms
                      </span>
                      <span className="text-[10px] text-slate-400 block">load time</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-500 block">H2 Subheadings</span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {comparison.competitorPage?.h2_count || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Internal Links</span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {comparison.competitorPage?.internal_links_count || 0}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Schema.org JSON-LD</span>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {comparison.competitorPage?.has_schema ? (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Structured Data Present ({comparison.competitorPage.structured_data_types.join(', ') || 'Detected'})
                        </span>
                      ) : (
                        <span className="text-slate-400">No JSON-LD Detected</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
