'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Clock,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  PlusCircle,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { getSmmOrdersAction, syncBatchOrdersAction } from '@/lib/actions/social-marketing';
import { SmmOrder, SmmOrderStatus } from '@/lib/types/social-marketing';
import { StatusBadge } from '@/components/crm/StatusBadge';

export default function SocialMarketingOrdersPage() {
  const [orders, setOrders] = useState<SmmOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await getSmmOrdersAction(undefined, {
        status: statusFilter,
        search: searchQuery.trim() || undefined,
      });
      setOrders(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadOrders();
  };

  const handleBatchSync = async () => {
    setSyncing(true);
    try {
      const res = await syncBatchOrdersAction();
      if (res.success) {
        setFeedback(`Checked and updated statuses for ${res.count} active orders.`);
        await loadOrders();
      } else {
        alert(res.error || 'Failed to sync order statuses');
      }
    } catch (err: any) {
      alert(err.message || 'Batch sync failed');
    } finally {
      setSyncing(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const statusTabs = [
    { label: 'All Orders', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Completed', value: 'completed' },
    { label: 'Partial', value: 'partial' },
    { label: 'Canceled', value: 'canceled' },
    { label: 'Failed', value: 'failed' },
  ];

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
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

      {/* Control Bar (Status Pills, Search, Actions) */}
      <div className="p-5 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/80 dark:border-sky-800/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 md:pb-0">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === tab.value
                  ? 'bg-[#167AA0] text-white shadow-xs'
                  : 'bg-white/80 dark:bg-slate-800/80 text-[#526D7D] dark:text-slate-300 hover:bg-white border border-[#75D2EE]/30'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Refresh Actions */}
        <div className="flex items-center gap-2.5">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#526D7D]/70 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ID, service, link..."
              className="pl-9 pr-3 py-1.5 text-xs rounded-2xl bg-white/90 dark:bg-slate-800/90 border border-[#75D2EE]/40 text-[#17364A] dark:text-white placeholder-[#526D7D]/60 focus:outline-hidden focus:ring-2 focus:ring-[#167AA0]/30 w-44 sm:w-56"
            />
          </form>

          <button
            onClick={handleBatchSync}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#D7F1FA] hover:bg-[#BBE6F6] text-[#167AA0] dark:bg-sky-950 dark:text-[#75D2EE] text-xs font-bold border border-[#75D2EE]/40 transition-all cursor-pointer disabled:opacity-50"
            title="Refresh order statuses from provider"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{syncing ? 'Syncing...' : 'Refresh Status'}</span>
          </button>

          <Link
            href="/social-marketing/new-order"
            className="flex items-center gap-1 px-3.5 py-1.5 rounded-2xl bg-[#167AA0] hover:bg-[#0E526E] text-white text-xs font-bold shadow-xs transition-all cursor-pointer whitespace-nowrap"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Order</span>
          </Link>
        </div>
      </div>

      {/* Orders Table */}
      <div className="overflow-hidden rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/80 dark:border-sky-800/80 shadow-xs">
        {loading ? (
          <div className="p-16 text-center text-xs text-[#526D7D]">Loading order history...</div>
        ) : orders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#75D2EE]/25 bg-white/40 dark:bg-slate-800/40 text-[#526D7D] dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Service</th>
                  <th className="py-3 px-4">Target Link</th>
                  <th className="py-3 px-4">Qty</th>
                  <th className="py-3 px-4">Charge</th>
                  <th className="py-3 px-4">Remains</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#75D2EE]/15">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-mono font-bold text-[#17364A] dark:text-white">
                        {order.internal_order_id}
                      </p>
                      {order.provider_order_id && (
                        <span className="text-[10px] text-[#526D7D] font-mono">
                          Provider #{order.provider_order_id}
                        </span>
                      )}
                      {order.submission_state === 'unresolved_timeout' && (
                        <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                          Pending Reconciliation
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[#526D7D] dark:text-slate-400 whitespace-nowrap">
                      {new Date(order.created_at).toLocaleDateString()}{' '}
                      <span className="text-[10px] block">
                        {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <p className="font-bold text-[#17364A] dark:text-white truncate">
                        {order.service_name}
                      </p>
                      <span className="text-[10px] text-[#526D7D] truncate block">
                        {order.service_category}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-[#526D7D] dark:text-slate-300 font-mono text-[11px]">
                      {order.link}
                    </td>
                    <td className="py-3 px-4 font-bold text-[#17364A] dark:text-white font-mono">
                      {order.quantity.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-[#167AA0] dark:text-[#75D2EE] font-mono">
                      ${order.customer_charge.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 font-mono text-[#526D7D] dark:text-slate-400">
                      {order.remains !== undefined ? order.remains.toLocaleString() : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={order.status} type="lead_status" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/social-marketing/orders/${order.id}`}
                        className="p-1.5 rounded-xl hover:bg-[#D7F1FA] text-[#167AA0] dark:hover:bg-sky-950 inline-flex items-center gap-1 font-semibold text-[11px]"
                      >
                        <span>View</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-16 text-center space-y-3">
            <Clock className="w-10 h-10 text-[#526D7D]/60 mx-auto" />
            <h3 className="text-sm font-bold text-[#17364A] dark:text-white">
              No orders found
            </h3>
            <p className="text-xs text-[#526D7D] dark:text-slate-400 max-w-sm mx-auto">
              There are no orders matching your current filter. You can place an order right now.
            </p>
            <Link
              href="/social-marketing/new-order"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#167AA0] text-white text-xs font-bold"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Place New Order</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
