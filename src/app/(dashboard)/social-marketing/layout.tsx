'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Share2,
  List,
  PlusCircle,
  Clock,
  Wallet,
  Settings,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { getWorkspaceWalletAction, getSmmSettingsAction } from '@/lib/actions/social-marketing';
import { WorkspaceWallet, SmmSettings } from '@/lib/types/social-marketing';

export default function SocialMarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [wallet, setWallet] = useState<WorkspaceWallet | null>(null);
  const [settings, setSettings] = useState<SmmSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const loadHeaderData = async () => {
    try {
      const [walletData, settingsData] = await Promise.all([
        getWorkspaceWalletAction().catch(() => null),
        getSmmSettingsAction().catch(() => null),
      ]);
      setWallet(walletData);
      setSettings(settingsData);
    } catch {
      // Ignore header fetch errors in unconfigured environments
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHeaderData();
  }, [pathname]);

  const navTabs = [
    { label: 'Overview', href: '/social-marketing', icon: Share2, exact: true },
    { label: 'Services Catalog', href: '/social-marketing/services', icon: List },
    { label: 'New Order', href: '/social-marketing/new-order', icon: PlusCircle },
    { label: 'Order History', href: '/social-marketing/orders', icon: Clock },
    { label: 'Wallet & Ledger', href: '/social-marketing/wallet', icon: Wallet },
    { label: 'Integration Settings', href: '/social-marketing/settings', icon: Settings },
  ];

  const isConnected = settings?.connection_status === 'connected';

  return (
    <div className="space-y-6 pt-2">
      {/* Top Header Banner with Glassmorphic Design */}
      <div className="p-6 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/80 dark:border-sky-800/80 shadow-[0_8px_30px_rgba(117,210,238,0.12)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#167AA0] to-[#75D2EE] flex items-center justify-center text-white shadow-md shadow-[#167AA0]/20">
              <Share2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black text-[#17364A] dark:text-white tracking-tight">
                  Social Marketing Hub
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-[#D7F1FA] text-[#167AA0] dark:bg-sky-950/80 dark:text-[#75D2EE] border border-[#75D2EE]/40">
                  SMMFollows v2
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#526D7D] dark:text-slate-300 mt-0.5">
                Discover social growth services, place reliable orders, and track live provider delivery.
              </p>
            </div>
          </div>

          {/* Quick Header Indicators: Wallet Balance & Provider Connection */}
          <div className="flex items-center gap-3 self-start md:self-auto">
            {/* Wallet Quick Pill */}
            <Link
              href="/social-marketing/wallet"
              className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-[#75D2EE]/50 shadow-xs hover:border-[#167AA0] transition-colors"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#526D7D] dark:text-slate-400">
                  Wallet Balance
                </p>
                <p className="text-sm font-black text-[#17364A] dark:text-white">
                  ${wallet ? wallet.balance.toFixed(2) : '0.00'}
                </p>
              </div>
            </Link>

            {/* Provider Connection Pill */}
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-2xl text-xs font-semibold border ${
                isConnected
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span className="hidden sm:inline">
                {isConnected ? 'Provider Connected' : 'Unconfigured'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-1.5 mt-6 pt-4 border-t border-[#75D2EE]/25 overflow-x-auto no-scrollbar">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.exact
              ? pathname === tab.href
              : pathname.startsWith(tab.href);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-[#167AA0] text-white shadow-xs shadow-[#167AA0]/30'
                    : 'text-[#526D7D] dark:text-slate-300 hover:text-[#17364A] dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Viewport Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
