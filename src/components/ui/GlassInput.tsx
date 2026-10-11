import React from 'react';

export interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export function GlassInput({
  label,
  error,
  helperText,
  icon,
  className = '',
  id,
  ...props
}: GlassInputProps) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-[#17364A] dark:text-slate-200"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-3 text-[#526D7D] dark:text-slate-400 pointer-events-none shrink-0">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          className={`glass-input w-full px-3 py-2 text-xs text-[#17364A] dark:text-white placeholder-[#526D7D]/60 dark:placeholder-slate-400 focus:outline-none ${
            icon ? 'pl-9' : ''
          } ${
            error
              ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-200'
              : ''
          } ${className}`}
          {...props}
        />
      </div>
      {error ? (
        <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-[11px] text-[#526D7D] dark:text-slate-400">{helperText}</p>
      ) : null}
    </div>
  );
}
