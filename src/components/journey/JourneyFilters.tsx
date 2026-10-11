'use client';

import React from 'react';
import {
  JourneyFilterState,
  JourneyChannel,
  JourneyStage,
  JourneyTimeState,
} from '@/lib/types/journey';
import {
  Filter,
  Clock,
  Radio,
  Users2,
  Search,
  Video,
  Mail,
  Globe,
  FileText,
  TrendingUp,
  X,
} from 'lucide-react';

interface JourneyFiltersProps {
  filters: JourneyFilterState;
  onFilterChange: (filters: JourneyFilterState) => void;
  activityCount: number;
  totalCount: number;
}

export function JourneyFilters({
  filters,
  onFilterChange,
  activityCount,
  totalCount,
}: JourneyFiltersProps) {
  const timeOptions: { label: string; value: 'all' | JourneyTimeState }[] = [
    { label: 'All Time', value: 'all' },
    { label: 'Scheduled', value: 'scheduled' },
    { label: 'Live Active', value: 'live' },
    { label: 'Completed', value: 'completed' },
    { label: 'Drafts', value: 'draft' },
  ];

  const channelOptions: {
    label: string;
    value: 'all' | JourneyChannel;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { label: 'All Channels', value: 'all', icon: Radio },
    { label: 'Video Studio', value: 'video', icon: Video },
    { label: 'Email', value: 'email', icon: Mail },
    { label: 'SEO Search', value: 'seo', icon: Globe },
    { label: 'Lead Forms', value: 'forms', icon: FileText },
    { label: 'CRM Sales', value: 'crm', icon: TrendingUp },
  ];

  const stageOptions: { label: string; value: 'all' | JourneyStage; badge: string }[] = [
    { label: 'All Stages', value: 'all', badge: 'Full Funnel' },
    { label: '1. Discover', value: 'discover', badge: 'Awareness' },
    { label: '2. Consider', value: 'consider', badge: 'Engagement' },
    { label: '3. Convert', value: 'convert', badge: 'Purchase' },
  ];

  const hasActiveFilters =
    filters.timeState !== 'all' ||
    filters.channel !== 'all' ||
    filters.stage !== 'all' ||
    Boolean(filters.searchQuery);

  const resetFilters = () => {
    onFilterChange({
      timeState: 'all',
      channel: 'all',
      stage: 'all',
      searchQuery: '',
    });
  };

  return (
    <div className="glass-panel rounded-2xl p-4 md:p-5 border border-sky-200/70 shadow-xs space-y-4">
      {/* Top Filter Bar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-sky-100 dark:border-sky-900/60">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#167AA0] dark:text-sky-400" />
          <span className="text-xs font-bold text-[#17364A] dark:text-white uppercase tracking-wider">
            Filter Journey Touchpoints
          </span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
            Showing {activityCount} of {totalCount} items
          </span>
        </div>

        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 text-xs font-medium text-rose-600 dark:text-rose-400 hover:underline cursor-pointer self-start sm:self-auto"
          >
            <X className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
        )}
      </div>

      {/* Filter Options Rows */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Dimension 1: Customer Stage */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Users2 className="w-3.5 h-3.5 text-teal-600" />
            <span>Customer Stage</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {stageOptions.map((opt) => {
              const isSelected = filters.stage === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => onFilterChange({ ...filters, stage: opt.value })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-sky-600 text-white font-semibold shadow-xs'
                      : 'bg-white/70 dark:bg-slate-900/60 border border-sky-200/70 text-slate-700 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dimension 2: Channel */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Radio className="w-3.5 h-3.5 text-indigo-600" />
            <span>Channel Touchpoint</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {channelOptions.map((opt) => {
              const isSelected = filters.channel === opt.value;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  onClick={() => onFilterChange({ ...filters, channel: opt.value })}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                      : 'bg-white/70 dark:bg-slate-900/60 border border-sky-200/70 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dimension 3: Time State & Search */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Clock className="w-3.5 h-3.5 text-sky-600" />
            <span>Time Coordinate</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {timeOptions.map((opt) => {
              const isSelected = filters.timeState === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => onFilterChange({ ...filters, timeState: opt.value })}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-sky-700 text-white font-semibold shadow-xs'
                      : 'bg-white/70 dark:bg-slate-900/60 border border-sky-200/70 text-slate-700 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Keyword search input */}
      <div className="pt-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={filters.searchQuery || ''}
            onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value })}
            placeholder="Search campaigns, shorts, forms, or deals by title..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl glass-input placeholder:text-slate-400"
          />
        </div>
      </div>
    </div>
  );
}
