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
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  return (
    <div className={`flex items-center gap-2.5 font-bold tracking-tight select-none ${className}`}>
      {/* 3D Isometric Faceted Cube as seen in the reference */}
      <div className={`${iconSizes[size]} relative flex items-center justify-center shrink-0`}>
        <svg viewBox="0 0 36 36" className="w-full h-full drop-shadow-sm" fill="none">
          <defs>
            {/* Top illuminated face */}
            <linearGradient id="cube-top-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#A8EBFC" />
              <stop offset="100%" stopColor="#75D2EE" />
            </linearGradient>
            {/* Left face */}
            <linearGradient id="cube-left-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2596BE" />
              <stop offset="100%" stopColor="#167AA0" />
            </linearGradient>
            {/* Right shaded face */}
            <linearGradient id="cube-right-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#146A8C" />
              <stop offset="100%" stopColor="#0E4A62" />
            </linearGradient>
          </defs>

          {/* Top Face */}
          <path d="M18 4L32 12L18 20L4 12L18 4Z" fill="url(#cube-top-grad)" />
          {/* Inner Highlight on Top Face */}
          <path d="M18 6L29 12L18 18L7 12L18 6Z" fill="#FFFFFF" fillOpacity="0.25" />

          {/* Left Face */}
          <path d="M4 12L18 20V33L4 25V12Z" fill="url(#cube-left-grad)" />

          {/* Right Face */}
          <path d="M18 20L32 12V25L18 33V20Z" fill="url(#cube-right-grad)" />

          {/* Precision Edges */}
          <path
            d="M18 4L32 12M18 4L4 12M18 4V20M32 12V25M4 12V25M18 20L32 12M18 20L4 12M18 20V33M4 25L18 33L32 25"
            stroke="#FFFFFF"
            strokeWidth="0.8"
            strokeOpacity="0.6"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {showText && (
        <div className="flex items-center gap-1.5 leading-none">
          <span className={`${textSizes[size]} font-extrabold tracking-tight text-[#17364A] dark:text-white`}>
            GrowthPilot
          </span>
          <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded-md bg-[#167AA0] text-white tracking-widest shadow-2xs">
            AI
          </span>
        </div>
      )}
    </div>
  );
}
