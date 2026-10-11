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
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-3xl border border-dashed border-[#75D2EE]/40 dark:border-[#167AA0]/40 glass-panel my-6 shadow-[0_8px_30px_rgba(22,122,160,0.06)]">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#D7F1FA] to-[#EDF9FD] dark:from-[#167AA0]/20 dark:to-[#75D2EE]/10 border border-[#75D2EE]/50 flex items-center justify-center text-[#167AA0] dark:text-[#75D2EE] mb-4 shadow-xs">
        <ResolvedIcon className="w-7 h-7" />
      </div>
      <h3 className="text-base font-bold text-[#17364A] dark:text-white mb-1.5">{title}</h3>
      <p className="text-xs text-[#526D7D] dark:text-slate-400 max-w-md mb-6 leading-relaxed">
        {description}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {primaryLabel && actionHref && (
          <Link
            href={actionHref}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-[#167AA0] hover:bg-[#126484] text-white shadow-xs transition-all cursor-pointer glass-button-press"
          >
            {primaryLabel}
          </Link>
        )}
        {primaryLabel && !actionHref && onAction && (
          <button
            onClick={onAction}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-[#167AA0] hover:bg-[#126484] text-white shadow-xs transition-all cursor-pointer glass-button-press"
          >
            {primaryLabel}
          </button>
        )}
        {secondaryActionLabel && secondaryActionHref && (
          <Link
            href={secondaryActionHref}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-white/80 dark:bg-slate-800/80 border border-[#75D2EE]/40 hover:bg-[#D7F1FA]/50 text-[#17364A] dark:text-slate-200 transition-all cursor-pointer"
          >
            {secondaryActionLabel}
          </Link>
        )}
        {secondaryActionLabel && !secondaryActionHref && onSecondaryAction && (
          <button
            onClick={onSecondaryAction}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-white/80 dark:bg-slate-800/80 border border-[#75D2EE]/40 hover:bg-[#D7F1FA]/50 text-[#17364A] dark:text-slate-200 transition-all cursor-pointer"
          >
            {secondaryActionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
