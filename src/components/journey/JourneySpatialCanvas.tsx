'use client';

import React, { useState } from 'react';
import { JourneyActivity, JourneyStage } from '@/lib/types/journey';
import {
  Compass,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Layers,
  ChevronRight,
  Video,
  Mail,
  Globe,
  FileText,
  DollarSign,
  Maximize2,
  Sliders,
} from 'lucide-react';

interface JourneySpatialCanvasProps {
  activities: JourneyActivity[];
  onSelectActivity: (activity: JourneyActivity) => void;
  selectedActivityId?: string;
}

export function JourneySpatialCanvas({
  activities,
  onSelectActivity,
  selectedActivityId,
}: JourneySpatialCanvasProps) {
  const [spatialMode, setSpatialMode] = useState<'3d_spatial' | 'funnel_grid'>('3d_spatial');
  const [tiltAngle, setTiltAngle] = useState({ x: 8, y: -4 });

  const stages: { stage: JourneyStage; label: string; sub: string; color: string; border: string }[] = [
    {
      stage: 'discover',
      label: '1. Discover Stage',
      sub: 'Top-of-funnel reach, SEO search queries, and viral video clips',
      color: 'from-sky-500/10 to-blue-500/5',
      border: 'border-sky-300/60 dark:border-sky-800',
    },
    {
      stage: 'consider',
      label: '2. Consider Stage',
      sub: 'Mid-funnel nurture, email broadcasts, and inbound inquiries',
      color: 'from-indigo-500/10 to-purple-500/5',
      border: 'border-indigo-300/60 dark:border-indigo-800',
    },
    {
      stage: 'convert',
      label: '3. Convert Stage',
      sub: 'Bottom-of-funnel closed sales, opportunities, and customers',
      color: 'from-emerald-500/10 to-teal-500/5',
      border: 'border-emerald-300/60 dark:border-emerald-800',
    },
  ];

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'video':
        return <Video className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />;
      case 'email':
        return <Mail className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />;
      case 'seo':
        return <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
      case 'forms':
        return <FileText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
      case 'crm':
        return <DollarSign className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-sky-500" />;
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (spatialMode !== '3d_spatial') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 16;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -16;
    setTiltAngle({ x: Math.round(y), y: Math.round(x) });
  };

  const handleMouseLeave = () => {
    setTiltAngle({ x: 8, y: -4 });
  };

  return (
    <div className="space-y-4">
      {/* View Switcher Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Compass className="w-4 h-4 text-sky-600" />
            <span>Interactive 4D Journey Canvas</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Hover over planes to explore depth and click any node to inspect real outcomes.
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-sky-50/80 dark:bg-slate-900 border border-sky-200/80 dark:border-sky-800 self-start sm:self-auto">
          <button
            onClick={() => setSpatialMode('3d_spatial')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              spatialMode === '3d_spatial'
                ? 'bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Spatial 3D View
          </button>
          <button
            onClick={() => setSpatialMode('funnel_grid')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              spatialMode === 'funnel_grid'
                ? 'bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Stage Flow Grid
          </button>
        </div>
      </div>

      {/* 3D Canvas / Grid Container */}
      <div
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={`relative overflow-hidden rounded-3xl p-6 md:p-8 border border-sky-200/80 dark:border-sky-900/60 bg-gradient-to-br from-sky-50/60 via-blue-50/30 to-indigo-50/40 dark:from-slate-950/80 dark:via-slate-900/60 dark:to-slate-950/90 shadow-sm ${
          spatialMode === '3d_spatial' ? 'perspective-container' : ''
        }`}
        style={{ minHeight: '440px' }}
      >
        {/* Soft atmospheric background light */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-200/25 via-transparent to-transparent pointer-events-none" />

        <div
          className={`grid grid-cols-1 md:grid-cols-3 gap-6 transition-transform duration-300 ease-out ${
            spatialMode === '3d_spatial' ? 'preserve-3d' : ''
          }`}
          style={
            spatialMode === '3d_spatial'
              ? {
                  transform: `rotateX(${tiltAngle.x}deg) rotateY(${tiltAngle.y}deg)`,
                }
              : undefined
          }
        >
          {stages.map((stg, idx) => {
            const stageActivities = activities.filter((a) => a.stage === stg.stage);

            return (
              <div
                key={stg.stage}
                className={`glass-panel rounded-2xl p-4 md:p-5 border ${stg.border} flex flex-col justify-between shadow-xs transition-all relative group ${
                  spatialMode === '3d_spatial' ? 'hover:-translate-y-1 hover:shadow-lg' : ''
                }`}
                style={
                  spatialMode === '3d_spatial'
                    ? {
                        transform: `translateZ(${idx * 16}px)`,
                      }
                    : undefined
                }
              >
                {/* Stage Header */}
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-sky-100 dark:border-sky-900/60">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        {stg.label}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                        {stg.sub}
                      </p>
                    </div>
                    <span className="glass-pill px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0">
                      {stageActivities.length} actions
                    </span>
                  </div>

                  {/* Stage Activity Cards */}
                  <div className="mt-4 space-y-2.5">
                    {stageActivities.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500 border border-dashed border-sky-200/60 dark:border-sky-800 rounded-xl p-4">
                        No activities in this stage yet. Create an asset to see it flow through your journey.
                      </div>
                    ) : (
                      stageActivities.map((act) => {
                        const isSelected = selectedActivityId === act.id;
                        return (
                          <div
                            key={act.id}
                            onClick={() => onSelectActivity(act)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer relative ${
                              isSelected
                                ? 'bg-white dark:bg-slate-800 border-sky-500 dark:border-sky-400 shadow-md ring-2 ring-sky-400/30'
                                : 'bg-white/80 dark:bg-slate-900/70 border-sky-100/90 dark:border-sky-800/60 hover:bg-white hover:border-sky-300 dark:hover:border-sky-700 shadow-xs'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                {getChannelIcon(act.channel)}
                                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                  {act.title}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-600 dark:text-slate-400 shrink-0 font-medium">
                                {act.displayDate}
                              </span>
                            </div>

                            <div className="mt-2 pt-2 border-t border-sky-100/60 dark:border-sky-900/40 flex items-center justify-between text-[11px]">
                              <span className="text-slate-500 font-medium capitalize">
                                {act.statusLabel}
                              </span>
                              <span className="font-bold text-sky-700 dark:text-sky-300">
                                {act.outcome.primaryValue}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Stage Progression Arrow */}
                {idx < 2 && (
                  <div className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-sky-200 dark:border-sky-700 items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm pointer-events-none">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
