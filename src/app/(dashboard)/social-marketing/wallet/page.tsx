'use client';

import React, { useState, useEffect } from 'react';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  PlusCircle,
  Clock,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Info,
  X,
  ExternalLink,
  CreditCard,
  ArrowRight,
  Sparkles,
  Coins,
} from 'lucide-react';
import {
  getWorkspaceWalletAction,
  getWalletTransactionsAction,
  adminDepositFundsAction,
  submitPaymentlyDepositAction,
} from '@/lib/actions/social-marketing';
import { WorkspaceWallet, WorkspaceWalletTransaction } from '@/lib/types/social-marketing';
import {
  DEFAULT_PAYMENTLY_URL,
  DEFAULT_BDT_PER_USD,
  convertBdtToUsd,
  convertUsdToBdt,
} from '@/lib/constants/payments';

export default function SocialMarketingWalletPage() {
  const [wallet, setWallet] = useState<WorkspaceWallet | null>(null);
  const [transactions, setTransactions] = useState<WorkspaceWalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Deposit modal state
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositTab, setDepositTab] = useState<'paymently' | 'admin'>('paymently');

  // Paymently deposit state
  const [paymentlyBdt, setPaymentlyBdt] = useState<string>('1250');
  const [paymentlyUsd, setPaymentlyUsd] = useState<string>('10.00');
  const [paymentlyTrxId, setPaymentlyTrxId] = useState<string>('');
  const [paymentlyMethod, setPaymentlyMethod] = useState<string>('bKash');
  const [paymentlyNotes, setPaymentlyNotes] = useState<string>('');
  const [submittingPaymently, setSubmittingPaymently] = useState(false);

  // Admin deposit state
  const [depositAmount, setDepositAmount] = useState<string>('50.00');
  const [depositNote, setDepositNote] = useState<string>('Admin manual credit top-up');
  const [submittingDeposit, setSubmittingDeposit] = useState(false);

  const [feedback, setFeedback] = useState<string | null>(null);

  const loadWalletData = async () => {
    setLoading(true);
    try {
      const [w, txList] = await Promise.all([
        getWorkspaceWalletAction(),
        getWalletTransactionsAction(undefined, 100),
      ]);
      setWallet(w);
      setTransactions(txList);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWalletData();
  }, []);

  // Update BDT when USD changes
  const handleUsdChange = (usdVal: string) => {
    setPaymentlyUsd(usdVal);
    const num = parseFloat(usdVal);
    if (!isNaN(num) && num > 0) {
      setPaymentlyBdt(convertUsdToBdt(num).toString());
    }
  };

  // Update USD when BDT changes
  const handleBdtChange = (bdtVal: string) => {
    setPaymentlyBdt(bdtVal);
    const num = parseFloat(bdtVal);
    if (!isNaN(num) && num > 0) {
      setPaymentlyUsd(convertBdtToUsd(num).toFixed(2));
    }
  };

  // Submit Paymently Deposit
  const handlePaymentlySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const usdNum = parseFloat(paymentlyUsd);
    const bdtNum = parseFloat(paymentlyBdt);

    if (isNaN(usdNum) || usdNum <= 0) {
      alert('Please enter a valid deposit amount greater than $0.00.');
      return;
    }

    if (!paymentlyTrxId.trim()) {
      alert('Please enter the Paymently Transaction ID (TrxID) or Reference number from your payment.');
      return;
    }

    setSubmittingPaymently(true);
    try {
      const res = await submitPaymentlyDepositAction(wallet?.workspace_id || '', {
        amountUsd: usdNum,
        amountBdt: isNaN(bdtNum) ? undefined : bdtNum,
        trxId: paymentlyTrxId.trim(),
        paymentMethod: paymentlyMethod,
        notes: paymentlyNotes.trim() || undefined,
      });

      if (res.success) {
        setFeedback(`Paymently deposit credited! $${usdNum.toFixed(2)} added to workspace wallet.`);
        setShowDepositModal(false);
        setPaymentlyTrxId('');
        setPaymentlyNotes('');
        await loadWalletData();
      } else {
        alert(res.error || 'Failed to record Paymently deposit');
      }
    } catch (err: any) {
      alert(err.message || 'Deposit submission failed');
    } finally {
      setSubmittingPaymently(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  // Submit Admin Manual Deposit
  const handleAdminDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(depositAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Please enter a valid deposit amount greater than $0.00.');
      return;
    }

    setSubmittingDeposit(true);
    try {
      const res = await adminDepositFundsAction(wallet?.workspace_id || '', amountNum, depositNote);
      if (res.success) {
        setFeedback(`Admin manual deposit of $${amountNum.toFixed(2)} recorded.`);
        setShowDepositModal(false);
        await loadWalletData();
      } else {
        alert(res.error || 'Failed to deposit funds');
      }
    } catch (err: any) {
      alert(err.message || 'Deposit failed');
    } finally {
      setSubmittingDeposit(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  // Summaries
  const totalDeposits = transactions
    .filter((t) => t.type === 'deposit')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const totalCharges = transactions
    .filter((t) => t.type === 'order_charge')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const totalRefunds = transactions
    .filter((t) => t.type === 'refund')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const getTransactionBadge = (type: string) => {
    switch (type) {
      case 'deposit':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200';
      case 'order_charge':
        return 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border-sky-200';
      case 'refund':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200';
      case 'adjustment':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedback && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{feedback}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-emerald-600 font-bold hover:underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Paymently Online Gateway Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-[#75D2EE]/20 to-sky-500/10 border border-emerald-500/30 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-xs">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-black text-[#17364A] dark:text-white">
                Paymently Online Gateway (BDT)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                bKash • Nagad • Rocket • Cards
              </span>
            </div>
            <p className="text-xs text-[#526D7D] dark:text-slate-300 mt-1">
              Top up your balance instantly in Bangladeshi Taka (BDT). Conversion rate: <strong>1 USD ≈ {DEFAULT_BDT_PER_USD} BDT</strong>.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto shrink-0">
          <a
            href={DEFAULT_PAYMENTLY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <span>Pay on Paymently (BDT)</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            onClick={() => {
              setDepositTab('paymently');
              setShowDepositModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 hover:bg-white text-[#167AA0] dark:text-[#75D2EE] text-xs font-bold border border-[#75D2EE]/40 transition-all cursor-pointer shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Submit Payment TrxID</span>
          </button>
        </div>
      </div>

      {/* Main Balance Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#167AA0]/15 via-[#75D2EE]/20 to-[#167AA0]/10 border border-[#75D2EE]/40 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#167AA0] to-[#75D2EE] flex items-center justify-center text-white shadow-md shadow-[#167AA0]/30">
            <Wallet className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#526D7D] dark:text-slate-300">
              Workspace Available Balance
            </p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-3xl font-black text-[#17364A] dark:text-white font-mono">
                ${wallet ? wallet.balance.toFixed(2) : '0.00'}
              </span>
              <span className="text-xs font-bold text-[#167AA0] dark:text-[#75D2EE]">
                {wallet?.currency || 'USD'}
              </span>
              <span className="text-xs text-[#526D7D] dark:text-slate-400 font-mono">
                (≈ ৳{((wallet?.balance || 0) * DEFAULT_BDT_PER_USD).toLocaleString()} BDT)
              </span>
            </div>
            <p className="text-[11px] text-[#526D7D] dark:text-slate-400 mt-1">
              Funds are automatically deducted when orders are placed and credited if orders are canceled.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setDepositTab('paymently');
            setShowDepositModal(true);
          }}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-[#167AA0] hover:bg-[#0E526E] text-white text-xs font-bold shadow-md shadow-[#167AA0]/20 transition-all cursor-pointer self-start md:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Deposit / Add Funds</span>
        </button>
      </div>

      {/* Summary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/80 dark:border-sky-800/80 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-[#526D7D] dark:text-slate-400">
              Total Deposits
            </p>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-[#17364A] dark:text-white font-mono mt-2">
            +${totalDeposits.toFixed(2)}
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/80 dark:border-sky-800/80 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-[#526D7D] dark:text-slate-400">
              Order Expenditures
            </p>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-[#17364A] dark:text-white font-mono mt-2">
            -${totalCharges.toFixed(2)}
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/80 dark:border-sky-800/80 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-[#526D7D] dark:text-slate-400">
              Refunds Credited
            </p>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-[#17364A] dark:text-white font-mono mt-2">
            +${totalRefunds.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Ledger Audit Table */}
      <div className="overflow-hidden rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/80 dark:border-sky-800/80 shadow-xs space-y-4 p-6">
        <div className="flex items-center justify-between pb-3 border-b border-[#75D2EE]/25">
          <div>
            <h2 className="text-sm font-black text-[#17364A] dark:text-white">
              Wallet Transaction Ledger
            </h2>
            <p className="text-xs text-[#526D7D] dark:text-slate-400">
              Immutable chronological record of deposits, charges, and refunds.
            </p>
          </div>
          <span className="text-xs font-mono text-[#526D7D]">
            {transactions.length} record{transactions.length === 1 ? '' : 's'}
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-[#526D7D]">Loading transaction ledger...</div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#526D7D]">
            No wallet transactions recorded yet. Use the deposit button above to add balance.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#D7F1FA]/30 dark:bg-sky-950/30 text-[#17364A] dark:text-white font-bold border-b border-[#75D2EE]/20">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Description / Reference</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Balance After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#75D2EE]/15 font-medium">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-sky-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4 text-[#526D7D] dark:text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      {new Date(tx.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getTransactionBadge(
                          tx.type
                        )}`}
                      >
                        {tx.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#17364A] dark:text-white max-w-md">
                      <p className="truncate font-semibold">{tx.description}</p>
                      {tx.reference_id && (
                        <span className="text-[10px] text-[#526D7D] dark:text-slate-400 font-mono">
                          Ref: {tx.reference_id}
                        </span>
                      )}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-mono font-bold whitespace-nowrap ${
                        tx.amount >= 0 ? 'text-emerald-600' : 'text-[#167AA0] dark:text-[#75D2EE]'
                      }`}
                    >
                      {tx.amount >= 0 ? `+$${tx.amount.toFixed(2)}` : `-$${Math.abs(tx.amount).toFixed(2)}`}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-[#17364A] dark:text-white whitespace-nowrap">
                      ${tx.balance_after.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-[#75D2EE]/40 space-y-4 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#75D2EE]/25">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-[#167AA0]" />
                <h3 className="text-sm font-black text-[#17364A] dark:text-white">
                  Add Wallet Balance
                </h3>
              </div>
              <button
                onClick={() => setShowDepositModal(false)}
                className="p-1 text-[#526D7D] hover:text-[#17364A] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex p-1 bg-sky-50 dark:bg-slate-800 rounded-2xl">
              <button
                type="button"
                onClick={() => setDepositTab('paymently')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  depositTab === 'paymently'
                    ? 'bg-[#167AA0] text-white shadow-xs'
                    : 'text-[#526D7D] hover:text-[#17364A] dark:hover:text-white'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Paymently (BDT Online)</span>
              </button>
              <button
                type="button"
                onClick={() => setDepositTab('admin')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  depositTab === 'admin'
                    ? 'bg-[#167AA0] text-white shadow-xs'
                    : 'text-[#526D7D] hover:text-[#17364A] dark:hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Manual Admin Credit</span>
              </button>
            </div>

            {depositTab === 'paymently' ? (
              <form onSubmit={handlePaymentlySubmit} className="space-y-4">
                {/* Step 1 Card: Open Payment Link */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-sky-500/10 border border-emerald-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wide">
                      Step 1: Complete Payment in BDT
                    </span>
                    <span className="text-[10px] font-mono text-[#526D7D]">1 USD ≈ {DEFAULT_BDT_PER_USD} BDT</span>
                  </div>
                  <p className="text-xs text-[#526D7D] dark:text-slate-300">
                    Click below to open the secure Paymently gateway in a new tab. Pay using bKash, Nagad, Rocket, or Card.
                  </p>
                  <a
                    href={DEFAULT_PAYMENTLY_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                  >
                    <span>Open Paymently Checkout (BDT)</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                {/* Step 2 Form: Enter Details */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#17364A] dark:text-white uppercase tracking-wide">
                      Step 2: Enter Transaction Details
                    </span>
                  </div>

                  {/* Dual Currency Calculator */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#17364A] dark:text-white mb-1">
                        Amount in BDT (৳)
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={paymentlyBdt}
                        onChange={(e) => handleBdtChange(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-[#75D2EE]/50 bg-white dark:bg-slate-800 text-[#17364A] dark:text-white font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-[#167AA0]/40"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#17364A] dark:text-white mb-1">
                        Credited in USD ($)
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={paymentlyUsd}
                        onChange={(e) => handleUsdChange(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-[#75D2EE]/50 bg-white dark:bg-slate-800 text-[#17364A] dark:text-white font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-[#167AA0]/40"
                        required
                      />
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="block text-xs font-bold text-[#17364A] dark:text-white mb-1">
                      Payment Method
                    </label>
                    <select
                      value={paymentlyMethod}
                      onChange={(e) => setPaymentlyMethod(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#75D2EE]/50 bg-white dark:bg-slate-800 text-[#17364A] dark:text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-[#167AA0]/40 cursor-pointer"
                    >
                      <option value="bKash">bKash</option>
                      <option value="Nagad">Nagad</option>
                      <option value="Rocket">Rocket</option>
                      <option value="Upay">Upay</option>
                      <option value="Visa / Mastercard">Visa / Mastercard (Cards)</option>
                      <option value="Internet Banking">Internet Banking</option>
                    </select>
                  </div>

                  {/* Transaction ID */}
                  <div>
                    <label className="block text-xs font-bold text-[#17364A] dark:text-white mb-1">
                      Paymently Transaction ID (TrxID) / Order Reference
                    </label>
                    <input
                      type="text"
                      value={paymentlyTrxId}
                      onChange={(e) => setPaymentlyTrxId(e.target.value)}
                      placeholder="e.g., 9K48LA9X or Paymently Invoice ID"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#75D2EE]/50 bg-white dark:bg-slate-800 text-[#17364A] dark:text-white font-mono uppercase font-bold focus:outline-hidden focus:ring-2 focus:ring-[#167AA0]/40"
                      required
                    />
                  </div>

                  {/* Notes / Sender phone */}
                  <div>
                    <label className="block text-xs font-bold text-[#17364A] dark:text-white mb-1">
                      Sender Phone / Notes (Optional)
                    </label>
                    <input
                      type="text"
                      value={paymentlyNotes}
                      onChange={(e) => setPaymentlyNotes(e.target.value)}
                      placeholder="e.g., Sent from 017xxxxxxxx"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#75D2EE]/50 bg-white dark:bg-slate-800 text-[#17364A] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#167AA0]/40"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#75D2EE]/25">
                  <button
                    type="button"
                    onClick={() => setShowDepositModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-[#526D7D] hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingPaymently}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {submittingPaymently ? 'Crediting Wallet...' : `Confirm & Add $${paymentlyUsd}`}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAdminDepositSubmit} className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-xs text-[#526D7D] dark:text-slate-300 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-[#167AA0] dark:text-[#75D2EE]">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>Authorized Admin Adjustment</span>
                  </div>
                  <p className="text-[11px]">
                    Directly credits the workspace wallet ledger with an administrative audit memo.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#17364A] dark:text-white mb-1">
                    Deposit Amount (USD)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#526D7D] pointer-events-none" />
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-[#75D2EE]/50 bg-white dark:bg-slate-800 text-[#17364A] dark:text-white font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-[#167AA0]/40"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#17364A] dark:text-white mb-1">
                    Audit Ledger Memo / Note
                  </label>
                  <input
                    type="text"
                    value={depositNote}
                    onChange={(e) => setDepositNote(e.target.value)}
                    placeholder="e.g., Bank transfer verified by Admin"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#75D2EE]/50 bg-white dark:bg-slate-800 text-[#17364A] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#167AA0]/40"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#75D2EE]/25">
                  <button
                    type="button"
                    onClick={() => setShowDepositModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-[#526D7D] hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingDeposit}
                    className="px-4 py-2 rounded-xl bg-[#167AA0] hover:bg-[#0E526E] text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {submittingDeposit ? 'Processing...' : 'Confirm Deposit'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
