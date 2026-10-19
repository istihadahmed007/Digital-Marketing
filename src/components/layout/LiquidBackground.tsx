'use client';

import React, { useState, useEffect } from 'react';

export type BackgroundVariant = 'silk-ribbon' | 'glass-wave' | 'ice-fluid';

interface LiquidBackgroundProps {
  initialVariant?: BackgroundVariant;
  className?: string;
  showSwitcher?: boolean;
}

export function LiquidBackground({
  initialVariant = 'silk-ribbon',
  className = '',
  showSwitcher = false,
}: LiquidBackgroundProps) {
  const [variant, setVariant] = useState<BackgroundVariant>(initialVariant);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('nexusmark_bg_variant') as BackgroundVariant | null;
    if (saved && (saved === 'silk-ribbon' || saved === 'glass-wave' || saved === 'ice-fluid')) {
      setVariant(saved);
    }

    const handleVariantChange = (e: CustomEvent<BackgroundVariant>) => {
      if (e.detail) {
        setVariant(e.detail);
      }
    };

    window.addEventListener('nexusmark:bg-change' as any, handleVariantChange as any);
    return () => {
      window.removeEventListener('nexusmark:bg-change' as any, handleVariantChange as any);
    };
  }, []);

  const handleSelectVariant = (v: BackgroundVariant) => {
    setVariant(v);
    localStorage.setItem('nexusmark_bg_variant', v);
    window.dispatchEvent(new CustomEvent('nexusmark:bg-change', { detail: v }));
  };

  const getSource = (v: BackgroundVariant, isDark = false) => {
    switch (v) {
      case 'glass-wave':
        return isDark
          ? '/backgrounds/fluid-glass-wave-dark.webp'
          : '/backgrounds/fluid-glass-wave.webp';
      case 'ice-fluid':
        return isDark
          ? '/backgrounds/ice-blue-fluid.webp'
          : '/backgrounds/ice-blue-fluid.webp';
      case 'silk-ribbon':
      default:
        return isDark
          ? '/backgrounds/fluid-silk-ribbon-dark.webp'
          : '/backgrounds/fluid-silk-ribbon.webp';
    }
  };

  return (
    <div
      className={`absolute inset-0 pointer-events-none overflow-hidden select-none z-0 ${className}`}
      aria-hidden="true"
    >
      {/* Primary Light Mode Background: 100% faithful reproduction of reference design */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={getSource(variant, false)}
        alt=""
        fetchPriority="high"
        className="dark:hidden absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-500 will-change-transform"
      />

      {/* Dark Mode Background: Luminous deep oceanic silk ribbons */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={getSource(variant, true)}
        alt=""
        className="hidden dark:block absolute inset-0 w-full h-full object-cover object-center opacity-70 mix-blend-screen transition-opacity duration-500 will-change-transform"
      />

      {/* Soft atmospheric radial gradient lighting layer for high-DPI displays */}
      <div className="absolute inset-0 bg-radial-[at_90%_15%] from-white/30 via-transparent to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-radial-[at_10%_85%] from-[#75D2EE]/15 via-transparent to-transparent pointer-events-none" />

      {/* Interactive Switcher Pill (only shown when explicitly enabled, e.g. in development or preview mode) */}
      {showSwitcher && mounted && (
        <div className="pointer-events-auto absolute bottom-4 right-4 z-50 flex items-center gap-1.5 p-1 rounded-full bg-white/75 dark:bg-slate-900/80 backdrop-blur-md border border-[#75D2EE]/40 shadow-lg text-[10px] font-semibold text-[#17364A] dark:text-white">
          <button
            type="button"
            onClick={() => handleSelectVariant('silk-ribbon')}
            className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${
              variant === 'silk-ribbon'
                ? 'bg-[#167AA0] text-white shadow-xs'
                : 'hover:bg-white/60 dark:hover:bg-slate-800'
            }`}
          >
            Silk Ribbon (Exact)
          </button>
          <button
            type="button"
            onClick={() => handleSelectVariant('glass-wave')}
            className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${
              variant === 'glass-wave'
                ? 'bg-[#167AA0] text-white shadow-xs'
                : 'hover:bg-white/60 dark:hover:bg-slate-800'
            }`}
          >
            Glass Wave
          </button>
          <button
            type="button"
            onClick={() => handleSelectVariant('ice-fluid')}
            className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${
              variant === 'ice-fluid'
                ? 'bg-[#167AA0] text-white shadow-xs'
                : 'hover:bg-white/60 dark:hover:bg-slate-800'
            }`}
          >
            Ice Fluid
          </button>
        </div>
      )}
    </div>
  );
}
