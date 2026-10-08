'use client';

import React from 'react';
import Link from 'next/link';
import {
  LucideIcon,
  Building2,
  TrendingUp,
  Clock,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  Inbox,
  FolderOpen,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  building: Building2,
  trending: TrendingUp,
  clock: Clock,
  users: Users,
  search: Search,
  check: CheckCircle2,
  alert: AlertCircle,
  file: FileText,
  inbox: Inbox,
  folder: FolderOpen,
};

interface EmptyStateProps {
  icon?: LucideIcon;
  iconName?: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionText?: string;
  actionHref?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
  onSecondaryAction?: () => void;
}

export function EmptyState({
  icon,
  iconName,
  title,
  description,
  actionLabel,
  actionText,
  actionHref,
  onAction,
  secondaryActionLabel,
  secondaryActionHref,
  onSecondaryAction,
}: EmptyStateProps) {
  const primaryLabel = actionLabel || actionText;
  const ResolvedIcon = (iconName ? ICON_MAP[iconName] : icon) || Inbox;

  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 my-6">
      <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 shadow-xs">
        <ResolvedIcon className="w-7 h-7" />
      </div>
      <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">{title}</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-6 leading-relaxed">
        {description}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {primaryLabel && actionHref && (
          <Link
            href={actionHref}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20 transition-all cursor-pointer"
          >
            {primaryLabel}
          </Link>
        )}
        {primaryLabel && !actionHref && onAction && (
          <button
            onClick={onAction}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20 transition-all cursor-pointer"
          >
            {primaryLabel}
          </button>
        )}
        {secondaryActionLabel && secondaryActionHref && (
          <Link
            href={secondaryActionHref}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
          >
            {secondaryActionLabel}
          </Link>
        )}
        {secondaryActionLabel && !secondaryActionHref && onSecondaryAction && (
          <button
            onClick={onSecondaryAction}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
          >
            {secondaryActionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
