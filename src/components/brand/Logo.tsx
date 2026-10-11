import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function Logo({ className = '', size = 'md', showText = true }: LogoProps) {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  return (
    <div className={`flex items-center gap-2.5 font-bold tracking-tight select-none ${className}`}>
      <div
        className={`${iconSizes[size]} relative flex items-center justify-center rounded-xl bg-gradient-to-br from-[#75D2EE] via-[#167AA0] to-[#0E526E] shadow-md shadow-[#167AA0]/20 text-white border border-white/40`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5/8 h-5/8 transform -rotate-6"
        >
          {/* Custom geometric Nexus mark */}
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
          <line x1="4" y1="22" x2="4" y2="15" />
        </svg>
        <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#75D2EE] ring-2 ring-white dark:ring-slate-900 shadow-xs" />
      </div>
      {showText && (
        <div className="flex flex-col">
          <span className={`${textSizes[size]} leading-none font-black tracking-tight text-[#17364A] dark:text-white`}>
            Nexus<span className="text-[#167AA0] dark:text-[#75D2EE]">Mark</span>
          </span>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-[#526D7D] dark:text-slate-400 mt-0.5">
            Marketing Workspace
          </span>
        </div>
      )}
    </div>
  );
}
