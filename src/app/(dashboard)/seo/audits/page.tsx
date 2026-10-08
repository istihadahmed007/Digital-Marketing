'use client';

import React, { useState, useEffect } from 'react';
import { SeoWebsite, SeoAudit, SeoAuditPage, SeoAuditIssue } from '@/lib/types/seo';
import {
  getSeoWebsites,
  addSeoWebsite,
  verifySeoWebsite,
  deleteSeoWebsite,
  getSeoAudits,
  getSeoAuditDetails,
  triggerWebsiteAudit,
  exportSeoAuditReportCsv,
} from '@/lib/actions/seo';
import {
  Search,
  Globe,
  Plus,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  Play,
  Download,
  Loader2,
  RefreshCw,
  ExternalLink,
  Trash2,
  FileText,
  Clock,
  ArrowRight,
} from 'lucide-react';

export default function SeoAuditsPage() {
  const [websites, setWebsites] = useState<SeoWebsite[]>([]);
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string>('');
  const [audits, setAudits] = useState<SeoAudit[]>([]);
  const [selectedAuditId, setSelectedAuditId] = useState<string>('');
  const [auditDetails, setAuditDetails] = useState<{
    audit: SeoAudit | null;
    pages: SeoAuditPage[];
    issues: SeoAuditIssue[];
  }>({ audit: null, pages: [], issues: [] });

  const [workspaceId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nexusmark_active_workspace') || 'ws-default';
    }
    return 'ws-default';
  });

  const [loading, setLoading] = useState(true);
  const [auditing, setAuditing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'issues' | 'pages'>('issues');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'warning' | 'notice'>('all');

  // New site modal
  const [isAddSiteOpen, setIsAddSiteOpen] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [newSitemap, setNewSitemap] = useState('');
  const [savingSite, setSavingSite] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState<string | null>(null);

  const fetchWebsites = async (wsId: string) => {
    setLoading(true);
    try {
      const siteList = await getSeoWebsites(wsId);
      setWebsites(siteList);
      if (siteList.length > 0) {
        const activeId = selectedWebsiteId || siteList[0].id;
        setSelectedWebsiteId(activeId);
        await fetchAudits(wsId, activeId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAudits = async (wsId: string, siteId: string) => {
    try {
      const auditList = await getSeoAudits(wsId, siteId);
      setAudits(auditList);
      if (auditList.length > 0) {
        const latestId = auditList[0].id;
        setSelectedAuditId(latestId);
        const details = await getSeoAuditDetails(wsId, latestId);
        setAuditDetails(details);
      } else {
        setSelectedAuditId('');
        setAuditDetails({ audit: null, pages: [], issues: [] });
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchWebsites(workspaceId);
  }, [workspaceId]);

  const handleSelectWebsite = async (siteId: string) => {
    setSelectedWebsiteId(siteId);
    await fetchAudits(workspaceId, siteId);
  };

  const handleSelectAudit = async (auditId: string) => {
    setSelectedAuditId(auditId);
    const details = await getSeoAuditDetails(workspaceId, auditId);
    setAuditDetails(details);
  };

  const handleAddWebsite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim()) return;

    setSavingSite(true);
    try {
      const res = await addSeoWebsite(workspaceId, newDomain, newSitemap || undefined);
      if (res.success && res.website) {
        setWebsites((prev) => [res.website!, ...prev]);
        setSelectedWebsiteId(res.website.id);
        setIsAddSiteOpen(false);
        setNewDomain('');
        setNewSitemap('');
        await fetchAudits(workspaceId, res.website.id);
      } else {
        alert(res.error || 'Failed to add website');
      }
    } catch (err: any) {
      alert(err.message || 'Error adding website');
    } finally {
      setSavingSite(false);
    }
  };

  const handleVerifyWebsite = async (siteId: string) => {
    setVerificationFeedback(null);
    try {
      const res = await verifySeoWebsite(workspaceId, siteId);
      if (res.success) {
        setVerificationFeedback(res.message || 'Website verified successfully!');
        setWebsites((prev) =>
          prev.map((s) => (s.id === siteId ? { ...s, is_verified: true } : s))
        );
      } else {
        alert(res.error || 'Verification failed. Please ensure the meta tag is installed.');
      }
    } catch (err: any) {
      alert(err.message || 'Verification error');
    } finally {
      setTimeout(() => setVerificationFeedback(null), 4000);
    }
  };

  const handleTriggerAudit = async () => {
    if (!selectedWebsiteId) return;
    setAuditing(true);
    try {
      const res = await triggerWebsiteAudit(workspaceId, selectedWebsiteId, { maxPages: 15 });
      if (res.success && res.auditId) {
        await fetchAudits(workspaceId, selectedWebsiteId);
      } else {
        alert(res.error || 'Audit crawl failed');
      }
    } catch (err: any) {
      alert(err.message || 'Error running crawl');
    } finally {
      setAuditing(false);
    }
  };

  const handleExportCsv = async () => {
    if (!selectedAuditId) return;
    setExporting(true);
    try {
      const csv = await exportSeoAuditReportCsv(workspaceId, selectedAuditId);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nexusmark_seo_audit_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      alert('Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  const selectedSite = websites.find((w) => w.id === selectedWebsiteId);
  const activeAudit = auditDetails.audit;
  const filteredIssues = auditDetails.issues.filter((i) => {
    if (severityFilter === 'all') return true;
    return i.severity === severityFilter;
  });

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
              Website SEO Audit & Crawler
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real website crawler verifying HTTP status, indexability, title tags, meta descriptions, headings, images, schema markup, and robots directives.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {activeAudit && (
            <button
              onClick={handleExportCsv}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Export Audit CSV
            </button>
          )}

          <button
            onClick={() => setIsAddSiteOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Website
          </button>
        </div>
      </div>

      {verificationFeedback && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{verificationFeedback}</span>
        </div>
      )}

      {/* Website Selector & Verification Banner */}
      {websites.length > 0 && selectedSite && (
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedWebsiteId}
                  onChange={(e) => handleSelectWebsite(e.target.value)}
                  className="font-bold text-sm bg-transparent border-0 focus:ring-0 text-slate-900 dark:text-white p-0 cursor-pointer"
                >
                  {websites.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.domain}
                    </option>
                  ))}
                </select>

                <span
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                    selectedSite.is_verified
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
                      : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400'
                  }`}
                >
                  {selectedSite.is_verified ? 'Verified Ownership' : 'Pending Verification'}
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Audit Token: <code className="font-mono text-[10px]">{selectedSite.verification_token}</code>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!selectedSite.is_verified && (
              <button
                onClick={() => handleVerifyWebsite(selectedSite.id)}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <ShieldCheck className="w-3.5 h-3.5" /> Verify Ownership
              </button>
            )}

            <button
              onClick={handleTriggerAudit}
              disabled={auditing}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
            >
              {auditing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Crawling Site...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" /> Start New Audit
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Audit Score & Overview */}
      {activeAudit ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                SEO Health Score
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <span
                  className={`text-3xl font-black ${
                    activeAudit.health_score >= 80
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : activeAudit.health_score >= 60
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {activeAudit.health_score}%
                </span>
                <span className="text-xs text-slate-400">out of 100</span>
              </div>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Pages Crawled
              </span>
              <p className="text-3xl font-black text-slate-900 dark:text-white mt-2">
                {activeAudit.pages_crawled}
              </p>
              <span className="text-xs text-slate-500">Rate limit: 250ms</span>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Issues Detected
              </span>
              <p className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-2">
                {activeAudit.issues_count}
              </p>
              <span className="text-xs text-slate-500">Across inspected pages</span>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Audit History
              </span>
              <select
                value={selectedAuditId}
                onChange={(e) => handleSelectAudit(e.target.value)}
                className="w-full mt-2 p-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              >
                {audits.map((a) => (
                  <option key={a.id} value={a.id}>
                    {new Date(a.started_at).toLocaleDateString()} ({a.health_score}%)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <button
              onClick={() => setActiveTab('issues')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                activeTab === 'issues'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Detected Issues ({auditDetails.issues.length})
            </button>
            <button
              onClick={() => setActiveTab('pages')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                activeTab === 'pages'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Crawled Pages ({auditDetails.pages.length})
            </button>
          </div>

          {/* TAB 1: ISSUES LIST */}
          {activeTab === 'issues' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {(['all', 'critical', 'warning', 'notice'] as const).map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setSeverityFilter(sev)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg capitalize transition ${
                      severityFilter === sev
                        ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {sev} ({auditDetails.issues.filter((i) => (sev === 'all' ? true : i.severity === sev)).length})
                  </button>
                ))}
              </div>

              {filteredIssues.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-500">
                  No issues found in this category.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredIssues.map((issue) => (
                    <div
                      key={issue.id}
                      className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase border ${
                              issue.severity === 'critical'
                                ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400'
                                : issue.severity === 'warning'
                                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400'
                                : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400'
                            }`}
                          >
                            {issue.severity}
                          </span>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            {issue.title}
                          </h4>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono line-clamp-1 max-w-xs">
                          {issue.url}
                        </span>
                      </div>

                      <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs space-y-1">
                        <div className="text-slate-500 text-[11px]">
                          <strong>Evidence:</strong> <span className="font-mono">{issue.evidence}</span>
                        </div>
                        <div className="text-slate-700 dark:text-slate-300">
                          <strong>Fix Guidance:</strong> {issue.recommendation}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CRAWLED PAGES */}
          {activeTab === 'pages' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-600 dark:text-slate-300">
                    <tr>
                      <th className="p-3">Status</th>
                      <th className="p-3">URL</th>
                      <th className="p-3">Title Tag</th>
                      <th className="p-3">H1 Heading</th>
                      <th className="p-3">Images (Missing Alt)</th>
                      <th className="p-3">Speed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {auditDetails.pages.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                              p.status_code === 200
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                            }`}
                          >
                            {p.status_code || 'Err'}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[11px] max-w-xs truncate">
                          <a href={p.url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                            {p.url}
                          </a>
                        </td>
                        <td className="p-3 max-w-xs truncate">
                          {p.title || <span className="text-red-500 italic">Missing</span>}
                          {p.title_length ? (
                            <span className="text-slate-400 text-[10px] block">({p.title_length} chars)</span>
                          ) : null}
                        </td>
                        <td className="p-3 max-w-xs truncate">
                          {p.h1 || <span className="text-amber-500 italic">Missing</span>}
                        </td>
                        <td className="p-3">
                          {p.images_count} ({p.images_missing_alt} missing)
                        </td>
                        <td className="p-3 font-mono text-slate-500">
                          {p.load_time_ms}ms
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-500 space-y-3">
          <Globe className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
          <p className="text-sm font-semibold">No audit history found for this website</p>
          <p className="text-xs max-w-md mx-auto">
            Click &ldquo;Start New Audit&rdquo; to crawl your domain pages, inspect indexability, and generate a comprehensive SEO health report.
          </p>
        </div>
      )}

      {/* Add Website Modal */}
      {isAddSiteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Add Website for SEO Auditing
              </h3>
              <button onClick={() => setIsAddSiteOpen(false)} className="text-slate-400 text-xs">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddWebsite} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Website Domain *
                </label>
                <input
                  type="text"
                  required
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="e.g. example.com"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Optional Sitemap URL
                </label>
                <input
                  type="url"
                  value={newSitemap}
                  onChange={(e) => setNewSitemap(e.target.value)}
                  placeholder="https://example.com/sitemap.xml"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddSiteOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-500 rounded-lg hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSite}
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl"
                >
                  {savingSite ? 'Adding...' : 'Add Website'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
