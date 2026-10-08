'use client';

import React, { useState, useEffect } from 'react';
import { SeoContentBrief, SeoWebsite } from '@/lib/types/seo';
import {
  analyzeLivePageOnDemand,
  getSeoContentBriefs,
  createSeoContentBrief,
  getSeoWebsites,
} from '@/lib/actions/seo';
import {
  FileText,
  Search,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Plus,
  Sparkles,
  ExternalLink,
  Sliders,
  Target,
  ArrowRight,
} from 'lucide-react';

export default function SeoOnPagePage() {
  const [websites, setWebsites] = useState<SeoWebsite[]>([]);
  const [briefs, setBriefs] = useState<SeoContentBrief[]>([]);
  const [workspaceId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nexusmark_active_workspace') || 'ws-default';
    }
    return 'ws-default';
  });

  const [activeTab, setActiveTab] = useState<'analyzer' | 'briefs'>('analyzer');

  // Live Analyzer State
  const [analyzerUrl, setAnalyzerUrl] = useState('');
  const [targetKeyword, setTargetKeyword] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  // Content Brief Modal State
  const [isBriefModalOpen, setIsBriefModalOpen] = useState(false);
  const [briefTitle, setBriefTitle] = useState('');
  const [briefKeyword, setBriefKeyword] = useState('');
  const [briefUrl, setBriefUrl] = useState('');
  const [briefWordCount, setBriefWordCount] = useState('1500');
  const [briefOutline, setBriefOutline] = useState('');
  const [savingBrief, setSavingBrief] = useState(false);

  useEffect(() => {
    async function loadData() {
      const [siteList, briefList] = await Promise.all([
        getSeoWebsites(workspaceId),
        getSeoContentBriefs(workspaceId),
      ]);
      setWebsites(siteList);
      setBriefs(briefList);
      if (siteList.length > 0 && !analyzerUrl) {
        setAnalyzerUrl(`https://${siteList[0].domain}`);
      }
    }
    loadData();
  }, [workspaceId]);

  const handleRunAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!analyzerUrl.trim()) return;

    setAnalyzing(true);
    setAnalysisResult(null);

    try {
      const res = await analyzeLivePageOnDemand(analyzerUrl, targetKeyword);
      if (res.success) {
        setAnalysisResult(res);
      } else {
        alert(res.error || 'Failed to inspect page');
      }
    } catch (err: any) {
      alert(err.message || 'Inspection error');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCreateBrief = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!briefTitle.trim() || !briefKeyword.trim()) return;

    setSavingBrief(true);
    try {
      const res = await createSeoContentBrief(workspaceId, {
        title: briefTitle,
        target_keyword: briefKeyword,
        target_url: briefUrl || undefined,
        word_count_target: parseInt(briefWordCount, 10) || 1500,
        brief_content: {
          contentOutline: briefOutline,
        },
        recommendations: [
          `Include target keyword "${briefKeyword}" in H1 and Title tag`,
          'Structure primary sections under H2 headings with related semantically relevant queries',
          'Aim for comprehensive coverage of user search intent',
        ],
      });

      if (res.success && res.brief) {
        setBriefs((prev) => [res.brief!, ...prev]);
        setIsBriefModalOpen(false);
        setBriefTitle('');
        setBriefKeyword('');
        setBriefUrl('');
        setBriefOutline('');
      } else {
        alert(res.error || 'Failed to create brief');
      }
    } catch (err: any) {
      alert(err.message || 'Error saving brief');
    } finally {
      setSavingBrief(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              SEO Engine
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              On-Page SEO & Content Planning
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time live page DOM analyzer and target keyword coverage checker with structured content briefs.
          </p>
        </div>

        <button
          onClick={() => setIsBriefModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition"
        >
          <Plus className="w-3.5 h-3.5" />
          Create Content Brief
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('analyzer')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
            activeTab === 'analyzer'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Live Page Analyzer
        </button>
        <button
          onClick={() => setActiveTab('briefs')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
            activeTab === 'briefs'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Content Briefs ({briefs.length})
        </button>
      </div>

      {/* TAB 1: LIVE ANALYZER */}
      {activeTab === 'analyzer' && (
        <div className="space-y-6">
          <form
            onSubmit={handleRunAnalysis}
            className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Page URL to Inspect *
                </label>
                <input
                  type="url"
                  required
                  value={analyzerUrl}
                  onChange={(e) => setAnalyzerUrl(e.target.value)}
                  placeholder="https://yourcompany.com/product"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Optional Target Keyword
                </label>
                <input
                  type="text"
                  value={targetKeyword}
                  onChange={(e) => setTargetKeyword(e.target.value)}
                  placeholder="e.g. b2b marketing software"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={analyzing}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Fetching Live HTML...
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" /> Analyze Live Page
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Analysis Results Display */}
          {analysisResult && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Score & Check Summary */}
              <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  On-Page Optimization Score
                </span>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-4xl font-black ${
                      analysisResult.keywordScore >= 80
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : analysisResult.keywordScore >= 50
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {analysisResult.keywordScore}%
                  </span>
                  <span className="text-xs text-slate-400">Target Benchmark</span>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Page Telemetry:
                  </span>
                  <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                    <div>Status: <strong className="font-mono">{analysisResult.page.status_code}</strong></div>
                    <div>Word Count: <strong>{analysisResult.page.word_count} words</strong></div>
                    <div>Response Time: <strong>{analysisResult.page.load_time_ms}ms</strong></div>
                    <div>Images: <strong>{analysisResult.page.images_count} ({analysisResult.page.images_missing_alt} missing alt)</strong></div>
                  </div>
                </div>
              </div>

              {/* Checklist */}
              <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  On-Page Verification Checklist
                </h3>

                <div className="space-y-2.5">
                  {analysisResult.checks.map((chk: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl flex items-start gap-3 text-xs"
                    >
                      <div className="mt-0.5 shrink-0">
                        {chk.status === 'pass' && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        )}
                        {chk.status === 'warning' && (
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                        )}
                        {chk.status === 'fail' && (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {chk.item}
                        </span>
                        <span className="text-slate-600 dark:text-slate-400 mt-0.5 block leading-relaxed">
                          {chk.message}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CONTENT BRIEFS */}
      {activeTab === 'briefs' && (
        <div className="space-y-4">
          {briefs.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-500 space-y-2">
              <FileText className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
              <p className="text-sm font-semibold">No content briefs created yet</p>
              <p className="text-xs">
                Create structured SEO briefs to plan your articles, landing pages, and target keyword intent.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {briefs.map((b) => (
                <div
                  key={b.id}
                  className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {b.title}
                      </h3>
                      <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                        Target KW: &ldquo;{b.target_keyword}&rdquo;
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {b.status}
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 space-y-1">
                    <div>Target Word Count: <strong>{b.word_count_target} words</strong></div>
                    {b.target_url && <div>Target URL: <span className="font-mono">{b.target_url}</span></div>}
                  </div>

                  {b.recommendations && b.recommendations.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <span className="text-[11px] font-bold text-slate-400 block mb-1">
                        Key Recommendations:
                      </span>
                      <ul className="text-slate-600 dark:text-slate-400 space-y-1 list-disc list-inside">
                        {b.recommendations.map((rec, idx) => (
                          <li key={idx}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Brief Modal */}
      {isBriefModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Create SEO Content Brief
              </h3>
              <button onClick={() => setIsBriefModalOpen(false)} className="text-slate-400 text-xs">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBrief} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Brief Title *
                </label>
                <input
                  type="text"
                  required
                  value={briefTitle}
                  onChange={(e) => setBriefTitle(e.target.value)}
                  placeholder="e.g. Definitive Guide to B2B Lead Nurturing"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Primary Keyword *
                  </label>
                  <input
                    type="text"
                    required
                    value={briefKeyword}
                    onChange={(e) => setBriefKeyword(e.target.value)}
                    placeholder="b2b lead nurturing"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Target Word Count
                  </label>
                  <input
                    type="number"
                    value={briefWordCount}
                    onChange={(e) => setBriefWordCount(e.target.value)}
                    placeholder="1500"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Publication URL
                </label>
                <input
                  type="url"
                  value={briefUrl}
                  onChange={(e) => setBriefUrl(e.target.value)}
                  placeholder="https://example.com/blog/lead-nurturing"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Content Outline / Topic Headings
                </label>
                <textarea
                  rows={4}
                  value={briefOutline}
                  onChange={(e) => setBriefOutline(e.target.value)}
                  placeholder="- H2: What is B2B Lead Nurturing?\n- H2: 5 Best Email Sequences\n- H2: Measuring Attribution"
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBriefModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-500 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingBrief}
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl"
                >
                  {savingBrief ? 'Creating...' : 'Save Content Brief'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
