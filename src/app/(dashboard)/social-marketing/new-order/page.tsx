'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  PlusCircle,
  Package,
  Link2,
  DollarSign,
  Wallet,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  Loader2,
  Layers,
  Info,
} from 'lucide-react';
import {
  getSmmServicesAction,
  createSmmOrderAction,
  getWorkspaceWalletAction,
} from '@/lib/actions/social-marketing';
import { SmmService, WorkspaceWallet } from '@/lib/types/social-marketing';
import {
  calculateSmmPrice,
  validateServiceQuantity,
  normalizeTargetUrl,
} from '@/lib/smm/pricing';

function NewOrderForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedServiceId = searchParams.get('serviceId');

  const [services, setServices] = useState<SmmService[]>([]);
  const [wallet, setWallet] = useState<WorkspaceWallet | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [selectedServiceId, setSelectedServiceId] = useState<string>(preselectedServiceId || '');
  const [targetLink, setTargetLink] = useState('');
  const [quantity, setQuantity] = useState<number>(1000);
  const [runs, setRuns] = useState<number>(1);
  const [intervalMinutes, setIntervalMinutes] = useState<number>(0);
  const [idempotencyKey] = useState<string>(() => `idem_${Date.now()}_${Math.random().toString(36).substring(7)}`);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formWarning, setFormWarning] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [srvList, walletData] = await Promise.all([
          getSmmServicesAction(undefined, { onlyEnabled: true }),
          getWorkspaceWalletAction(),
        ]);
        setServices(srvList);
        setWallet(walletData);

        if (preselectedServiceId && srvList.some((s) => s.service_id === preselectedServiceId)) {
          setSelectedServiceId(preselectedServiceId);
          const chosen = srvList.find((s) => s.service_id === preselectedServiceId);
          if (chosen) setQuantity(chosen.min_quantity || 1000);
        } else if (srvList.length > 0 && !selectedServiceId) {
          setSelectedServiceId(srvList[0].service_id);
          setQuantity(srvList[0].min_quantity || 1000);
        }
      } catch (err: any) {
        setFormError('Failed to load services and wallet data.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [preselectedServiceId]);

  // Current selected service
  const selectedService = useMemo(
    () => services.find((s) => s.service_id === selectedServiceId),
    [services, selectedServiceId]
  );

  // Group services by category for clean dropdown selection
  const categories = useMemo(() => {
    const map = new Map<string, SmmService[]>();
    for (const s of services) {
      const list = map.get(s.category) || [];
      list.push(s);
      map.set(s.category, list);
    }
    return Array.from(map.entries());
  }, [services]);

  // Validation checks
  const quantityValidation = useMemo(() => {
    if (!selectedService) return { valid: true };
    return validateServiceQuantity(quantity, selectedService.min_quantity, selectedService.max_quantity);
  }, [quantity, selectedService]);

  const urlValidation = useMemo(() => {
    if (!targetLink) return { valid: false, error: 'Target link or handle is required' };
    return normalizeTargetUrl(targetLink);
  }, [targetLink]);

  // Price calculations
  const priceCalculation = useMemo(() => {
    if (!selectedService || quantity <= 0) {
      return { customerCharge: 0, retailRate: 0, wholesaleCost: 0 };
    }
    try {
      return calculateSmmPrice({
        quantity,
        wholesaleRate: selectedService.rate,
        customRetailRate: selectedService.retail_rate,
      });
    } catch {
      return { customerCharge: 0, retailRate: 0, wholesaleCost: 0 };
    }
  }, [selectedService, quantity]);

  const totalCharge = priceCalculation.customerCharge * (runs > 1 ? runs : 1);
  const currentBalance = wallet ? wallet.balance : 0;
  const hasInsufficientBalance = currentBalance < totalCharge;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormWarning(null);

    if (!selectedService) {
      setFormError('Please select a service.');
      return;
    }

    if (!quantityValidation.valid) {
      setFormError(quantityValidation.error || 'Invalid quantity.');
      return;
    }

    if (!urlValidation.valid || !urlValidation.normalized) {
      setFormError(urlValidation.error || 'Please enter a valid target link.');
      return;
    }

    if (hasInsufficientBalance) {
      setFormError(
        `Insufficient wallet balance. You need $${totalCharge.toFixed(2)}, but current balance is $${currentBalance.toFixed(2)}.`
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await createSmmOrderAction(selectedService.workspace_id, {
        serviceId: selectedService.service_id,
        link: urlValidation.normalized,
        quantity,
        runs: runs > 1 ? runs : undefined,
        intervalMinutes: intervalMinutes > 0 ? intervalMinutes : undefined,
        idempotencyKey,
      });

      if (res.success && res.order) {
        if (res.order.submission_state === 'unresolved_timeout') {
          // Ambiguous outcome notification
          router.push(`/social-marketing/orders/${res.order.id}?warning=timeout_reconciliation`);
        } else {
          router.push(`/social-marketing/orders/${res.order.id}?success=order_placed`);
        }
      } else {
        setFormError(res.error || 'Order submission failed.');
      }
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred during submission.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-16 text-center text-xs text-[#526D7D]">Loading order wizard...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Alert Notices */}
      {formError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {formWarning && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <Info className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{formWarning}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form Column */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/80 dark:border-sky-800/80 shadow-xs space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-[#75D2EE]/25">
            <PlusCircle className="w-5 h-5 text-[#167AA0]" />
            <div>
              <h2 className="text-base font-black text-[#17364A] dark:text-white">
                Place New Social Marketing Order
              </h2>
              <p className="text-xs text-[#526D7D] dark:text-slate-400">
                Choose a service and specify the target URL and requested quantity.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 1. Service Selection */}
            <div>
              <label className="block text-xs font-bold text-[#17364A] dark:text-white mb-1.5">
                Select Service Package
              </label>
              <select
                value={selectedServiceId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedServiceId(id);
                  const chosen = services.find((s) => s.service_id === id);
                  if (chosen && (quantity < chosen.min_quantity || quantity > chosen.max_quantity)) {
                    setQuantity(chosen.min_quantity);
                  }
                }}
                className="w-full px-3.5 py-2.5 text-xs rounded-2xl border border-[#75D2EE]/50 bg-white/90 dark:bg-slate-800/90 text-[#17364A] dark:text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-[#167AA0]/40 cursor-pointer"
                required
              >
                {categories.map(([category, items]) => (
                  <optgroup key={category} label={category}>
                    {items.map((item) => (
                      <option key={item.service_id} value={item.service_id}>
                        #{item.service_id} — {item.name} (${item.retail_rate.toFixed(2)}/1k)
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Service Capabilities Preview Box */}
            {selectedService && (
              <div className="p-3.5 rounded-2xl bg-sky-50/70 dark:bg-sky-950/40 border border-[#75D2EE]/40 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#167AA0] dark:text-[#75D2EE]">
                    {selectedService.category}
                  </span>
                  <span className="text-[10px] text-[#526D7D] font-mono">
                    ID: {selectedService.service_id}
                  </span>
                </div>
                <p className="text-[#17364A] dark:text-white font-medium">
                  {selectedService.name}
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#75D2EE]/20 text-[11px]">
                  <span className="text-[#526D7D]">
                    Limits: <strong>{selectedService.min_quantity.toLocaleString()}</strong> to{' '}
                    <strong>{selectedService.max_quantity.toLocaleString()}</strong>
                  </span>
                  <span>•</span>
                  <span className="text-[#526D7D]">
                    Rate:{' '}
                    <strong className="text-[#167AA0] dark:text-[#75D2EE]">
                      ${selectedService.retail_rate.toFixed(3)} / 1,000
                    </strong>
                  </span>
                  {selectedService.refill && (
                    <span className="ml-auto px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-100 text-emerald-800">
                      Refill Supported
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* 2. Target Link */}
            <div>
              <label className="block text-xs font-bold text-[#17364A] dark:text-white mb-1.5">
                Target Link or Social Handle
              </label>
              <div className="relative">
                <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#526D7D]/70 pointer-events-none" />
                <input
                  type="text"
                  value={targetLink}
                  onChange={(e) => setTargetLink(e.target.value)}
                  placeholder="https://instagram.com/username or @username"
                  className={`w-full pl-10 pr-4 py-2.5 text-xs rounded-2xl bg-white/90 dark:bg-slate-800/90 border ${
                    targetLink && !urlValidation.valid
                      ? 'border-rose-400 focus:ring-rose-400'
                      : 'border-[#75D2EE]/50 focus:ring-[#167AA0]/40'
                  } text-[#17364A] dark:text-white font-mono focus:outline-hidden focus:ring-2`}
                  required
                />
              </div>
              {targetLink && !urlValidation.valid && (
                <p className="mt-1 text-[11px] text-rose-500 font-medium">
                  {urlValidation.error}
                </p>
              )}
            </div>

            {/* 3. Quantity */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-[#17364A] dark:text-white">
                  Order Quantity
                </label>
                {selectedService && (
                  <span className="text-[10px] text-[#526D7D]">
                    Min: {selectedService.min_quantity.toLocaleString()} | Max:{' '}
                    {selectedService.max_quantity.toLocaleString()}
                  </span>
                )}
              </div>
              <input
                type="number"
                min={selectedService?.min_quantity || 1}
                max={selectedService?.max_quantity || 1000000}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
                className={`w-full px-3.5 py-2.5 text-xs rounded-2xl bg-white/90 dark:bg-slate-800/90 border ${
                  !quantityValidation.valid
                    ? 'border-rose-400 focus:ring-rose-400'
                    : 'border-[#75D2EE]/50 focus:ring-[#167AA0]/40'
                } text-[#17364A] dark:text-white font-mono font-bold focus:outline-hidden focus:ring-2`}
                required
              />
              {!quantityValidation.valid && (
                <p className="mt-1 text-[11px] text-rose-500 font-medium">
                  {quantityValidation.error}
                </p>
              )}
            </div>

            {/* Drip-feed parameters (if supported) */}
            {selectedService?.dripfeed && (
              <div className="p-3.5 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 space-y-3">
                <span className="text-xs font-bold text-purple-800 dark:text-purple-300">
                  Drip-Feed Options (Optional)
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#526D7D] mb-1">
                      Runs (Cycles)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={runs}
                      onChange={(e) => setRuns(parseInt(e.target.value, 10) || 1)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-800 text-[#17364A] dark:text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#526D7D] mb-1">
                      Interval (Minutes)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={1440}
                      value={intervalMinutes}
                      onChange={(e) => setIntervalMinutes(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-800 text-[#17364A] dark:text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || hasInsufficientBalance || !quantityValidation.valid}
              className="w-full py-3 px-4 rounded-2xl bg-[#167AA0] hover:bg-[#0E526E] text-white text-xs font-bold shadow-md shadow-[#167AA0]/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Order to Provider...</span>
                </>
              ) : (
                <>
                  <span>Submit Order (${totalCharge.toFixed(2)})</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Financial Summary Card */}
        <div className="p-6 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/80 dark:border-sky-800/80 shadow-xs h-fit space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-[#75D2EE]/25">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-black uppercase tracking-wider text-[#17364A] dark:text-white">
              Order Financial Summary
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center text-[#526D7D] dark:text-slate-300">
              <span>Requested Quantity</span>
              <span className="font-bold text-[#17364A] dark:text-white font-mono">
                {quantity.toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between items-center text-[#526D7D] dark:text-slate-300">
              <span>Retail Rate (per 1k)</span>
              <span className="font-bold text-[#17364A] dark:text-white font-mono">
                ${selectedService ? selectedService.retail_rate.toFixed(3) : '0.000'}
              </span>
            </div>

            {runs > 1 && (
              <div className="flex justify-between items-center text-[#526D7D] dark:text-slate-300">
                <span>Drip-Feed Runs</span>
                <span className="font-bold text-[#17364A] dark:text-white font-mono">
                  {runs}x
                </span>
              </div>
            )}

            <div className="pt-3 border-t border-[#75D2EE]/25 flex justify-between items-center">
              <span className="font-bold text-[#17364A] dark:text-white">Total Customer Charge</span>
              <span className="text-lg font-black text-[#167AA0] dark:text-[#75D2EE] font-mono">
                ${totalCharge.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Wallet Balance Status */}
          <div className="pt-4 border-t border-[#75D2EE]/25 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#526D7D]">Available Wallet Balance</span>
              <span className="font-black text-[#17364A] dark:text-white font-mono">
                ${currentBalance.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-[#526D7D]">Estimated Remaining</span>
              <span
                className={`font-mono font-bold ${
                  hasInsufficientBalance ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                ${(currentBalance - totalCharge).toFixed(2)}
              </span>
            </div>

            {hasInsufficientBalance && (
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs space-y-2">
                <p className="text-rose-700 dark:text-rose-300 font-semibold">
                  Insufficient funds in workspace wallet.
                </p>
                <Link
                  href="/social-marketing/wallet"
                  className="block text-center py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-all"
                >
                  Top Up Wallet
                </Link>
              </div>
            )}
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 text-[11px] text-[#526D7D] dark:text-slate-400 space-y-1">
            <p className="font-bold text-[#17364A] dark:text-slate-200">
              Safe Fulfillment Guarantee
            </p>
            <p>
              Your order is recorded with idempotent request deduplication. If the provider rejects the order, your wallet will be refunded immediately.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SocialMarketingNewOrderPage() {
  return (
    <Suspense fallback={<div className="p-16 text-center text-xs text-[#526D7D]">Loading...</div>}>
      <NewOrderForm />
    </Suspense>
  );
}
