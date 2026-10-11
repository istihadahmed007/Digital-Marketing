'use client';

import React from 'react';
import { JourneyActivity } from '@/lib/types/journey';
import {
  X,
  ExternalLink,
  ArrowRight,
  Clock,
  Radio,
  Users2,
  TrendingUp,
  ShieldCheck,
  Video,
  Mail,
  Globe,
  FileText,
  DollarSign,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

interface JourneyActivityDrawerProps {
  activity: JourneyActivity | null;
  onClose: () => void;
}

export function JourneyActivityDrawer({
  activity,
  onClose,
}: JourneyActivityDrawerProps) {
  if (!activity) return null;

  const getChannelIcon = () => {
    switch (activity.channel) {
      case 'video':
        return <Video className="w-4 h-4 text-[#167AA0]" />;
      case 'email':
        return <Mail className="w-4 h-4 text-indigo-600" />;
      case 'seo':
        return <Globe className="w-4 h-4 text-emerald-600" />;
      case 'forms':
        return <FileText className="w-4 h-4 text-amber-600" />;
      case 'crm':
        return <DollarSign className="w-4 h-4 text-sky-600" />;
    }
  };

  const getStageBadgeColor = () => {
    switch (activity.stage) {
      case 'discover':
        return 'bg-sky-50 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300 border-sky-200 dark:border-sky-800';
      case 'consider':
        return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
      case 'convert':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over Drawer */}
      <div className="relative w-full max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-l border-sky-200/80 dark:border-sky-900/60 shadow-2xl h-full flex flex-col z-10 animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-5 border-b border-sky-100 dark:border-sky-900/60 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider border ${getStageBadgeColor()}`}>
                Stage: {activity.stage}
              </span>
              <span className="glass-pill px-2 py-0.5 rounded-full text-[10px] font-semibold">
                {activity.timeState.toUpperCase()}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
              {activity.title}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {/* Description */}
          {activity.description && (
            <div className="p-3.5 rounded-xl bg-sky-50/50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-800/60 text-slate-700 dark:text-slate-300 leading-relaxed">
              {activity.description}
            </div>
          )}

          {/* 4D Coordinates Inspection Card */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
              Campaign Coordinates
            </h4>

            <div className="grid grid-cols-2 gap-2.5">
              {/* 1. Time */}
              <div className="p-3 rounded-xl bg-white dark:bg-slate-800/50 border border-sky-100 dark:border-sky-800/60 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-sky-500" />
                  <span className="font-semibold text-[11px]">Time</span>
                </div>
                <p className="font-bold text-slate-900 dark:text-white">
                  {activity.statusLabel}
                </p>
                <p className="text-[10px] text-slate-500">{activity.displayDate}</p>
              </div>

              {/* 2. Channel */}
              <div className="p-3 rounded-xl bg-white dark:bg-slate-800/50 border border-sky-100 dark:border-sky-800/60 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  {getChannelIcon()}
                  <span className="font-semibold text-[11px]">Channel</span>
                </div>
                <p className="font-bold text-slate-900 dark:text-white capitalize">
                  {activity.platformBadge || activity.channel}
                </p>
                <p className="text-[10px] text-slate-500">
                  {activity.connectionStatus === 'connected' ? 'Connected API' : 'Workspace Asset'}
                </p>
              </div>

              {/* 3. Stage */}
              <div className="p-3 rounded-xl bg-white dark:bg-slate-800/50 border border-sky-100 dark:border-sky-800/60 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <Users2 className="w-3.5 h-3.5 text-teal-500" />
                  <span className="font-semibold text-[11px]">Customer Funnel</span>
                </div>
                <p className="font-bold text-slate-900 dark:text-white capitalize">
                  {activity.stage} Stage
                </p>
                <p className="text-[10px] text-slate-500">
                  {activity.stage === 'discover'
                    ? 'Top of funnel reach'
                    : activity.stage === 'consider'
                    ? 'Nurture & interest'
                    : 'Conversion to revenue'}
                </p>
              </div>

              {/* 4. Verified Outcome */}
              <div className="p-3 rounded-xl bg-white dark:bg-slate-800/50 border border-sky-100 dark:border-sky-800/60 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="font-semibold text-[11px]">Verified Result</span>
                </div>
                <p className="font-bold text-slate-900 dark:text-white">
                  {activity.outcome.primaryValue}
                </p>
                <p className="text-[10px] text-slate-500">
                  {activity.outcome.primaryLabel}
                </p>
              </div>
            </div>
          </div>

          {/* Outcome Details Highlight */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-sky-50 to-blue-50/50 dark:from-sky-950/40 dark:to-blue-950/20 border border-sky-200/80 dark:border-sky-800/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-sky-600" />
                Verified Data Source
              </span>
              <span className="text-[10px] text-sky-700 dark:text-sky-300 font-semibold px-2 py-0.5 rounded-full bg-sky-200/60 dark:bg-sky-900/60">
                Live DB Sync
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              This metric reflects actual database records and connected provider results without estimation or simulated placeholders.
            </p>
            {activity.outcome.secondaryValue && (
              <div className="pt-2 border-t border-sky-200/60 dark:border-sky-800/40 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">{activity.outcome.secondaryLabel}:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {activity.outcome.secondaryValue}
                </span>
              </div>
            )}
          </div>

          {/* Action Link to Workspace module */}
          <div className="pt-2">
            <Link
              href={activity.internalHref}
              onClick={onClose}
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 text-xs font-bold rounded-xl bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition-all"
            >
              <span>Manage in {activity.platformBadge || 'Workspace'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            {activity.externalUrl && (
              <a
                href={activity.externalUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 flex items-center justify-center gap-1.5 w-full py-2 px-4 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 border border-sky-200 dark:border-sky-700 text-sky-700 dark:text-sky-300 hover:bg-sky-50 transition-colors"
              >
                <span>View Live Published Content</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
