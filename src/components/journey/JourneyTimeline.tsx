'use client';

import React from 'react';
import { JourneyActivity } from '@/lib/types/journey';
import {
  Clock,
  Video,
  Mail,
  Globe,
  FileText,
  DollarSign,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Calendar,
} from 'lucide-react';

interface JourneyTimelineProps {
  activities: JourneyActivity[];
  onSelectActivity: (activity: JourneyActivity) => void;
  selectedActivityId?: string;
}

export function JourneyTimeline({
  activities,
  onSelectActivity,
  selectedActivityId,
}: JourneyTimelineProps) {
  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'video':
        return <Video className="w-3.5 h-3.5 text-[#167AA0] dark:text-[#75D2EE]" />;
      case 'email':
        return <Mail className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />;
      case 'seo':
        return <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
      case 'forms':
        return <FileText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
      case 'crm':
        return <DollarSign className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-sky-600" />;
    }
  };

  const getTimeStateBadge = (state: string) => {
    switch (state) {
      case 'scheduled':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'live':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'completed':
        return 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  if (activities.length === 0) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center border border-sky-200/70 text-slate-500">
        No campaign activities match your selected filters. Try broadening your criteria.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop Matrix View (md and up) */}
      <div className="hidden md:block glass-panel rounded-2xl border border-sky-200/70 overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-sky-100 dark:border-sky-900/60 flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
            Chronological Journey Touchpoints
          </h4>
          <span className="text-xs text-slate-500">
            {activities.length} activity records
          </span>
        </div>

        <div className="divide-y divide-sky-100/80 dark:divide-sky-900/40">
          {activities.map((act) => {
            const isSelected = selectedActivityId === act.id;
            return (
              <div
                key={act.id}
                onClick={() => onSelectActivity(act)}
                className={`p-4 flex items-center justify-between gap-4 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-sky-50/80 dark:bg-sky-950/40 border-l-4 border-l-sky-600'
                    : 'hover:bg-sky-50/40 dark:hover:bg-slate-800/40'
                }`}
              >
                {/* Channel Icon & Title */}
                <div className="flex items-center gap-3.5 min-w-0 max-w-md">
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-sky-100 dark:border-sky-800 shrink-0 shadow-xs">
                    {getChannelIcon(act.channel)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {act.title}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {act.platformBadge || act.channel} • Stage: <span className="capitalize font-medium text-slate-700 dark:text-slate-300">{act.stage}</span>
                    </p>
                  </div>
                </div>

                {/* Status & Time */}
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${getTimeStateBadge(
                      act.timeState
                    )}`}
                  >
                    {act.statusLabel}
                  </span>
                  <span className="text-xs text-slate-500 font-medium w-24 text-right">
                    {act.displayDate}
                  </span>
                </div>

                {/* Verified Outcome */}
                <div className="text-right shrink-0 min-w-32">
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    {act.outcome.primaryValue}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {act.outcome.primaryLabel}
                  </span>
                </div>

                {/* Inspect arrow */}
                <div className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 shrink-0">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Vertical Timeline (< md) */}
      <div className="block md:hidden space-y-3">
        {activities.map((act) => {
          const isSelected = selectedActivityId === act.id;
          return (
            <div
              key={act.id}
              onClick={() => onSelectActivity(act)}
              className={`glass-panel rounded-2xl p-4 border transition-all cursor-pointer ${
                isSelected
                  ? 'border-sky-500 dark:border-sky-400 bg-sky-50/90 dark:bg-sky-950/50 shadow-md ring-2 ring-sky-400/30'
                  : 'border-sky-200/70 hover:border-sky-300 dark:hover:border-sky-700'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-sky-100 dark:border-sky-800 shrink-0">
                    {getChannelIcon(act.channel)}
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {act.title}
                    </h5>
                    <p className="text-[10px] text-slate-500 capitalize">
                      {act.channel} • {act.stage} stage
                    </p>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border shrink-0 ${getTimeStateBadge(
                    act.timeState
                  )}`}
                >
                  {act.statusLabel}
                </span>
              </div>

              <div className="mt-3 pt-2.5 border-t border-sky-100 dark:border-sky-900/60 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">{act.displayDate}</span>
                <span className="font-bold text-sky-700 dark:text-sky-300">
                  {act.outcome.primaryValue}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
