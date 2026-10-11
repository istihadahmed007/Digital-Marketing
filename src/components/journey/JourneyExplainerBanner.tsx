'use client';

import React, { useState } from 'react';
import {
  Compass,
  Clock,
  Radio,
  Users2,
  TrendingUp,
  HelpCircle,
  ChevronDown,
} from 'lucide-react';

export function JourneyExplainerBanner() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="glass-panel rounded-2xl p-4 md:p-5 border border-[#75D2EE]/45 shadow-xs relative overflow-hidden">
      {/* Soft atmospheric gradient highlight */}
      <div className="absolute top-0 right-0 w-72 h-36 bg-gradient-to-bl from-[#D7F1FA]/40 via-white/20 to-transparent rounded-bl-full pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 relative z-10">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-[#167AA0] text-white shadow-xs shrink-0">
            <Compass className="w-5 h-5 text-[#75D2EE]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#17364A] dark:text-white tracking-tight">
                Campaign Journey Touchpoints
              </h2>
              <span className="glass-pill px-2 py-0.5 rounded-full text-[10px] font-bold">
                Interactive Model
              </span>
            </div>
            <p className="text-xs text-[#526D7D] dark:text-slate-300 mt-0.5 max-w-2xl leading-relaxed">
              Organize your marketing actions across four clear touchpoints without technical jargon:
              <strong className="text-[#17364A] dark:text-white font-semibold"> Timeline</strong>,
              <strong className="text-[#17364A] dark:text-white font-semibold"> Channels</strong>,
              <strong className="text-[#17364A] dark:text-white font-semibold"> Customer Lifecycle</strong>, and
              <strong className="text-[#17364A] dark:text-white font-semibold"> Verified Outcomes</strong>.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 self-start md:self-auto px-3 py-1.5 rounded-xl text-xs font-semibold text-[#167AA0] dark:text-sky-300 bg-[#D7F1FA]/60 hover:bg-[#D7F1FA] dark:bg-sky-950/60 dark:hover:bg-sky-900/60 border border-[#75D2EE]/50 transition-all cursor-pointer shrink-0"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>{isOpen ? 'Hide Guide' : 'How Touchpoints are Organized'}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {isOpen && (
        <div className="mt-4 pt-4 border-t border-[#75D2EE]/25 dark:border-sky-900/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in duration-200">
          {/* Touchpoint 1: Timeline */}
          <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-[#75D2EE]/30 space-y-1.5">
            <div className="flex items-center gap-2 text-[#167AA0] dark:text-sky-400">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">1. Timeline &amp; Schedule</span>
            </div>
            <p className="text-xs text-[#526D7D] dark:text-slate-300 leading-snug">
              Tracks when things happen: <em>Scheduled</em> for the future, currently <em>Live</em>, <em>Completed</em> broadcasts, or work-in-progress <em>Drafts</em>.
            </p>
          </div>

          {/* Touchpoint 2: Channel */}
          <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-[#75D2EE]/30 space-y-1.5">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <Radio className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">2. Channels</span>
            </div>
            <p className="text-xs text-[#526D7D] dark:text-slate-300 leading-snug">
              Every connected touchpoint: <em>Video Studio</em> (YouTube & Facebook Shorts), <em>Email Broadcasts</em>, <em>SEO Visibility</em>, <em>Inbound Forms</em>, and <em>CRM Sales</em>.
            </p>
          </div>

          {/* Touchpoint 3: Customer Stage */}
          <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-[#75D2EE]/30 space-y-1.5">
            <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400">
              <Users2 className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">3. Customer Lifecycle</span>
            </div>
            <p className="text-xs text-[#526D7D] dark:text-slate-300 leading-snug">
              Where people are in your relationship: <strong>Discover</strong> (finding you), <strong>Consider</strong> (learning & evaluating), and <strong>Convert</strong> (becoming customers).
            </p>
          </div>

          {/* Touchpoint 4: Outcome */}
          <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-[#75D2EE]/30 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">4. Verified Outcomes</span>
            </div>
            <p className="text-xs text-[#526D7D] dark:text-slate-300 leading-snug">
              Real results only: Confirmed email delivery, open rates, video virality scores, lead form inquiries, and closed pipeline deal values.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
