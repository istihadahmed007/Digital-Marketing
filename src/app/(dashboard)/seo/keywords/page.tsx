'use client';

import React, { useState, useEffect } from 'react';
import { SeoKeyword, SeoWebsite, KeywordIntent } from '@/lib/types/seo';
import {
  getSeoKeywords,
  addSeoKeyword,
  bulkImportKeywordsCsv,
  deleteSeoKeyword,
  getSeoWebsites,
  exportKeywordsReportCsv,
} from '@/lib/actions/seo';
import { EmptyState } from '@/components/crm/EmptyState';
import {
  Key,
  Plus,
  UploadCloud,
  Download,
  Trash2,
  RefreshCw,
  Loader2,
  Search,
  Globe,
  Tag,
  TrendingUp,
  SlidersHorizontal,
  Info,
} from 'lucide-react';
import Papa from 'papaparse';

export default function SeoKeywordsPage() {
  const [keywords, setKeywords] = useState<SeoKeyword[]>([]);
  const [websites, setWebsites] = useState<SeoWebsite[]>([]);
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string>('all');
  const [workspaceId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nexusmark_active_workspace') || 'ws-default';
    }
    return 'ws-default';
  });

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [intentFilter, setIntentFilter] = useState<string>('all');
  const [exporting, setExporting] = useState(false);

  // Add keyword modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [newTargetUrl, setNewTargetUrl] = useState('');
  const [newIntent, setNewIntent] = useState<KeywordIntent>('informational');
  const [newVolume, setNewVolume] = useState<string>('');
  const [newDifficulty, setNewDifficulty] = useState<string>('');
  const [newCpc, setNewCpc] = useState<string>('');
  const [newRank, setNewRank] = useState<string>('');
  const [savingKeyword, setSavingKeyword] = useState(false);

  // CSV Import modal
  const [isCsvOpen, setIsCsvOpen] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [importingCsv, setImportingCsv] = useState(false);

  const fetchData = async (wsId: string, siteId: string) => {
    setLoading(true);
    try {
      const [kwList, siteList] = await Promise.all([
        getSeoKeywords(wsId, siteId),
        getSeoWebsites(wsId),
      ]);
      setKeywords(kwList);
      setWebsites(siteList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(workspaceId, selectedWebsiteId);
  }, [workspaceId, selectedWebsiteId]);

  const handleAddKeyword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim()) return;

    setSavingKeyword(true);
    try {
      const res = await addSeoKeyword(workspaceId, selectedWebsiteId === 'all' ? '' : selectedWebsiteId, newKeyword, {
        target_url: newTargetUrl || undefined,
        intent: newIntent,
        search_volume: newVolume ? parseInt(newVolume, 10) : undefined,
        difficulty: newDifficulty ? parseInt(newDifficulty, 10) : undefined,
        cpc: newCpc ? parseFloat(newCpc) : undefined,
        current_rank: newRank ? parseInt(newRank, 10) : undefined,
        provider: 'Manual Entry',
      });

      if (res.success && res.keyword) {
        setKeywords((prev) => [res.keyword!, ...prev]);
        setIsAddOpen(false);
        setNewKeyword('');
        setNewTargetUrl('');
        setNewVolume('');
        setNewDifficulty('');
        setNewCpc('');
        setNewRank('');
      } else {
        alert(res.error || 'Failed to add keyword');
      }
    } catch (err: any) {
      alert(err.message || 'Error adding keyword');
    } finally {
      setSavingKeyword(false);
    }
  };

  const handleImportCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvContent.trim()) return;

    setImportingCsv(true);
    try {
      const res = await bulkImportKeywordsCsv(
        workspaceId,
        selectedWebsiteId === 'all' ? '' : selectedWebsiteId,
        csvContent
      );
      if (res.success) {
        alert(`Successfully imported ${res.imported} keywords!`);
        setIsCsvOpen(false);
        setCsvContent('');
        await fetchData(workspaceId, selectedWebsiteId);
      } else {
        alert(`Import encountered errors: ${res.errors.join(', ')}`);
      }
    } catch (err: any) {
      alert(err.message || 'Error importing CSV');
    } finally {
      setImportingCsv(false);
    }
  };

  const handleDeleteKeyword = async (id: string) => {
    if (!confirm('Are you sure you want to delete this keyword tracking entry?')) return;
    await deleteSeoKeyword(workspaceId, id);
    setKeywords((prev) => prev.filter((k) => k.id !== id));
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const csv = await exportKeywordsReportCsv(workspaceId, selectedWebsiteId);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nexusmark_keywords_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      alert('Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  const filteredKeywords = keywords.filter((k) => {
    const matchesSearch = k.keyword.toLowerCase().includes(search.toLowerCase());
    const matchesIntent = intentFilter === 'all' || k.intent === intentFilter;
    return matchesSearch && matchesIntent;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              SEO Engine
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Keyword Research & Tracking Workspace
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track search intent, target URLs, search volume, keyword difficulty, CPC, and rankings. Strictly backed by configured providers or verified CSV imports.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCsv}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Export CSV
          </button>

          <button
            onClick={() => setIsCsvOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            Import CSV
          </button>

          <button
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Keyword
          </button>
        </div>
      </div>

      {/* Website Scope & Filters */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tracked keywords..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <div>
            <select
              value={selectedWebsiteId}
              onChange={(e) => setSelectedWebsiteId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            >
              <option value="all">All Workspace Websites</option>
              {websites.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.domain}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={intentFilter}
              onChange={(e) => setIntentFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            >
              <option value="all">All Search Intents</option>
              <option value="informational">Informational</option>
              <option value="commercial">Commercial</option>
              <option value="transactional">Transactional</option>
              <option value="navigational">Navigational</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
          <span>Tracked Keywords: {filteredKeywords.length}</span>
          <span className="flex items-center gap-1 text-slate-400">
            <Info className="w-3 h-3 text-emerald-500" />
            Every metric displays its verified data provider and sync timestamp
          </span>
        </div>
      </div>

      {/* Keywords Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
          <p className="text-xs text-slate-500">Loading keywords...</p>
        </div>
      ) : filteredKeywords.length === 0 ? (
        <EmptyState
          icon={Key}
          title="No keywords tracked yet"
          description="Add your target SEO keywords or import a CSV from Google Search Console or your research tools."
          actionLabel="Add Keyword"
          onAction={() => setIsAddOpen(true)}
        />
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="p-3.5">Keyword</th>
                  <th className="p-3.5">Intent</th>
                  <th className="p-3.5">Target URL</th>
                  <th className="p-3.5">Search Volume</th>
                  <th className="p-3.5">Difficulty (KD)</th>
                  <th className="p-3.5">CPC</th>
                  <th className="p-3.5">Current Rank</th>
                  <th className="p-3.5">Data Provider</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {filteredKeywords.map((kw) => (
                  <tr key={kw.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                      {kw.keyword}
                    </td>

                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {kw.intent}
                      </span>
                    </td>

                    <td className="p-3.5 font-mono text-[11px] text-slate-500 max-w-xs truncate">
                      {kw.target_url || <span className="text-slate-400 italic">—</span>}
                    </td>

                    <td className="p-3.5 font-semibold">
                      {kw.search_volume !== null ? kw.search_volume.toLocaleString() : <span className="text-slate-400">—</span>}
                    </td>

                    <td className="p-3.5">
                      {kw.difficulty !== null ? (
                        <span className={`font-bold ${kw.difficulty > 70 ? 'text-red-500' : kw.difficulty > 40 ? 'text-amber-500' : 'text-emerald-500'}`}>
                          {kw.difficulty}%
                        </span>
                      ) : <span className="text-slate-400">—</span>}
                    </td>

                    <td className="p-3.5 font-mono">
                      {kw.cpc !== null ? `$${kw.cpc.toFixed(2)}` : <span className="text-slate-400">—</span>}
                    </td>

                    <td className="p-3.5">
                      {kw.current_rank ? (
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          #{kw.current_rank}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Unranked</span>
                      )}
                    </td>

                    <td className="p-3.5">
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">
                        {kw.provider}
                      </span>
                      {kw.last_updated_at && (
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {new Date(kw.last_updated_at).toLocaleDateString()}
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => handleDeleteKeyword(kw.id)}
                        className="text-slate-400 hover:text-red-500"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Keyword Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Add Keyword to Tracker
              </h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 text-xs">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddKeyword} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Keyword *
                </label>
                <input
                  type="text"
                  required
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="e.g. b2b marketing automation"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target URL
                </label>
                <input
                  type="url"
                  value={newTargetUrl}
                  onChange={(e) => setNewTargetUrl(e.target.value)}
                  placeholder="https://example.com/automation"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Search Intent
                  </label>
                  <select
                    value={newIntent}
                    onChange={(e) => setNewIntent(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="informational">Informational</option>
                    <option value="commercial">Commercial</option>
                    <option value="transactional">Transactional</option>
                    <option value="navigational">Navigational</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Current Rank
                  </label>
                  <input
                    type="number"
                    value={newRank}
                    onChange={(e) => setNewRank(e.target.value)}
                    placeholder="e.g. 4"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Volume</label>
                  <input
                    type="number"
                    value={newVolume}
                    onChange={(e) => setNewVolume(e.target.value)}
                    placeholder="2400"
                    className="w-full px-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">KD (0-100)</label>
                  <input
                    type="number"
                    value={newDifficulty}
                    onChange={(e) => setNewDifficulty(e.target.value)}
                    placeholder="45"
                    className="w-full px-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">CPC ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newCpc}
                    onChange={(e) => setNewCpc(e.target.value)}
                    placeholder="3.50"
                    className="w-full px-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-500 rounded-lg hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingKeyword}
                  className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-xl"
                >
                  {savingKeyword ? 'Saving...' : 'Add Keyword'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {isCsvOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Import Keywords via CSV
              </h3>
              <button onClick={() => setIsCsvOpen(false)} className="text-slate-400 text-xs">
                ✕
              </button>
            </div>

            <form onSubmit={handleImportCsv} className="space-y-3">
              <p className="text-xs text-slate-500">
                Paste CSV text with headers: <code>keyword,intent,volume,difficulty,cpc,rank</code>
              </p>

              <textarea
                rows={8}
                required
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                placeholder={`keyword,intent,volume,difficulty,cpc,rank\nenterprise crm,commercial,4500,62,8.50,12\ndigital marketing automation,informational,8100,55,4.20,5`}
                className="w-full font-mono text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCsvOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-500 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={importingCsv}
                  className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-xl"
                >
                  {importingCsv ? 'Importing...' : 'Run Import'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
