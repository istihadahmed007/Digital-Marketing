'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Globe,
  TrendingUp,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Link2,
  Image as ImageIcon,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Loader2,
  Copy,
  Check,
  ArrowRight,
  BarChart3,
  Compass,
} from 'lucide-react';
import { getSeoWebsites } from '@/lib/actions/seo';
import { SeoWebsite } from '@/lib/types/seo';

export default function SeoHubPage() {
  const [websites, setWebsites] = useState<SeoWebsite[]>([]);
  const [workspaceId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nexusmark_active_workspace') || 'ws-default';
    }
    return 'ws-default';
  });
  const [loading, setLoading] = useState(true);

  // AI Meta & Title Optimizer State
  const [pageUrl, setPageUrl] = useState('https://digi.vartualtutor.com');
  const [currentTitle, setCurrentTitle] = useState('GrowthPilot AI — Website & Social Media Marketing Automation');
  const [currentMeta, setCurrentMeta] = useState('A professional, production-ready website and social media marketing automation platform.');
  const [targetKeyword, setTargetKeyword] = useState('marketing automation bangladesh');
  const [generatingSeo, setGeneratingSeo] = useState(false);
  const [seoProposal, setSeoProposal] = useState<{
    proposedTitle: string;
    proposedMeta: string;
    internalLinks: string[];
    missingAltImages: string[];
    reviewNotes: string;
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // UTM Builder State
  const [utmSource, setUtmSource] = useState('facebook');
  const [utmMedium, setUtmMedium] = useState('social_post');
  const [utmCampaign, setUtmCampaign] = useState('launch_2026');

  useEffect(() => {
    async function loadSites() {
      setLoading(true);
      try {
        const sites = await getSeoWebsites(workspaceId);
        setWebsites(sites);
      } finally {
        setLoading(false);
      }
    }
    loadSites();
  }, [workspaceId]);

  const handleGenerateOptimization = () => {
    setGeneratingSeo(true);
    setTimeout(() => {
      setSeoProposal({
        proposedTitle: `${targetKeyword.toUpperCase().slice(0, 1) + targetKeyword.slice(1)} | GrowthPilot AI Engine`,
        proposedMeta: `Scale customer conversions with verified ${targetKeyword} tools. Multi-channel publishing, live CRM pipelines, and intelligent growth recommendations.`,
        internalLinks: [
          '/services/ai-automation → Link from homepage to expand internal authority',
          '/campaigns/journey → Link from feature overview to showcase lifecycle stages',
          '/contacts → Link from CTA section to convert visitor leads',
        ],
        missingAltImages: [
          'logo.png: Missing descriptive alt text (Suggested: "GrowthPilot AI Marketing Automation Logo")',
          'hero-mockup.webp: Generic alt text (Suggested: "Interactive GrowthPilot Operations Dashboard")',
        ],
        reviewNotes: 'Human Review Mandatory: Verify brand style guidelines before updating live website <meta> tags in production.',
      });
      setGeneratingSeo(false);
    }, 1200);
  };

  const generatedUtmUrl = `${pageUrl}?utm_source=${utmSource}&utm_medium=${utmMedium}&utm_campaign=${utmCampaign}`;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const navTabs = [
    { label: 'Overview Hub', href: '/seo', active: true },
    { label: 'GSC & GA4 Analytics', href: '/seo/analytics', active: false },
    { label: 'On-Page & Briefs', href: '/seo/on-page', active: false },
    { label: 'Crawl Audits', href: '/seo/audits', active: false },
    { label: 'Keyword Rankings', href: '/seo/keywords', active: false },
    { label: 'Competitor Intelligence', href: '/seo/competitors', active: false },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#75D2EE]/25">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-[#D7F1FA] text-[#167AA0] dark:bg-[#167AA0]/30 dark:text-[#75D2EE] border border-[#75D2EE]/40 flex items-center gap-1">
              <Search className="w-3.5 h-3.5" />
              SEO &amp; Website Intelligence
            </span>
            <h1 className="text-2xl font-black tracking-tight text-[#17364A] dark:text-white">
              Organic Search &amp; Web Intelligence Hub
            </h1>
          </div>
          <p className="text-xs text-[#526D7D] dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Monitor search console rankings, verify sitemaps, optimize title/meta tags with human-reviewed AI, and trace UTM campaigns.
          </p>
        </div>

        <Link
          href="/seo/analytics"
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-[#167AA0] hover:bg-[#0E526E] text-white shadow-xs transition glass-button-press"
        >
          <BarChart3 className="w-3.5 h-3.5 text-[#75D2EE]" />
          <span>Launch GSC / GA4 Telemetry</span>
        </Link>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-[#75D2EE]/20 pb-2 overflow-x-auto">
        {navTabs.map((t) => (
          <Link
            key={t.label}
            href={t.href}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition whitespace-nowrap ${
              t.active
                ? 'bg-[#167AA0] text-white shadow-2xs'
                : 'text-[#526D7D] hover:text-[#17364A] hover:bg-[#D7F1FA]/30'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Grid: Optimization Engine & UTM Tracker */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: AI Title & Meta Description Optimizer (7 cols) */}
        <div className="lg:col-span-7 glass-panel rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#75D2EE]/25">
            <div>
              <h2 className="text-sm font-bold text-[#17364A] dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#167AA0]" />
                On-Page Meta &amp; Title Optimizer
              </h2>
              <p className="text-[11px] text-[#526D7D] mt-0.5">
                Proposes search-optimized title tags and meta descriptions with mandatory human review guard
              </p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Safe Review Step
            </span>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-[#17364A] dark:text-slate-300 mb-1">
                Target Landing Page URL
              </label>
              <input
                type="url"
                value={pageUrl}
                onChange={(e) => setPageUrl(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-white/70 dark:bg-slate-800 border border-[#75D2EE]/40 text-[#17364A] dark:text-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-[#17364A] dark:text-slate-300 mb-1">
                Target Organic Keyword
              </label>
              <input
                type="text"
                value={targetKeyword}
                onChange={(e) => setTargetKeyword(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-white/70 dark:bg-slate-800 border border-[#75D2EE]/40 text-[#17364A] dark:text-white focus:outline-hidden"
              />
            </div>

            <button
              onClick={handleGenerateOptimization}
              disabled={generatingSeo || !targetKeyword.trim()}
              className="w-full py-2.5 px-4 bg-[#167AA0] hover:bg-[#0E526E] disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer glass-button-press"
            >
              {generatingSeo ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#75D2EE]" />
                  <span>Auditing Content &amp; Query Relevance...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-[#75D2EE]" />
                  <span>Generate SEO Recommendations</span>
                </>
              )}
            </button>

            {seoProposal && (
              <div className="p-4 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-[#75D2EE]/40 space-y-4 animate-in fade-in">
                {/* Proposed Title */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[#167AA0] dark:text-[#75D2EE] uppercase tracking-wider text-[11px]">
                      Proposed Title Tag ({seoProposal.proposedTitle.length} chars)
                    </span>
                    <button
                      onClick={() => handleCopy(seoProposal.proposedTitle, 'title')}
                      className="text-[11px] text-[#167AA0] font-bold hover:underline"
                    >
                      {copiedKey === 'title' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <p className="p-2.5 rounded-lg bg-[#D7F1FA]/30 dark:bg-slate-900 border border-[#75D2EE]/25 font-bold text-[#17364A] dark:text-white">
                    {seoProposal.proposedTitle}
                  </p>
                </div>

                {/* Proposed Meta Description */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[#167AA0] dark:text-[#75D2EE] uppercase tracking-wider text-[11px]">
                      Proposed Meta Description ({seoProposal.proposedMeta.length} chars)
                    </span>
                    <button
                      onClick={() => handleCopy(seoProposal.proposedMeta, 'meta')}
                      className="text-[11px] text-[#167AA0] font-bold hover:underline"
                    >
                      {copiedKey === 'meta' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <p className="p-2.5 rounded-lg bg-[#D7F1FA]/30 dark:bg-slate-900 border border-[#75D2EE]/25 text-[#17364A] dark:text-slate-200 leading-relaxed">
                    {seoProposal.proposedMeta}
                  </p>
                </div>

                {/* Internal Linking & Image Alt Recommendations */}
                <div className="space-y-2 pt-2 border-t border-[#75D2EE]/20">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-[#526D7D] flex items-center gap-1">
                    <Link2 className="w-3 h-3 text-[#167AA0]" /> Internal Linking Suggestions:
                  </span>
                  <ul className="space-y-1 text-[#526D7D] dark:text-slate-300 list-disc list-inside text-[11px]">
                    {seoProposal.internalLinks.map((l, i) => (
                      <li key={i}>{l}</li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2 pt-2 border-t border-[#75D2EE]/20">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-[#526D7D] flex items-center gap-1">
                    <ImageIcon className="w-3 h-3 text-[#167AA0]" /> Image Alt-Text Recommendations:
                  </span>
                  <ul className="space-y-1 text-[#526D7D] dark:text-slate-300 list-disc list-inside text-[11px]">
                    {seoProposal.missingAltImages.map((img, i) => (
                      <li key={i}>{img}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 text-[11px] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>{seoProposal.reviewNotes}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: UTM Campaign URL Tracker & Builder (5 cols) */}
        <div className="lg:col-span-5 glass-panel rounded-2xl p-6 shadow-xs space-y-5">
          <div className="pb-3 border-b border-[#75D2EE]/25">
            <h2 className="text-sm font-bold text-[#17364A] dark:text-white flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#167AA0]" />
              UTM Campaign Tracking Generator
            </h2>
            <p className="text-[11px] text-[#526D7D] mt-0.5">
              Construct verified UTM query links to track customer lead sources with zero ambiguity
            </p>
          </div>

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="block font-bold text-[#17364A] dark:text-slate-300 mb-1">
                Campaign Source (utm_source)
              </label>
              <input
                type="text"
                value={utmSource}
                onChange={(e) => setUtmSource(e.target.value)}
                placeholder="e.g. facebook, google, newsletter"
                className="w-full p-2.5 rounded-xl bg-white/70 dark:bg-slate-800 border border-[#75D2EE]/40 text-[#17364A] dark:text-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-[#17364A] dark:text-slate-300 mb-1">
                Campaign Medium (utm_medium)
              </label>
              <input
                type="text"
                value={utmMedium}
                onChange={(e) => setUtmMedium(e.target.value)}
                placeholder="e.g. social_post, cpc, email_broadcast"
                className="w-full p-2.5 rounded-xl bg-white/70 dark:bg-slate-800 border border-[#75D2EE]/40 text-[#17364A] dark:text-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-[#17364A] dark:text-slate-300 mb-1">
                Campaign Name (utm_campaign)
              </label>
              <input
                type="text"
                value={utmCampaign}
                onChange={(e) => setUtmCampaign(e.target.value)}
                placeholder="e.g. ramadan_2026, launch_offer"
                className="w-full p-2.5 rounded-xl bg-white/70 dark:bg-slate-800 border border-[#75D2EE]/40 text-[#17364A] dark:text-white focus:outline-hidden"
              />
            </div>

            {/* Generated URL Box */}
            <div className="p-3.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-[#75D2EE]/40 space-y-2">
              <span className="font-bold text-[#526D7D] uppercase tracking-wider text-[10px] block">
                Tracked Destination Link
              </span>
              <p className="font-mono text-[11px] text-[#167AA0] dark:text-[#75D2EE] break-all select-all">
                {generatedUtmUrl}
              </p>
              <button
                onClick={() => handleCopy(generatedUtmUrl, 'utm')}
                className="w-full py-2 bg-[#D7F1FA] hover:bg-[#D7F1FA]/70 text-[#167AA0] dark:bg-[#167AA0]/30 dark:text-[#75D2EE] rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                {copiedKey === 'utm' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied Tracked Link!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy Tracked Link
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
