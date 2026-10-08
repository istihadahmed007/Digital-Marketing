'use client';

import React, { useState, useEffect } from 'react';
import { Contact, Company } from '@/lib/types/crm';
import { getContacts } from '@/lib/actions/contacts';
import { getCompanies } from '@/lib/actions/companies';
import {
  generateOutreachDraft,
  analyzeDealHealth,
  generateAccountBriefing,
  OutreachDraftResult,
  DealHealthAssessment,
  AccountBriefingResult,
} from '@/lib/actions/ai-tools';
import {
  Sparkles,
  Mail,
  Activity,
  Building2,
  Copy,
  Check,
  ShieldCheck,
  AlertTriangle,
  Clock,
  ArrowRight,
  Loader2,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';

export default function AiToolsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [workspaceId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('nexusmark_active_workspace') || 'ws-default'
      );
    }
    return 'ws-default';
  });
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Tab State
  const [activeTab, setActiveTab] = useState<'outreach' | 'deals' | 'briefing'>('outreach');

  // Tool 1: Outreach Generator State
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [objective, setObjective] = useState<'cold_outreach' | 'proposal_followup' | 're_engagement' | 'check_in'>('cold_outreach');
  const [outreachLoading, setOutreachLoading] = useState(false);
  const [outreachDraft, setOutreachDraft] = useState<OutreachDraftResult | null>(null);
  const [copiedOutreach, setCopiedOutreach] = useState(false);

  // Tool 2: Deal Health State
  const [dealAssessments, setDealAssessments] = useState<DealHealthAssessment[]>([]);
  const [dealsLoading, setDealsLoading] = useState(false);

  // Tool 3: Account Briefing State
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [accountBriefing, setAccountBriefing] = useState<AccountBriefingResult | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoadingInitial(true);
      try {
        const [cList, compList] = await Promise.all([
          getContacts(workspaceId),
          getCompanies(workspaceId),
        ]);
        setContacts(cList);
        setCompanies(compList);
        if (cList.length > 0) setSelectedContactId(cList[0].id);
        if (compList.length > 0) setSelectedCompanyId(compList[0].id);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingInitial(false);
      }
    }
    loadData();
  }, [workspaceId]);

  // Handler for Outreach Generation
  const handleGenerateOutreach = async () => {
    if (!selectedContactId) return;
    setOutreachLoading(true);
    try {
      const res = await generateOutreachDraft(workspaceId, selectedContactId, {
        objective,
      });
      if (res.success && res.draft) {
        setOutreachDraft(res.draft);
      } else {
        alert(res.error || 'Failed to generate outreach');
      }
    } catch (err: any) {
      alert(err.message || 'Error generating draft');
    } finally {
      setOutreachLoading(false);
    }
  };

  // Handler for Deal Health Scan
  const handleScanDeals = async () => {
    setDealsLoading(true);
    try {
      const res = await analyzeDealHealth(workspaceId);
      if (res.success && res.assessments) {
        setDealAssessments(res.assessments);
      } else {
        alert(res.error || 'Failed to analyze deals');
      }
    } catch (err: any) {
      alert(err.message || 'Error analyzing deals');
    } finally {
      setDealsLoading(false);
    }
  };

  // Handler for Account Briefing
  const handleGenerateBriefing = async () => {
    if (!selectedCompanyId) return;
    setBriefingLoading(true);
    try {
      const res = await generateAccountBriefing(workspaceId, selectedCompanyId);
      if (res.success && res.briefing) {
        setAccountBriefing(res.briefing);
      } else {
        alert(res.error || 'Failed to generate briefing');
      }
    } catch (err: any) {
      alert(err.message || 'Error generating briefing');
    } finally {
      setBriefingLoading(false);
    }
  };

  // Run deal scan when switching to deals tab if empty
  useEffect(() => {
    if (activeTab === 'deals' && dealAssessments.length === 0) {
      handleScanDeals();
    }
  }, [activeTab]);

  const copyText = (txt: string) => {
    navigator.clipboard.writeText(txt);
    setCopiedOutreach(true);
    setTimeout(() => setCopiedOutreach(false), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              Phase 2 Live
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              AI Growth Intelligence Hub
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Grounded intelligence assistants powered strictly by verified workspace CRM contacts, deals, and activity records.
          </p>
        </div>

        {/* Grounding guarantee badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4" /> Zero Hallucinated Metrics
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('outreach')}
          className={`px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition ${
            activeTab === 'outreach'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          Outreach Email Assistant
        </button>

        <button
          onClick={() => setActiveTab('deals')}
          className={`px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition ${
            activeTab === 'deals'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          Deal Health & Stagnation Radar
        </button>

        <button
          onClick={() => setActiveTab('briefing')}
          className={`px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition ${
            activeTab === 'briefing'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          Executive Account Briefing
        </button>
      </div>

      {/* TAB 1: OUTREACH GENERATOR */}
      {activeTab === 'outreach' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Configure Outreach Target
            </h2>

            {/* Select Contact */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Select Contact from CRM Directory
              </label>
              <select
                value={selectedContactId}
                onChange={(e) => setSelectedContactId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              >
                {contacts.length === 0 ? (
                  <option value="">No contacts in workspace</option>
                ) : (
                  contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name} ({c.email}) {c.company ? `— ${c.company.name}` : ''}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Outreach Objective */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Outreach Objective
              </label>
              <select
                value={objective}
                onChange={(e) => setObjective(e.target.value as any)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              >
                <option value="cold_outreach">Initial Cold Outreach (Growth Proposition)</option>
                <option value="proposal_followup">Proposal Follow-Up (Close Discussion)</option>
                <option value="re_engagement">Re-engagement (Cold Lead Revival)</option>
                <option value="check_in">Account Milestone Check-In</option>
              </select>
            </div>

            <button
              onClick={handleGenerateOutreach}
              disabled={outreachLoading || !selectedContactId}
              className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-xs transition flex items-center justify-center gap-2"
            >
              {outreachLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Synthesizing CRM Facts...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Generate Personalized Draft
                </>
              )}
            </button>
          </div>

          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
            {outreachDraft ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="text-xs text-slate-500">
                    Drafted for <strong className="text-slate-900 dark:text-white">{outreachDraft.contactName}</strong> at{' '}
                    <strong className="text-slate-900 dark:text-white">{outreachDraft.companyName}</strong>
                  </div>
                  <button
                    onClick={() => copyText(`${outreachDraft.subject}\n\n${outreachDraft.body}`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition"
                  >
                    {copiedOutreach ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy Email
                      </>
                    )}
                  </button>
                </div>

                {/* Grounded facts box */}
                <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Grounded Database Evidence:
                  </span>
                  <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-0.5 list-disc list-inside">
                    {outreachDraft.groundedFacts.map((fact, idx) => (
                      <li key={idx}>{fact}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Subject Line
                  </label>
                  <p className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs font-medium text-slate-900 dark:text-white">
                    {outreachDraft.subject}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Email Body
                  </label>
                  <pre className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs font-sans whitespace-pre-wrap text-slate-800 dark:text-slate-200 leading-relaxed border border-slate-200 dark:border-slate-700/60">
                    {outreachDraft.body}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400 space-y-3">
                <Mail className="w-10 h-10 text-slate-300 dark:text-slate-700" />
                <p className="text-sm font-medium">No draft generated yet</p>
                <p className="text-xs max-w-sm">
                  Select a contact and click &ldquo;Generate Personalized Draft&rdquo; to create grounded outreach emails based on their timeline notes.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DEAL HEALTH & STAGNATION RADAR */}
      {activeTab === 'deals' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Evaluates deal velocity, inactivity windows, and proposal linger times across active pipeline opportunities.
            </p>
            <button
              onClick={handleScanDeals}
              disabled={dealsLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg transition"
            >
              {dealsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Re-scan Deals
            </button>
          </div>

          {dealsLoading ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-3" />
              <p className="text-sm text-slate-500">Scanning deals for pipeline stagnation...</p>
            </div>
          ) : dealAssessments.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-500">
              No open deals found to analyze in this workspace. Create deals in the pipeline to run stagnation checks.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {dealAssessments.map((item) => (
                <div
                  key={item.dealId}
                  className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                        {item.dealTitle}
                      </h3>
                      <span className="text-xs text-slate-500">{item.companyName}</span>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${
                        item.riskScore === 'Critical'
                          ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800'
                          : item.riskScore === 'High'
                          ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
                          : item.riskScore === 'Medium'
                          ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                      }`}
                    >
                      {item.riskScore} Risk
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                    <div>
                      <span className="text-slate-400">Amount:</span>
                      <p className="font-bold text-slate-900 dark:text-white">
                        ${item.amount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Silent Period:</span>
                      <p className="font-bold text-slate-900 dark:text-white">
                        {item.daysSinceLastActivity} days
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Observed Factors
                    </span>
                    <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1 list-disc list-inside">
                      {item.riskFactors.map((f, idx) => (
                        <li key={idx} className="line-clamp-2">{f}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block mb-1">
                      Recommended Action:
                    </span>
                    <p className="text-slate-800 dark:text-slate-200 font-medium">
                      {item.recommendedAction}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ACCOUNT BRIEFING */}
      {activeTab === 'briefing' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-500" />
              Target Organization
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Select Company Account
              </label>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              >
                {companies.length === 0 ? (
                  <option value="">No companies in workspace</option>
                ) : (
                  companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.domain ? `(${c.domain})` : ''}
                    </option>
                  ))
                )}
              </select>
            </div>

            <button
              onClick={handleGenerateBriefing}
              disabled={briefingLoading || !selectedCompanyId}
              className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-xs transition flex items-center justify-center gap-2"
            >
              {briefingLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Analyzing Account...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Generate Account Briefing
                </>
              )}
            </button>
          </div>

          <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
            {accountBriefing ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Executive Briefing: {accountBriefing.companyName}
                  </h3>
                  {accountBriefing.domain && (
                    <span className="text-xs text-slate-400 font-mono">
                      {accountBriefing.domain}
                    </span>
                  )}
                </div>

                {/* Account metrics */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                    <span className="text-[11px] text-slate-400 uppercase font-bold">Contacts</span>
                    <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                      {accountBriefing.totalContacts}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                    <span className="text-[11px] text-slate-400 uppercase font-bold">Open Pipeline</span>
                    <p className="text-base font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                      ${accountBriefing.openPipelineValue.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                    <span className="text-[11px] text-slate-400 uppercase font-bold">Won Business</span>
                    <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      ${accountBriefing.wonRevenue.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Executive Narrative
                  </h4>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                    {accountBriefing.summary}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Key Account Insights
                    </h4>
                    <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-disc list-inside">
                      {accountBriefing.keyInsights.map((ki, idx) => (
                        <li key={idx}>{ki}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Strategic Next Steps
                    </h4>
                    <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-disc list-inside">
                      {accountBriefing.actionItems.map((act, idx) => (
                        <li key={idx}>{act}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400 space-y-3">
                <Building2 className="w-10 h-10 text-slate-300 dark:text-slate-700" />
                <p className="text-sm font-medium">No account briefing loaded</p>
                <p className="text-xs max-w-sm">
                  Select an organization from your directory to aggregate stakeholders, active deal stages, and strategic next steps.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
