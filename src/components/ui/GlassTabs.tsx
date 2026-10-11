import React from 'react';

export interface GlassTabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface GlassTabsProps {
  tabs: GlassTabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function GlassTabs({
  tabs,
  activeTab,
  onChange,
  className = '',
}: GlassTabsProps) {
  return (
    <div
      role="tablist"
      className={`inline-flex p-1 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl border border-[#75D2EE]/40 dark:border-sky-800/40 shadow-xs ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all duration-160 cursor-pointer select-none ${
              isActive
                ? 'bg-[#167AA0] text-white shadow-xs'
                : 'text-[#526D7D] dark:text-slate-300 hover:text-[#17364A] dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/50'
            }`}
          >
            {tab.icon && <span className="w-3.5 h-3.5 shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-[#D7F1FA] text-[#167AA0] dark:bg-sky-950 dark:text-sky-300'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
