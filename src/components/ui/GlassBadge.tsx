import React from 'react';

export interface GlassBadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'neutral' | 'accent';
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

export function GlassBadge({
  children,
  variant = 'primary',
  size = 'md',
  dot = false,
  className = '',
}: GlassBadgeProps) {
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  const variantStyles = {
    primary: {
      wrap: 'bg-[#D7F1FA]/70 text-[#167AA0] dark:bg-sky-950/60 dark:text-sky-300 border border-[#75D2EE]/50',
      dot: 'bg-[#167AA0]',
    },
    success: {
      wrap: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
      dot: 'bg-emerald-500',
    },
    warning: {
      wrap: 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
      dot: 'bg-amber-500',
    },
    neutral: {
      wrap: 'bg-slate-100/80 dark:bg-slate-800/80 text-[#526D7D] dark:text-slate-300 border border-slate-200 dark:border-slate-700',
      dot: 'bg-slate-400',
    },
    accent: {
      wrap: 'bg-[#75D2EE]/25 text-[#167AA0] dark:text-sky-300 border border-[#75D2EE]/60 font-bold',
      dot: 'bg-[#75D2EE]',
    },
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full backdrop-blur-xs select-none ${sizeClass} ${variantStyles.wrap} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${variantStyles.dot} shrink-0 animate-pulse`} />}
      <span>{children}</span>
    </span>
  );
}
