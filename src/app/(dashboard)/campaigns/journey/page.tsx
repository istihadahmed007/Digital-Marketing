'use client';

import React, { useState, useEffect } from 'react';
import {
  JourneyActivity,
  JourneyFilterState,
  JourneySummaryStats,
} from '@/lib/types/journey';
import { get4DCampaignJourneyData } from '@/lib/actions/journey';
import { JourneyExplainerBanner } from '@/components/journey/JourneyExplainerBanner';
import { JourneyFilters } from '@/components/journey/JourneyFilters';
import { JourneySpatialCanvas } from '@/components/journey/JourneySpatialCanvas';
import { JourneyTimeline } from '@/components/journey/JourneyTimeline';
import { JourneyActivityDrawer } from '@/components/journey/JourneyActivityDrawer';
import {
  Compass,
  Radio,
  Clock,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  Plus,
  Video,
  Mail,
  Loader2,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

export default function JourneyPage() {
  const [workspaceId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('nexusmark_active_workspace') || 'ws-default'
      );
    }
    return 'ws-default';
  });

  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<JourneyActivity[]>([]);
  const [summary, setSummary] = useState<JourneySummaryStats>({
    totalActivities: 0,
    scheduledCount: 0,
    liveCount: 0,
    completedCount: 0,
    activeChannelsCount: 0,
    totalLeadsGenerated: 0,
    pipelineValueGenerated: 0,
  });

  const [filters, setFilters] = useState<JourneyFilterState>({
    timeState: 'all',
    channel: 'all',
    stage: 'all',
    searchQuery: '',
  });

  const [selectedActivity, setSelectedActivity] = useState<JourneyActivity | null>(null);

  const fetchData = async (wsId: string) => {
    setLoading(true);
    try {
      const data = await get4DCampaignJourneyData(wsId);
      setActivities(data.activities);
      setSummary(data.summary);
    } catch (err) {
      console.error('Failed to load 4D journey data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(workspaceId);
  }, [workspaceId]);

  // Apply filters
  const filteredActivities = activities.filter((act) => {
    if (filters.timeState !== 'all' && act.timeState !== filters.timeState) {
      return false;
    }
    if (filters.channel !== 'all' && act.channel !== filters.channel) {
      return false;
    }
    if (filters.stage !== 'all' && act.stage !== filters.stage) {
      return false;
    }
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const matchTitle = act.title.toLowerCase().includes(query);
      const matchDesc = act.description?.toLowerCase().includes(query);
      if (!matchTitle && !matchDesc) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header & Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-sky-100 dark:border-sky-900/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[#17364A] dark:text-white">
              Campaign Journey
            </h1>
            <span className="glass-pill px-2.5 py-0.5 rounded-full text-xs font-bold">
              Multi-Channel
            </span>
          </div>
          <p className="text-xs text-[#526D7D] dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            See all your marketing touchpoints mapped across Time, Channels, Customer Stages, and Real Outcomes in one unified view.
          </p>
        </div>

        {/* View Switcher Tabs & Quick Create Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center p-1 rounded-xl bg-white/70 dark:bg-slate-900 border border-[#75D2EE]/40 dark:border-sky-800">
            <Link
              href="/campaigns/journey"
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#167AA0] text-white shadow-xs"
            >
              Journey View
            </Link>
            <Link
              href="/campaigns"
              className="px-3 py-1.5 text-xs font-semibold rounded-lg text-[#526D7D] dark:text-slate-400 hover:text-[#17364A]"
            >
              Email Broadcasts
            </Link>
          </div>

          <Link
            href="/shorts"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl glass-panel text-[#167AA0] dark:text-[#75D2EE] hover:bg-[#D7F1FA]/40 transition-all shadow-xs"
          >
            <Video className="w-3.5 h-3.5 text-[#167AA0]" />
            <span>Make Shorts</span>
          </Link>

          <Link
            href="/campaigns"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition-all"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>New Email</span>
          </Link>
        </div>
      </div>

      {/* 4-Coordinate Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Metric 1: Active Channels */}
        <div className="glass-panel rounded-2xl p-4 md:p-5 border border-sky-200/70 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Connected Channels
            </span>
            <div className="p-2 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-600">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {summary.activeChannelsCount}
            </span>
            <span className="text-[11px] text-slate-400">touchpoints active</span>
          </div>
        </div>

        {/* Metric 2: Scheduled / Upcoming */}
        <div className="glass-panel rounded-2xl p-4 md:p-5 border border-sky-200/70 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Scheduled Actions
            </span>
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {summary.scheduledCount}
            </span>
            <span className="text-[11px] text-slate-400">ready to trigger</span>
          </div>
        </div>

        {/* Metric 3: Leads Captured */}
        <div className="glass-panel rounded-2xl p-4 md:p-5 border border-sky-200/70 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Leads Captured
            </span>
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {summary.totalLeadsGenerated}
            </span>
            <span className="text-[11px] text-slate-400">form submissions</span>
          </div>
        </div>

        {/* Metric 4: Pipeline Generated */}
        <div className="glass-panel rounded-2xl p-4 md:p-5 border border-sky-200/70 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Sales Pipeline Value
            </span>
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              ${summary.pipelineValueGenerated.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Explainer Banner */}
      <JourneyExplainerBanner />

      {/* Filters */}
      <JourneyFilters
        filters={filters}
        onFilterChange={setFilters}
        activityCount={filteredActivities.length}
        totalCount={activities.length}
      />

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin text-[#167AA0]" />
          <p className="text-xs">Mapping multi-channel campaign journey touchpoints...</p>
        </div>
      ) : (
        <>
          {/* 3D Spatial Canvas */}
          <JourneySpatialCanvas
            activities={filteredActivities}
            onSelectActivity={setSelectedActivity}
            selectedActivityId={selectedActivity?.id}
          />

          {/* Timeline View */}
          <JourneyTimeline
            activities={filteredActivities}
            onSelectActivity={setSelectedActivity}
            selectedActivityId={selectedActivity?.id}
          />
        </>
      )}

      {/* Activity Inspector Drawer */}
      <JourneyActivityDrawer
        activity={selectedActivity}
        onClose={() => setSelectedActivity(null)}
      />
    </div>
  );
}
