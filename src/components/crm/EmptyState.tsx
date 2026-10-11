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
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-3xl border border-dashed border-sky-200/80 dark:border-sky-800/80 glass-panel my-6 shadow-xs">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-100 to-blue-50 dark:from-sky-950/60 dark:to-blue-950/40 border border-sky-200/60 dark:border-sky-800 flex items-center justify-center text-sky-600 dark:text-sky-400 mb-4 shadow-xs">
        <ResolvedIcon className="w-7 h-7" />
      </div>
      <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">{title}</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mb-6 leading-relaxed">
        {description}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {primaryLabel && actionHref && (
          <Link
            href={actionHref}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition-all cursor-pointer"
          >
            {primaryLabel}
          </Link>
        )}
        {primaryLabel && !actionHref && onAction && (
          <button
            onClick={onAction}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition-all cursor-pointer"
          >
            {primaryLabel}
          </button>
        )}
        {secondaryActionLabel && secondaryActionHref && (
          <Link
            href={secondaryActionHref}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-white/80 dark:bg-slate-800/80 border border-sky-200 dark:border-sky-700 hover:bg-sky-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
          >
            {secondaryActionLabel}
          </Link>
        )}
        {secondaryActionLabel && !secondaryActionHref && onSecondaryAction && (
          <button
            onClick={onSecondaryAction}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-white/80 dark:bg-slate-800/80 border border-sky-200 dark:border-sky-700 hover:bg-sky-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
          >
            {secondaryActionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
