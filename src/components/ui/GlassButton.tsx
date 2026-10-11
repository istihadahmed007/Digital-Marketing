import React from 'react';
import { Loader2 } from 'lucide-react';

export interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export function GlassButton({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}: GlassButtonProps) {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs rounded-xl gap-1.5',
    md: 'px-4 py-2 text-xs font-semibold rounded-xl gap-2',
    lg: 'px-5 py-2.5 text-sm font-bold rounded-2xl gap-2.5',
  }[size];

  const variantClasses = {
    primary:
      'bg-[#167AA0] hover:bg-[#126383] text-white shadow-xs focus-visible:ring-2 focus-visible:ring-[#75D2EE]',
    secondary:
      'bg-white/80 hover:bg-white text-[#17364A] dark:text-white border border-[#75D2EE]/50 dark:border-sky-800 shadow-xs focus-visible:ring-2 focus-visible:ring-[#167AA0]',
    ghost:
      'bg-transparent hover:bg-[#D7F1FA]/40 dark:hover:bg-sky-950/40 text-[#526D7D] hover:text-[#17364A] dark:text-slate-300 dark:hover:text-white',
    danger:
      'bg-rose-600 hover:bg-rose-700 text-white shadow-xs focus-visible:ring-2 focus-visible:ring-rose-400',
  }[variant];

  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-medium cursor-pointer transition-all duration-140 select-none glass-button-press disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}
