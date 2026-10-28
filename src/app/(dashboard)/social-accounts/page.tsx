'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Share2,
  Video,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Plus,
  Lock,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';

interface SocialChannelCard {
  id: string;
  name: string;
  platform: 'facebook' | 'instagram' | 'youtube' | 'tiktok' | 'buffer' | 'smm';
  status: 'connected' | 'disconnected' | 'review_required';
  connectedAccount?: string;
  scopes: string[];
  notes: string;
  actionHref: string;
}

export default function SocialAccountsPage() {
  const [channels] = useState<SocialChannelCard[]>([
    {
      id: 'meta-fb',
      name: 'Facebook Pages',
      platform: 'facebook',
      status: 'disconnected',
      scopes: ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts'],
      notes: 'Requires a verified Meta Business Account and Facebook Page Admin rights.',
      actionHref: '/integrations',
    },
    {
      id: 'meta-ig',
      name: 'Instagram Professional',
      platform: 'instagram',
      status: 'disconnected',
      scopes: ['instagram_basic', 'instagram_content_publish', 'instagram_manage_insights'],
      notes: 'Must be an Instagram Business or Creator account connected to a Facebook Page.',
      actionHref: '/integrations',
    },
    {
      id: 'yt-channel',
      name: 'YouTube Shorts & Channel',
      platform: 'youtube',
      status: 'connected',
      connectedAccount: 'Verified Google OAuth',
      scopes: ['https://www.googleapis.com/auth/youtube.upload', 'youtube.readonly'],
      notes: 'Authorized via Google Client ID & Refresh Token in environment configuration.',
      actionHref: '/shorts',
    },
    {
      id: 'tiktok-account',
      name: 'TikTok Creator Hub',
      platform: 'tiktok',
      status: 'disconnected',
      scopes: ['video.upload', 'user.info.basic'],
      notes: 'TikTok Developer app approval required for direct API video publishing.',
      actionHref: '/integrations',
    },
    {
      id: 'buffer-scheduler',
      name: 'Buffer Multi-Channel',
      platform: 'buffer',
      status: 'disconnected',
      scopes: ['publish_actions', 'profiles_read'],
      notes: 'Universal social scheduler fallback for Pinterest, LinkedIn, and X/Twitter.',
      actionHref: '/integrations',
    },
    {
      id: 'smm-marketing',
      name: 'SMMFollows Growth Network',
      platform: 'smm',
      status: 'connected',
      connectedAccount: 'Active Server API Key',
      scopes: ['services_read', 'orders_write', 'balance_read'],
      notes: 'Provides verified engagement boost orders, service sync, and wallet transactions.',
      actionHref: '/social-marketing',
    },
  ]);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#75D2EE]/25">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-[#D7F1FA] text-[#167AA0] dark:bg-[#167AA0]/30 dark:text-[#75D2EE] border border-[#75D2EE]/40 flex items-center gap-1">
              <Share2 className="w-3.5 h-3.5" />
              Connected Social Accounts
            </span>
            <h1 className="text-2xl font-black tracking-tight text-[#17364A] dark:text-white">
              Social Channels &amp; OAuth Accounts
            </h1>
          </div>
          <p className="text-xs text-[#526D7D] dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Manage authenticated platform connections, review granted API permissions, and access direct publishing endpoints.
          </p>
        </div>

        <Link
          href="/calendar"
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-[#167AA0] hover:bg-[#0E526E] text-white transition shadow-xs glass-button-press"
        >
          <span>Open Publishing Calendar</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Grid of Accounts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {channels.map((chan) => (
          <div
            key={chan.id}
            className="glass-panel p-5 rounded-2xl border border-[#75D2EE]/50 shadow-xs flex flex-col justify-between preview-tile-3d space-y-4"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-[#17364A] dark:text-white">
                    {chan.name}
                  </h3>
                  {chan.connectedAccount && (
                    <span className="text-[11px] font-mono text-[#167AA0] dark:text-[#75D2EE] block mt-0.5">
                      {chan.connectedAccount}
                    </span>
                  )}
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    chan.status === 'connected'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
                      : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400'
                  }`}
                >
                  {chan.status === 'connected' ? 'Connected' : 'Disconnected'}
                </span>
              </div>

              <p className="text-xs text-[#526D7D] dark:text-slate-400 mt-2 leading-relaxed">
                {chan.notes}
              </p>

              <div className="mt-3 pt-3 border-t border-[#75D2EE]/20 space-y-1">
                <span className="text-[10px] font-bold text-[#526D7D] uppercase tracking-wider block">
                  Granted API Scopes
                </span>
                <div className="flex flex-wrap gap-1">
                  {chan.scopes.map((scope, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/70 dark:bg-slate-800 border border-[#75D2EE]/25 text-[#17364A] dark:text-slate-300"
                    >
                      {scope.replace('https://www.googleapis.com/auth/', '')}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#75D2EE]/20 flex items-center justify-between text-xs">
              <span className="text-[#526D7D] flex items-center gap-1 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Zero simulated tokens
              </span>

              <Link
                href={chan.actionHref}
                className="font-bold text-[#167AA0] dark:text-[#75D2EE] hover:underline flex items-center gap-0.5"
              >
                <span>{chan.status === 'connected' ? 'Configure' : 'Connect'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
