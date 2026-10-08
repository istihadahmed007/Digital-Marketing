import React from 'react';
import { LucideIcon, Layers, ShieldCheck, Clock, CheckCircle } from 'lucide-react';
import Link from 'next/link';

interface RoadmapModuleViewProps {
  title: string;
  moduleName: string;
  phase: string;
  description: string;
  icon: LucideIcon;
  schemaTable: string;
  features: { title: string; desc: string; status: 'Architected' | 'Schema Ready' | 'Next in Phase' }[];
}

export function RoadmapModuleView({
  title,
  moduleName,
  phase,
  description,
  icon: Icon,
  schemaTable,
  features,
}: RoadmapModuleViewProps) {
  return (
    <div className="max-w-4xl space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              {phase}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              In Active Architecture
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {title}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            {description}
          </p>
        </div>

        <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center gap-3">
          <Icon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          <div className="text-right">
            <p className="text-[10px] uppercase font-bold text-slate-400">Status</p>
            <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
              Schema Ready
            </p>
          </div>
        </div>
      </div>

      {/* Database Schema Status Box */}
      <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>PostgreSQL Table Schema Prepared & Isolated</span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          The underlying database table <code className="font-mono text-indigo-600 dark:text-indigo-400 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">public.{schemaTable}</code> has already been defined in migration <code className="font-mono text-slate-600 dark:text-slate-300">20261007000001_phase2_architectural_stubs.sql</code> with full Workspace RLS isolation.
        </p>
      </div>

      {/* Feature Architecture Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {features.map((feat, idx) => (
          <div
            key={idx}
            className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  {feat.title}
                </h4>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {feat.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {feat.desc}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
              <Clock className="w-3 h-3" />
              <span>Unlocks in Phase 2 milestone</span>
            </div>
          </div>
        ))}
      </div>

      {/* Phase 1 Verification Callout */}
      <div className="p-5 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-r from-indigo-50/60 to-purple-50/60 dark:from-indigo-950/20 dark:to-purple-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
            Phase 1 Functional CRM is fully operational
          </h4>
          <p className="text-[11px] text-indigo-700 dark:text-indigo-300 mt-0.5">
            Contacts, Companies, Deals, Pipeline, Tasks, Activity Timelines, and CSV import are ready for use.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs shrink-0"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
