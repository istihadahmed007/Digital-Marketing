'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Share2,
  TrendingUp,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  PlusCircle,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  Layers,
} from 'lucide-react';
import {
  getSmmServicesAction,
  getSmmOrdersAction,
  syncSmmServicesAction,
  getSmmSettingsAction,
} from '@/lib/actions/social-marketing';
import { SmmService, SmmOrder, SmmSettings } from '@/lib/types/social-marketing';
import { StatusBadge } from '@/components/crm/StatusBadge';

export default function SocialMarketingOverviewPage() {
  const [services, setServices] = useState<SmmService[]>([]);
  const [orders, setOrders] = useState<SmmOrder[]>([]);
  const [settings, setSettings] = useState<SmmSettings | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<string>('All');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [srvList, ordList, stg] = await Promise.all([
        getSmmServicesAction(),
        getSmmOrdersAction(undefined, { limit: 6 }),
        getSmmSettingsAction(),
      ]);
      setServices(srvList);
      setOrders(ordList);
      setSettings(stg);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSyncServices = async () => {
    setSyncing(true);
    try {
      const res = await syncSmmServicesAction();
      if (res.success) {
        setFeedback(res.message);
        await loadData();
      } else {
        alert(res.error || res.message);
      }
    } catch (err: any) {
      alert(err.message || 'Service synchronization failed');
    } finally {
      setSyncing(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  // Channel filters derived from actual categories
  const channels = ['All', 'Instagram', 'YouTube', 'TikTok', 'Facebook', 'Twitter', 'Telegram', 'Spotify'];

  const filteredServices = services
    .filter((s) => {
      if (selectedChannel === 'All') return true;
      return s.category.toLowerCase().includes(selectedChannel.toLowerCase()) ||
             s.name.toLowerCase().includes(selectedChannel.toLowerCase());
    })
    .slice(0, 6);

  // Computed summary metrics
  const totalOrdersCount = orders.length;
  const totalSpent = orders.reduce((sum, o) => sum + (o.customer_charge || 0), 0);
  const completedOrders = orders.filter((o) => o.status === 'completed').length;
  const successRate = totalOrdersCount > 0 ? Math.round((completedOrders / totalOrdersCount) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* Feedback Toast Banner */}
      {feedback && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{feedback}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-emerald-600 font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Hero Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-5 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/80 dark:border-sky-800/80 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-[#526D7D] dark:text-slate-400">
              Active Services
            </p>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <p className="text-2xl font-black text-[#17364A] dark:text-white">
              {services.length}
            </p>
            <span className="text-[11px] text-[#526D7D] dark:text-slate-400">available in catalog</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-5 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/80 dark:border-sky-800/80 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-[#526D7D] dark:text-slate-400">
              Recent Orders
            </p>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <p className="text-2xl font-black text-[#17364A] dark:text-white">
              {totalOrdersCount}
            </p>
            <span className="text-[11px] text-[#526D7D] dark:text-slate-400">in workspace</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-5 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/80 dark:border-sky-800/80 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-[#526D7D] dark:text-slate-400">
              Total Spent
            </p>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <p className="text-2xl font-black text-[#17364A] dark:text-white">
              ${totalSpent.toFixed(2)}
            </p>
            <span className="text-[11px] text-[#526D7D] dark:text-slate-400">USD</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-5 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/80 dark:border-sky-800/80 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-[#526D7D] dark:text-slate-400">
              Fulfillment Rate
            </p>
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <p className="text-2xl font-black text-[#17364A] dark:text-white">
              {successRate}%
            </p>
            <span className="text-[11px] text-[#526D7D] dark:text-slate-400">completion</span>
          </div>
        </div>
      </div>

      {/* Quick Actions Strip */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#167AA0]/10 via-[#75D2EE]/10 to-[#167AA0]/5 border border-[#75D2EE]/40 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-black text-[#17364A] dark:text-white">
            Ready to boost your social presence?
          </h2>
          <p className="text-xs text-[#526D7D] dark:text-slate-300 mt-0.5">
            Select high-speed followers, likes, comments, or views with automated order verification.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Link
            href="/social-marketing/new-order"
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-[#167AA0] hover:bg-[#0E526E] text-white text-xs font-bold shadow-md shadow-[#167AA0]/20 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Order</span>
          </Link>
          <button
            onClick={handleSyncServices}
            disabled={syncing}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 hover:bg-white text-[#17364A] dark:text-white border border-[#75D2EE]/50 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync Catalog'}</span>
          </button>
        </div>
      </div>

      {/* Popular Services Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#17364A] dark:text-white">
              Featured Growth Services
            </h2>
            <p className="text-xs text-[#526D7D] dark:text-slate-400">
              Top curated social marketing packages ready for instant delivery.
            </p>
          </div>
          <Link
            href="/social-marketing/services"
            className="text-xs font-bold text-[#167AA0] dark:text-[#75D2EE] flex items-center gap-1 hover:underline self-start sm:self-auto"
          >
            <span>View Full Catalog</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Channel Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {channels.map((channel) => (
            <button
              key={channel}
              onClick={() => setSelectedChannel(channel)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedChannel === channel
                  ? 'bg-[#167AA0] text-white shadow-xs'
                  : 'bg-white/70 dark:bg-slate-800/70 text-[#526D7D] dark:text-slate-300 hover:bg-white border border-[#75D2EE]/30'
              }`}
            >
              {channel}
            </button>
          ))}
        </div>

        {/* Services Cards Grid */}
        {loading ? (
          <div className="p-12 text-center text-xs text-[#526D7D]">Loading service catalog...</div>
        ) : filteredServices.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredServices.map((service) => (
              <div
                key={service.id || service.service_id}
                className="p-5 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/80 dark:border-sky-800/80 shadow-xs hover:border-[#167AA0]/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#D7F1FA] text-[#167AA0] dark:bg-sky-950/80 dark:text-[#75D2EE] truncate">
                      {service.category}
                    </span>
                    <span className="text-[10px] text-[#526D7D] font-mono">
                      #{service.service_id}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-[#17364A] dark:text-white line-clamp-2">
                    {service.name}
                  </h3>

                  <div className="mt-3 flex items-center gap-3 text-[11px] text-[#526D7D] dark:text-slate-300">
                    <span>Min: {service.min_quantity.toLocaleString()}</span>
                    <span>•</span>
                    <span>Max: {service.max_quantity.toLocaleString()}</span>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    {service.refill && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        Refill
                      </span>
                    )}
                    {service.cancel && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        Cancel
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#75D2EE]/25 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-[#526D7D] dark:text-slate-400">
                      Rate per 1k
                    </p>
                    <p className="text-base font-black text-[#167AA0] dark:text-[#75D2EE]">
                      ${service.retail_rate.toFixed(3)}
                    </p>
                  </div>
                  <Link
                    href={`/social-marketing/new-order?serviceId=${service.service_id}`}
                    className="px-3.5 py-1.5 rounded-xl bg-[#167AA0] hover:bg-[#0E526E] text-white text-xs font-bold transition-all shadow-xs"
                  >
                    Order
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 rounded-3xl bg-white/60 dark:bg-slate-900/60 border border-dashed border-[#75D2EE]/40 text-center space-y-3">
            <Package className="w-10 h-10 text-[#526D7D]/60 mx-auto" />
            <h3 className="text-sm font-bold text-[#17364A] dark:text-white">
              No services found in this category
            </h3>
            <p className="text-xs text-[#526D7D] dark:text-slate-400 max-w-sm mx-auto">
              Synchronize the live catalog from SMMFollows to discover all supported social marketing packages.
            </p>
            <button
              onClick={handleSyncServices}
              disabled={syncing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#167AA0] text-white text-xs font-bold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>Sync Services Now</span>
            </button>
          </div>
        )}
      </div>

      {/* Recent Orders Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-[#17364A] dark:text-white">
              Recent Workspace Orders
            </h2>
            <p className="text-xs text-[#526D7D] dark:text-slate-400">
              Live status and delivery tracking for recent submissions.
            </p>
          </div>
          <Link
            href="/social-marketing/orders"
            className="text-xs font-bold text-[#167AA0] dark:text-[#75D2EE] flex items-center gap-1 hover:underline"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {orders.length > 0 ? (
          <div className="overflow-x-auto rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/80 dark:border-sky-800/80 shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#75D2EE]/25 text-[#526D7D] dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Service</th>
                  <th className="py-3 px-4">Target Link</th>
                  <th className="py-3 px-4">Qty</th>
                  <th className="py-3 px-4">Charge</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#75D2EE]/15">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#17364A] dark:text-white">
                      {order.internal_order_id}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-[#17364A] dark:text-white">
                      {order.service_name}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-[#526D7D] dark:text-slate-300 font-mono text-[11px]">
                      {order.link}
                    </td>
                    <td className="py-3 px-4 font-bold text-[#17364A] dark:text-white">
                      {order.quantity.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-[#167AA0] dark:text-[#75D2EE]">
                      ${order.customer_charge.toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={order.status} type="lead_status" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/social-marketing/orders/${order.id}`}
                        className="p-1 rounded-lg hover:bg-[#D7F1FA] text-[#167AA0] dark:hover:bg-sky-950 inline-flex items-center"
                        title="View order details"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 rounded-3xl bg-white/60 dark:bg-slate-900/60 border border-[#75D2EE]/30 text-center space-y-2">
            <Clock className="w-8 h-8 text-[#526D7D]/60 mx-auto" />
            <p className="text-xs font-bold text-[#17364A] dark:text-white">No orders placed yet</p>
            <p className="text-[11px] text-[#526D7D] dark:text-slate-400">
              Select a service from the catalog above to place your first social marketing order.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
