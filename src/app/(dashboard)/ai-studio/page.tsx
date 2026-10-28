'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Share2,
  Video,
  FileText,
  Mail,
  Copy,
  Check,
  Calendar,
  Save,
  Clock,
  Send,
  AlertCircle,
  Loader2,
  RefreshCw,
  Globe,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Languages,
  Layers,
} from 'lucide-react';
import {
  PlatformType,
  ContentLanguage,
  BrandVoice,
  GeneratedContentVariation,
  ContentGenerationResult,
} from '@/lib/types/content-studio';
import {
  generateStudioContentAction,
  saveSocialPost,
} from '@/lib/actions/content-studio';

export default function AiContentStudioPage() {
  const [workspaceId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nexusmark_active_workspace') || 'ws-default';
    }
    return 'ws-default';
  });

  // Generator form inputs
  const [platform, setPlatform] = useState<PlatformType>('facebook');
  const [topicOrPage, setTopicOrPage] = useState('GrowthPilot AI Marketing Automation Platform');
  const [sourceType, setSourceType] = useState<'website_page' | 'product' | 'service' | 'campaign' | 'custom_topic'>('website_page');
  const [targetUrl, setTargetUrl] = useState('https://digi.vartualtutor.com');
  const [language, setLanguage] = useState<ContentLanguage>('both');
  const [brandVoice, setBrandVoice] = useState<BrandVoice>('persuasive');
  const [targetAudience, setTargetAudience] = useState('Business owners and digital marketing agencies');
  const [callToAction, setCallToAction] = useState('Explore the live marketing engine');
  const [variationsCount, setVariationsCount] = useState<number>(2);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<ContentGenerationResult | null>(null);
  const [selectedVariationId, setSelectedVariationId] = useState<string | null>(null);

  // Editor state for selected variation
  const [editableBody, setEditableBody] = useState('');
  const [editableBodyBn, setEditableBodyBn] = useState('');
  const [editableHook, setEditableHook] = useState('');
  const [editableCta, setEditableCta] = useState('');
  const [editableHashtags, setEditableHashtags] = useState<string[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicOrPage.trim()) return;

    setIsGenerating(true);
    setSaveStatus(null);
    try {
      const res = await generateStudioContentAction(workspaceId, {
        platform,
        topicOrPage,
        sourceType,
        targetUrl,
        language,
        brandVoice,
        targetAudience,
        callToAction,
        variationsCount,
      });

      setResult(res);
      if (res.variations && res.variations.length > 0) {
        selectVariation(res.variations[0]);
      }
    } catch (err: any) {
      alert(`Generation error: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const selectVariation = (v: GeneratedContentVariation) => {
    setSelectedVariationId(v.id);
    setEditableHook(v.hook);
    setEditableBody(v.body);
    setEditableBodyBn(v.bodyBn || '');
    setEditableCta(v.callToAction);
    setEditableHashtags(v.hashtags || []);
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveToCalendar = async (approvalStatus: 'draft' | 'pending_approval' = 'draft') => {
    setSaveStatus('saving');
    try {
      const res = await saveSocialPost(workspaceId, {
        title: `${platform.toUpperCase()} - ${topicOrPage.slice(0, 40)}`,
        platform,
        content: editableBody,
        content_bn: editableBodyBn,
        hook: editableHook,
        call_to_action: editableCta,
        hashtags: editableHashtags,
        target_url: targetUrl,
        language,
        approval_status: approvalStatus,
        publishing_status: 'draft',
      });

      if (res.success) {
        setSaveStatus(approvalStatus === 'pending_approval' ? 'Submitted for approval!' : 'Saved to Calendar drafts!');
        setTimeout(() => setSaveStatus(null), 4000);
      } else {
        alert(res.error || 'Failed to save');
        setSaveStatus(null);
      }
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
      setSaveStatus(null);
    }
  };

  const platformIcons: Record<PlatformType, any> = {
    facebook: Share2,
    instagram: Share2,
    youtube_shorts: Video,
    tiktok: Video,
    blog: FileText,
    email: Mail,
    creative_brief: Sparkles,
  };

  const platformLabels: Record<PlatformType, string> = {
    facebook: 'Facebook Post',
    instagram: 'Instagram Caption',
    youtube_shorts: 'YouTube Shorts (9:16)',
    tiktok: 'TikTok Script Outline',
    blog: 'Blog Outline & SEO Brief',
    email: 'Email Campaign Draft',
    creative_brief: 'Creative Visual Brief',
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#75D2EE]/25">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-[#D7F1FA] text-[#167AA0] dark:bg-[#167AA0]/30 dark:text-[#75D2EE] border border-[#75D2EE]/40 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              GrowthPilot AI Studio
            </span>
            <h1 className="text-2xl font-black tracking-tight text-[#17364A] dark:text-white">
              AI Content Studio
            </h1>
          </div>
          <p className="text-xs text-[#526D7D] dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Generate high-retention marketing captions, video shot lists, and SEO briefs formatted specifically for each channel in Bangla and English.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/calendar"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-white/80 dark:bg-slate-800 border border-[#75D2EE]/40 text-[#17364A] dark:text-slate-200 hover:bg-[#D7F1FA]/30 transition shadow-xs"
          >
            <Calendar className="w-3.5 h-3.5 text-[#167AA0]" />
            <span>Open Marketing Calendar</span>
          </Link>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Configuration Controls (5 Cols) */}
        <div className="lg:col-span-5 glass-panel rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#17364A] dark:text-white flex items-center gap-2">
              <Languages className="w-4 h-4 text-[#167AA0]" />
              Campaign &amp; Target Setup
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200">
              Bilingual (EN + BN)
            </span>
          </div>

          <form onSubmit={handleGenerate} className="space-y-4">
            {/* Target Platform */}
            <div>
              <label className="block text-xs font-bold text-[#17364A] dark:text-slate-300 mb-1.5">
                Target Channel &amp; Format
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(platformLabels) as PlatformType[]).slice(0, 6).map((p) => {
                  const Icon = platformIcons[p];
                  const isSelected = platform === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPlatform(p)}
                      className={`p-2.5 rounded-xl border text-left text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                        isSelected
                          ? 'bg-[#167AA0] text-white border-[#167AA0] shadow-2xs'
                          : 'bg-white/60 dark:bg-slate-800/40 text-[#526D7D] dark:text-slate-300 border-[#75D2EE]/30 hover:border-[#167AA0]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{p.replace('_', ' ').toUpperCase()}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Source Type & Topic */}
            <div>
              <label className="block text-xs font-bold text-[#17364A] dark:text-slate-300 mb-1.5">
                Target Topic, Page, or Offer
              </label>
              <input
                type="text"
                value={topicOrPage}
                onChange={(e) => setTopicOrPage(e.target.value)}
                placeholder="e.g. Free SEO Audit & Growth Consulting"
                className="w-full px-3 py-2 text-xs rounded-xl bg-white/70 dark:bg-slate-800 border border-[#75D2EE]/40 text-[#17364A] dark:text-white focus:outline-hidden focus:border-[#167AA0]"
                required
              />
            </div>

            {/* Target URL */}
            <div>
              <label className="block text-xs font-bold text-[#17364A] dark:text-slate-300 mb-1.5">
                Destination URL / Landing Page
              </label>
              <input
                type="url"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://digi.vartualtutor.com/offer"
                className="w-full px-3 py-2 text-xs rounded-xl bg-white/70 dark:bg-slate-800 border border-[#75D2EE]/40 text-[#17364A] dark:text-white focus:outline-hidden focus:border-[#167AA0]"
              />
            </div>

            {/* Dual Language & Brand Voice */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#17364A] dark:text-slate-300 mb-1.5">
                  Output Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as ContentLanguage)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white/70 dark:bg-slate-800 border border-[#75D2EE]/40 text-[#17364A] dark:text-white focus:outline-hidden focus:border-[#167AA0]"
                >
                  <option value="both">Bilingual (English + বাংলা)</option>
                  <option value="bn">বাংলা (Bangla Only)</option>
                  <option value="en">English Only</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#17364A] dark:text-slate-300 mb-1.5">
                  Brand Voice Tone
                </label>
                <select
                  value={brandVoice}
                  onChange={(e) => setBrandVoice(e.target.value as BrandVoice)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white/70 dark:bg-slate-800 border border-[#75D2EE]/40 text-[#17364A] dark:text-white focus:outline-hidden focus:border-[#167AA0]"
                >
                  <option value="persuasive">Persuasive / High-Converting</option>
                  <option value="b2b_professional">B2B Professional &amp; Authoritative</option>
                  <option value="conversational">Conversational &amp; Relatable</option>
                  <option value="educational">Educational / Step-by-Step</option>
                  <option value="playful">High Energy &amp; Viral</option>
                </select>
              </div>
            </div>

            {/* Preferred CTA */}
            <div>
              <label className="block text-xs font-bold text-[#17364A] dark:text-slate-300 mb-1.5">
                Preferred Call to Action (CTA)
              </label>
              <input
                type="text"
                value={callToAction}
                onChange={(e) => setCallToAction(e.target.value)}
                placeholder="e.g. Click link below to claim free access"
                className="w-full px-3 py-2 text-xs rounded-xl bg-white/70 dark:bg-slate-800 border border-[#75D2EE]/40 text-[#17364A] dark:text-white focus:outline-hidden focus:border-[#167AA0]"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isGenerating || !topicOrPage.trim()}
              className="w-full py-2.5 px-4 rounded-xl bg-[#167AA0] hover:bg-[#0E526E] disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition glass-button-press cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#75D2EE]" />
                  <span>Synthesizing Multi-Format Content...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-[#75D2EE]" />
                  <span>Generate Platform Variations</span>
                </>
              )}
            </button>
          </form>

          {/* Provider & Cost Disclosure */}
          <div className="p-3 bg-[#D7F1FA]/30 dark:bg-slate-800/40 rounded-xl border border-[#75D2EE]/30 text-[11px] text-[#526D7D] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Provider-Independent Engine
            </span>
            <span className="font-mono text-[#167AA0] font-bold">
              {result ? `${result.modelUsed}` : 'OpenAI / Gemini / Formulas'}
            </span>
          </div>
        </div>

        {/* Right Column: Interactive Editor & Variation Viewer (7 Cols) */}
        <div className="lg:col-span-7 glass-panel-opaque rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-5">
          {result && result.variations.length > 0 ? (
            <div className="space-y-4">
              {/* Variation Selector Tabs */}
              <div className="flex items-center justify-between pb-3 border-b border-[#75D2EE]/25">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#17364A] dark:text-white">Variations:</span>
                  {result.variations.map((v, idx) => (
                    <button
                      key={v.id}
                      onClick={() => selectVariation(v)}
                      className={`px-3 py-1 text-xs font-bold rounded-xl transition cursor-pointer ${
                        selectedVariationId === v.id
                          ? 'bg-[#167AA0] text-white shadow-2xs'
                          : 'bg-white/60 dark:bg-slate-800 text-[#526D7D] hover:text-[#17364A]'
                      }`}
                    >
                      Option {idx + 1}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="font-mono text-[#526D7D]">
                    {editableBody.length} chars
                  </span>
                  <button
                    onClick={() => handleCopy(`${editableHook}\n\n${editableBody}\n\n${editableHashtags.join(' ')}`, 'all')}
                    className="p-1.5 rounded-lg bg-white/80 dark:bg-slate-800 hover:bg-[#D7F1FA]/50 border border-[#75D2EE]/30 text-[#17364A] dark:text-slate-300 transition cursor-pointer"
                    title="Copy full copy"
                  >
                    {copiedKey === 'all' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Hook Editor */}
              <div>
                <label className="block text-xs font-bold text-[#526D7D] uppercase tracking-wider mb-1">
                  Opening Hook (Scroll Stopper)
                </label>
                <input
                  type="text"
                  value={editableHook}
                  onChange={(e) => setEditableHook(e.target.value)}
                  className="w-full p-2.5 text-xs font-bold rounded-xl bg-white/70 dark:bg-slate-800 border border-[#75D2EE]/30 text-[#17364A] dark:text-white focus:outline-hidden focus:border-[#167AA0]"
                />
              </div>

              {/* Main Body (English / Platform Native) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-[#526D7D] uppercase tracking-wider">
                    Content Body (English Draft)
                  </label>
                  <button
                    onClick={() => handleCopy(editableBody, 'body')}
                    className="text-[11px] text-[#167AA0] font-bold hover:underline"
                  >
                    {copiedKey === 'body' ? 'Copied!' : 'Copy Body'}
                  </button>
                </div>
                <textarea
                  rows={6}
                  value={editableBody}
                  onChange={(e) => setEditableBody(e.target.value)}
                  className="w-full p-3 text-xs font-sans rounded-xl bg-white/70 dark:bg-slate-800 border border-[#75D2EE]/30 text-[#17364A] dark:text-white focus:outline-hidden focus:border-[#167AA0] leading-relaxed resize-y"
                />
              </div>

              {/* Bangla Translation / Adaptation */}
              {editableBodyBn && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-[#167AA0] dark:text-[#75D2EE] uppercase tracking-wider flex items-center gap-1">
                      <Languages className="w-3.5 h-3.5" />
                      বাংলা কনটেন্ট সংস্করণ (Bangla Adaptation)
                    </label>
                    <button
                      onClick={() => handleCopy(editableBodyBn, 'bodyBn')}
                      className="text-[11px] text-[#167AA0] font-bold hover:underline"
                    >
                      {copiedKey === 'bodyBn' ? 'Copied!' : 'কপি করুন'}
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={editableBodyBn}
                    onChange={(e) => setEditableBodyBn(e.target.value)}
                    className="w-full p-3 text-xs font-sans rounded-xl bg-white/70 dark:bg-slate-800 border border-[#75D2EE]/30 text-[#17364A] dark:text-white focus:outline-hidden focus:border-[#167AA0] leading-relaxed resize-y"
                  />
                </div>
              )}

              {/* Hashtag Suggestions */}
              <div>
                <label className="block text-xs font-bold text-[#526D7D] uppercase tracking-wider mb-1">
                  Recommended Hashtags
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 bg-white/50 dark:bg-slate-800/40 rounded-xl border border-[#75D2EE]/25">
                  {editableHashtags.map((h, i) => (
                    <span
                      key={i}
                      className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-[#D7F1FA] text-[#167AA0] dark:bg-[#167AA0]/30 dark:text-[#75D2EE]"
                    >
                      {h}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Buttons: Save to Calendar & Submit Approval */}
              <div className="pt-4 border-t border-[#75D2EE]/25 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSaveToCalendar('draft')}
                    disabled={saveStatus === 'saving'}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-white/80 dark:bg-slate-800 hover:bg-[#D7F1FA]/40 border border-[#75D2EE]/40 text-[#17364A] dark:text-slate-200 transition shadow-xs cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5 text-[#167AA0]" />
                    <span>Save to Calendar Drafts</span>
                  </button>

                  <button
                    onClick={() => handleSaveToCalendar('pending_approval')}
                    disabled={saveStatus === 'saving'}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-[#167AA0] hover:bg-[#0E526E] text-white transition shadow-xs cursor-pointer glass-button-press"
                  >
                    <Send className="w-3.5 h-3.5 text-[#75D2EE]" />
                    <span>Submit for Approval</span>
                  </button>
                </div>

                {saveStatus && (
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {saveStatus}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#D7F1FA] dark:bg-sky-950/60 text-[#167AA0] dark:text-sky-400 flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-[#17364A] dark:text-white">
                Content Studio Ready
              </h3>
              <p className="text-xs text-[#526D7D] max-w-sm leading-relaxed">
                Configure your target channel on the left and click &ldquo;Generate Platform Variations&rdquo; to draft high-converting copy in English and Bangla.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
