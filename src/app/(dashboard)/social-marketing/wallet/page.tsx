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
} from 'lucide-react';
import {
  getWorkspaceWalletAction,
  getWalletTransactionsAction,
  adminDepositFundsAction,
} from '@/lib/actions/social-marketing';
import { WorkspaceWallet, WorkspaceWalletTransaction } from '@/lib/types/social-marketing';

export default function SocialMarketingWalletPage() {
  const [wallet, setWallet] = useState<WorkspaceWallet | null>(null);
  const [transactions, setTransactions] = useState<WorkspaceWalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Deposit modal state
  const [showDepositModal, setShowDepositModal] = useState(false);
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

  const handleDepositSubmit = async (e: React.FormEvent) => {
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
        setFeedback(`Deposited $${amountNum.toFixed(2)} to workspace wallet.`);
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
          <button onClick={() => setFeedback(null)} className="text-emerald-600 font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

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
            </div>
            <p className="text-[11px] text-[#526D7D] dark:text-slate-400 mt-1">
              Funds are automatically deducted when orders are placed and credited if orders are canceled.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowDepositModal(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-[#167AA0] hover:bg-[#0E526E] text-white text-xs font-bold shadow-md shadow-[#167AA0]/20 transition-all cursor-pointer self-start md:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Deposit Funds</span>
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
          <span className="text-xs font-bold text-[#526D7D]">
            {transactions.length} entries
          </span>
        </div>

        {loading ? (
          <div className="p-16 text-center text-xs text-[#526D7D]">Loading ledger...</div>
        ) : transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#75D2EE]/25 bg-white/40 dark:bg-slate-800/40 text-[#526D7D] dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4 text-right">Balance After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#75D2EE]/15">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4 text-[#526D7D] dark:text-slate-400 whitespace-nowrap">
                      {new Date(tx.created_at).toLocaleDateString()}{' '}
                      <span className="text-[10px] block">
                        {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border ${getTransactionBadge(
                          tx.type
                        )}`}
                      >
                        {tx.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#17364A] dark:text-white font-medium max-w-sm truncate">
                      {tx.description}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-[#526D7D]">
                      {tx.reference_id || '—'}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold whitespace-nowrap">
                      <span
                        className={
                          tx.amount >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }
                      >
                        {tx.amount >= 0 ? `+$${tx.amount.toFixed(2)}` : `-$${Math.abs(tx.amount).toFixed(2)}`}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-right text-[#17364A] dark:text-white">
                      ${tx.balance_after.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-xs text-[#526D7D]">
            No wallet transactions recorded yet.
          </div>
        )}
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-[#75D2EE]/40 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-[#167AA0]" />
                <h3 className="text-sm font-black text-[#17364A] dark:text-white">
                  Add Wallet Balance
                </h3>
              </div>
              <button
                onClick={() => setShowDepositModal(false)}
                className="p-1 text-[#526D7D] hover:text-[#17364A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Truthful Notice */}
            <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-xs text-[#526D7D] dark:text-slate-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-[#167AA0] dark:text-[#75D2EE]">
                <Info className="w-4 h-4 shrink-0" />
                <span>Modular Payment Integration Boundary</span>
              </div>
              <p className="text-[11px]">
                In NexusMark, automated payment gateway deposits require webhook confirmation from an external processor (such as Stripe). Authorized workspace administrators can manually record verified deposits to replenish workspace credit.
              </p>
            </div>

            <form onSubmit={handleDepositSubmit} className="space-y-4">
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
                  placeholder="e.g., Bank transfer #1042 verified by Admin"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#75D2EE]/50 bg-white dark:bg-slate-800 text-[#17364A] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#167AA0]/40"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
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
          </div>
        </div>
      )}
    </div>
  );
}
