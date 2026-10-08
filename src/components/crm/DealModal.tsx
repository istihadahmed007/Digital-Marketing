'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Company, Contact, Deal, DealStage } from '@/lib/types/crm';
import { createDeal, updateDeal } from '@/lib/actions/deals';
import { Loader2 } from 'lucide-react';

interface DealModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  contacts: Contact[];
  companies: Company[];
  initialDeal?: Deal | null;
  defaultStage?: DealStage;
  onSuccess?: (deal: Deal) => void;
}

const STAGE_DEFAULT_PROBABILITIES: Record<DealStage, number> = {
  lead: 10,
  qualified: 30,
  proposal: 60,
  negotiation: 80,
  closed_won: 100,
  closed_lost: 0,
};

export function DealModal({
  isOpen,
  onClose,
  workspaceId,
  contacts,
  companies,
  initialDeal,
  defaultStage = 'lead',
  onSuccess,
}: DealModalProps) {
  const isEditing = Boolean(initialDeal);

  const [title, setTitle] = useState(initialDeal?.title || '');
  const [amount, setAmount] = useState(initialDeal?.amount ? String(initialDeal.amount) : '');
  const [currency, setCurrency] = useState(initialDeal?.currency || 'USD');
  const [stage, setStage] = useState<DealStage>(initialDeal?.stage || defaultStage);
  const [probability, setProbability] = useState<number>(
    initialDeal?.probability !== undefined
      ? initialDeal.probability
      : STAGE_DEFAULT_PROBABILITIES[defaultStage]
  );
  const [expectedCloseDate, setExpectedCloseDate] = useState(
    initialDeal?.expected_close_date || ''
  );
  const [contactId, setContactId] = useState(initialDeal?.contact_id || '');
  const [companyId, setCompanyId] = useState(initialDeal?.company_id || '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStageChange = (newStage: DealStage) => {
    setStage(newStage);
    setProbability(STAGE_DEFAULT_PROBABILITIES[newStage]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Deal title is required');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      setError('Please provide a valid deal value/amount');
      return;
    }

    setLoading(true);

    try {
      if (isEditing && initialDeal) {
        const res = await updateDeal(workspaceId, initialDeal.id, {
          title: title.trim(),
          amount: numAmount,
          currency,
          stage,
          probability,
          expected_close_date: expectedCloseDate || null,
          contact_id: contactId || null,
          company_id: companyId || null,
        });

        if (!res.success) {
          setError(res.error || 'Failed to update deal');
          setLoading(false);
          return;
        }

        if (onSuccess && res.deal) onSuccess(res.deal);
      } else {
        const res = await createDeal(workspaceId, {
          title: title.trim(),
          amount: numAmount,
          currency,
          stage,
          probability,
          expected_close_date: expectedCloseDate || undefined,
          contact_id: contactId || undefined,
          company_id: companyId || undefined,
        });

        if (!res.success) {
          setError(res.error || 'Failed to create deal');
          setLoading(false);
          return;
        }

        if (onSuccess && res.deal) onSuccess(res.deal);
      }

      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Deal' : 'Add Opportunity / Deal'}
      description="Track pipeline value, sales stage progression, and probability."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 rounded-xl">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Deal Title *
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Annual Cloud License - Acme Corp"
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Deal Amount *
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="10000.00"
                className="w-full pl-3 pr-16 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="bg-transparent text-xs text-slate-500 font-bold border-0 focus:ring-0 cursor-pointer"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="CAD">CAD</option>
                  <option value="AUD">AUD</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Expected Close Date
            </label>
            <input
              type="date"
              value={expectedCloseDate}
              onChange={(e) => setExpectedCloseDate(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Pipeline Stage
            </label>
            <select
              value={stage}
              onChange={(e) => handleStageChange(e.target.value as DealStage)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="lead">Lead (10%)</option>
              <option value="qualified">Qualified (30%)</option>
              <option value="proposal">Proposal (60%)</option>
              <option value="negotiation">Negotiation (80%)</option>
              <option value="closed_won">Closed Won (100%)</option>
              <option value="closed_lost">Closed Lost (0%)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Win Probability ({probability}%)
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={probability}
              onChange={(e) => setProbability(parseInt(e.target.value, 10))}
              className="w-full mt-2 accent-indigo-600 cursor-pointer"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Associated Contact
            </label>
            <select
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="">None / Unassigned</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name} ({c.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Associated Company
            </label>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="">None / Unassigned</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20 transition-all disabled:opacity-60 cursor-pointer"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{isEditing ? 'Save Changes' : 'Create Deal'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
