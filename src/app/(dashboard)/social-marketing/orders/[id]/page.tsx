'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  RefreshCw,
  Clock,
  ExternalLink,
  ShieldCheck,
  RotateCcw,
  XCircle,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Activity,
  Copy,
  Check,
} from 'lucide-react';
import {
  getSmmOrderDetailsAction,
  syncOrderStatusAction,
  requestOrderRefillAction,
  requestOrderCancellationAction,
} from '@/lib/actions/social-marketing';
import { SmmOrder } from '@/lib/types/social-marketing';
import { StatusBadge } from '@/components/crm/StatusBadge';

export default function OrderDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const unwrappedParams = use(params);
  const orderId = unwrappedParams.id;

  const [order, setOrder] = useState<SmmOrder | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [refills, setRefills] = useState<any[]>([]);
  const [cancellations, setCancellations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [syncing, setSyncing] = useState(false);
  const [refilling, setRefilling] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getSmmOrderDetailsAction(order?.workspace_id || '', orderId);
      setOrder(res.order);
      setHistory(res.history);
      setRefills(res.refills);
      setCancellations(res.cancellations);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [orderId]);

  const handleSyncStatus = async () => {
    if (!order) return;
    setSyncing(true);
    try {
      const res = await syncOrderStatusAction(order.workspace_id, order.id);
      if (res.success) {
        setFeedback(`Order status synced from provider: ${res.status}`);
        await loadData();
      } else {
        alert(res.error || 'Failed to refresh status');
      }
    } catch (err: any) {
      alert(err.message || 'Status refresh failed');
    } finally {
      setSyncing(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleRequestRefill = async () => {
    if (!order) return;
    if (!confirm('Submit a refill request to the provider for this order?')) return;

    setRefilling(true);
    try {
      const res = await requestOrderRefillAction(order.workspace_id, order.id);
      if (res.success) {
        setFeedback(`Refill request submitted successfully (Refill ID: ${res.refillId || 'pending'}).`);
        await loadData();
      } else {
        alert(res.error || 'Refill request was rejected by provider');
      }
    } catch (err: any) {
      alert(err.message || 'Refill failed');
    } finally {
      setRefilling(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const handleRequestCancellation = async () => {
    if (!order) return;
    if (!confirm('Submit a cancellation request to the provider for this order?')) return;

    setCancelling(true);
    try {
      const res = await requestOrderCancellationAction(order.workspace_id, order.id);
      if (res.success) {
        setFeedback('Cancellation request submitted to provider.');
        await loadData();
      } else {
        alert(res.error || 'Cancellation request was rejected by provider');
      }
    } catch (err: any) {
      alert(err.message || 'Cancellation failed');
    } finally {
      setCancelling(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <div className="p-16 text-center text-xs text-[#526D7D]">Loading order details...</div>;
  }

  if (!order) {
    return (
      <div className="p-16 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-[#17364A] dark:text-white">Order not found</h2>
        <p className="text-xs text-[#526D7D] dark:text-slate-400">
          The requested order ID does not exist or you do not have permission to view it.
        </p>
        <Link
          href="/social-marketing/orders"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#167AA0] text-white text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Orders</span>
        </Link>
      </div>
    );
  }

  // Delivery progress calculation
  const completedCount = Math.max(0, order.quantity - (order.remains || 0));
  const progressPercent = Math.min(100, Math.max(0, Math.round((completedCount / order.quantity) * 100)));

  const isEligibleForRefill = ['completed', 'partial'].includes(order.status) && Boolean(order.provider_order_id);
  const isEligibleForCancel = ['pending', 'in_progress', 'processing'].includes(order.status) && Boolean(order.provider_order_id);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back Link */}
      <div className="flex items-center justify-between">
        <Link
          href="/social-marketing/orders"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#526D7D] hover:text-[#17364A] dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Orders</span>
        </Link>

        {/* Live Refresh Action */}
        <button
          onClick={handleSyncStatus}
          disabled={syncing || !order.provider_order_id}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#D7F1FA] hover:bg-[#BBE6F6] text-[#167AA0] dark:bg-sky-950 dark:text-[#75D2EE] text-xs font-bold border border-[#75D2EE]/40 transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          <span>{syncing ? 'Syncing...' : 'Sync Provider Status'}</span>
        </button>
      </div>

      {/* Feedback Banner */}
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

      {/* Reconciliation Warning Banner */}
      {order.submission_state === 'unresolved_timeout' && (
        <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs space-y-1">
          <div className="flex items-center gap-2 font-bold">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span>Submission Timeout — Pending Provider Reconciliation</span>
          </div>
          <p className="pl-6 text-[11px] text-[#526D7D] dark:text-slate-300">
            {order.reconciliation_error ||
              'A network timeout occurred during order submission. To prevent double spending, this order is marked for status reconciliation before retry.'}
          </p>
        </div>
      )}

      {/* Failed / Rejected Banner */}
      {order.status === 'failed' && (
        <div className="p-4 rounded-3xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs space-y-1">
          <div className="flex items-center gap-2 font-bold">
            <XCircle className="w-4 h-4 text-rose-600" />
            <span>Order Submission Failed</span>
          </div>
          <p className="pl-6 text-[11px] text-[#526D7D] dark:text-slate-300">
            {order.error_message || 'The provider rejected the order. Your wallet balance has been refunded.'}
          </p>
        </div>
      )}

      {/* Top Details Card */}
      <div className="p-6 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/80 dark:border-sky-800/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#75D2EE]/25">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-black text-[#17364A] dark:text-white font-mono">
                {order.internal_order_id}
              </h1>
              <StatusBadge status={order.status} type="lead_status" />
            </div>
            <p className="text-xs text-[#526D7D] dark:text-slate-400 mt-1">
              Created on {new Date(order.created_at).toLocaleString()}
            </p>
          </div>

          {/* Action Buttons: Refill & Cancel */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleRequestRefill}
              disabled={refilling || !isEligibleForRefill}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold border transition-all ${
                isEligibleForRefill
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 hover:bg-emerald-100 cursor-pointer'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
              }`}
              title={
                isEligibleForRefill
                  ? 'Request free refill from provider'
                  : 'Refill is only eligible for completed or partial orders'
              }
            >
              <RotateCcw className={`w-3.5 h-3.5 ${refilling ? 'animate-spin' : ''}`} />
              <span>{refilling ? 'Requesting...' : 'Request Refill'}</span>
            </button>

            <button
              onClick={handleRequestCancellation}
              disabled={cancelling || !isEligibleForCancel}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold border transition-all ${
                isEligibleForCancel
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300 hover:bg-rose-100 cursor-pointer'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
              }`}
              title={
                isEligibleForCancel
                  ? 'Request cancellation from provider'
                  : 'Cancellation is only eligible while pending or in progress'
              }
            >
              <XCircle className={`w-3.5 h-3.5 ${cancelling ? 'animate-spin' : ''}`} />
              <span>{cancelling ? 'Cancelling...' : 'Cancel Order'}</span>
            </button>
          </div>
        </div>

        {/* Delivery Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-[#17364A] dark:text-white">
              Fulfillment Progress
            </span>
            <span className="font-mono font-bold text-[#167AA0] dark:text-[#75D2EE]">
              {completedCount.toLocaleString()} / {order.quantity.toLocaleString()} ({progressPercent}%)
            </span>
          </div>
          <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden border border-[#75D2EE]/30">
            <div
              className="h-full bg-gradient-to-r from-[#167AA0] to-[#75D2EE] transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-800/60 border border-[#75D2EE]/30">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#526D7D]">
              Ordered Quantity
            </p>
            <p className="text-lg font-black text-[#17364A] dark:text-white font-mono mt-1">
              {order.quantity.toLocaleString()}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-800/60 border border-[#75D2EE]/30">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#526D7D]">
              Start Count
            </p>
            <p className="text-lg font-black text-[#17364A] dark:text-white font-mono mt-1">
              {order.start_count?.toLocaleString() || '0'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-800/60 border border-[#75D2EE]/30">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#526D7D]">
              Remains
            </p>
            <p className="text-lg font-black text-[#17364A] dark:text-white font-mono mt-1">
              {order.remains !== undefined ? order.remains.toLocaleString() : '-'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-800/60 border border-[#75D2EE]/30">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#526D7D]">
              Customer Charge
            </p>
            <p className="text-lg font-black text-[#167AA0] dark:text-[#75D2EE] font-mono mt-1">
              ${order.customer_charge.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Details Grid: Service, Link, Provider ID */}
        <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-[#75D2EE]/30 space-y-3 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="font-bold text-[#526D7D]">Service Name:</span>
            <span className="font-bold text-[#17364A] dark:text-white text-right">
              {order.service_name} (#{order.service_id})
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="font-bold text-[#526D7D]">Target Link:</span>
            <div className="flex items-center gap-2 text-right">
              <span className="font-mono text-[#167AA0] dark:text-[#75D2EE] break-all">
                {order.link}
              </span>
              <button
                onClick={() => copyToClipboard(order.link)}
                className="p-1 text-[#526D7D] hover:text-[#17364A] cursor-pointer"
                title="Copy link"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="font-bold text-[#526D7D]">Provider Order ID:</span>
            <span className="font-mono font-bold text-[#17364A] dark:text-white">
              {order.provider_order_id || 'Not Assigned Yet'}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="font-bold text-[#526D7D]">Wholesale Cost vs Retail Charge:</span>
            <span className="font-mono text-[#526D7D]">
              Wholesale: ${order.wholesale_cost.toFixed(3)} | Margin: $
              {(order.customer_charge - order.wholesale_cost).toFixed(3)}
            </span>
          </div>
        </div>
      </div>

      {/* Status History & Audit Trail */}
      <div className="p-6 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/80 dark:border-sky-800/80 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#75D2EE]/25">
          <Activity className="w-4 h-4 text-[#167AA0]" />
          <h3 className="text-sm font-black text-[#17364A] dark:text-white">
            Delivery Audit Trail & Status History
          </h3>
        </div>

        {history.length > 0 ? (
          <div className="space-y-3">
            {history.map((h, i) => (
              <div
                key={h.id || i}
                className="flex items-start gap-3 p-3 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-[#75D2EE]/20 text-xs"
              >
                <div className="p-1.5 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 mt-0.5">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#17364A] dark:text-white capitalize">
                        {h.new_status}
                      </span>
                      {h.previous_status && (
                        <span className="text-[10px] text-[#526D7D]">
                          (from {h.previous_status})
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-[#526D7D] font-mono">
                      {new Date(h.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-[#526D7D] font-mono">
                    {h.start_count !== undefined && <span>Start: {h.start_count}</span>}
                    {h.remains !== undefined && <span>Remains: {h.remains}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#526D7D] dark:text-slate-400">
            Initial submission recorded. Click &quot;Sync Provider Status&quot; to fetch the latest telemetry.
          </p>
        )}
      </div>
    </div>
  );
}
