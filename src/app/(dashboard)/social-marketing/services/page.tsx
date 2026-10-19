'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  RefreshCw,
  Package,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Tag,
  Sliders,
  DollarSign,
  Check,
  X,
  ChevronDown,
} from 'lucide-react';
import {
  getSmmServicesAction,
  syncSmmServicesAction,
  updateServicePricingAction,
} from '@/lib/actions/social-marketing';
import { SmmService } from '@/lib/types/social-marketing';

export default function SocialMarketingServicesPage() {
  const [services, setServices] = useState<SmmService[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [filterRefill, setFilterRefill] = useState(false);
  const [filterCancel, setFilterCancel] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Edit price modal state
  const [editingService, setEditingService] = useState<SmmService | null>(null);
  const [newRetailRate, setNewRetailRate] = useState<string>('');
  const [savingPrice, setSavingPrice] = useState(false);

  const loadServices = async () => {
    setLoading(true);
    try {
      const data = await getSmmServicesAction(undefined, { onlyEnabled: false });
      setServices(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await syncSmmServicesAction();
      if (res.success) {
        setFeedback(res.message);
        await loadServices();
      } else {
        alert(res.error || res.message);
      }
    } catch (err: any) {
      alert(err.message || 'Synchronization failed');
    } finally {
      setSyncing(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleToggleEnabled = async (service: SmmService) => {
    const nextState = !service.is_enabled;
    try {
      const res = await updateServicePricingAction(service.workspace_id, service.service_id, {
        isEnabled: nextState,
      });
      if (res.success) {
        setServices((prev) =>
          prev.map((s) => (s.service_id === service.service_id ? { ...s, is_enabled: nextState } : s))
        );
      } else {
        alert(res.error || 'Failed to update service status');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveCustomPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;

    const rateNum = parseFloat(newRetailRate);
    if (isNaN(rateNum) || rateNum <= 0) {
      alert('Please enter a valid positive number for retail rate.');
      return;
    }

    setSavingPrice(true);
    try {
      const res = await updateServicePricingAction(editingService.workspace_id, editingService.service_id, {
        customRetailRate: rateNum,
      });
      if (res.success) {
        setServices((prev) =>
          prev.map((s) => (s.service_id === editingService.service_id ? { ...s, retail_rate: rateNum } : s))
        );
        setEditingService(null);
        setFeedback(`Updated retail rate for ${editingService.name} to $${rateNum.toFixed(3)} / 1k`);
      } else {
        alert(res.error || 'Failed to update price');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingPrice(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  // Derive unique categories from active services
  const categories = ['All', ...Array.from(new Set(services.map((s) => s.category))).sort()];

  // Filtered services
  const filtered = services.filter((s) => {
    if (selectedCategory !== 'All' && s.category !== selectedCategory) {
      return false;
    }
    if (filterRefill && !s.refill) return false;
    if (filterCancel && !s.cancel) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.service_id.includes(q) ||
        s.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
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

      {/* Control Strip (Search, Categories, Sync) */}
      <div className="p-5 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/80 dark:border-sky-800/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#526D7D]/70 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by service name, ID, or keyword..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-2xl bg-white/90 dark:bg-slate-800/90 border border-[#75D2EE]/40 text-[#17364A] dark:text-white placeholder-[#526D7D]/60 focus:outline-hidden focus:ring-2 focus:ring-[#167AA0]/30"
          />
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Category Dropdown */}
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-xs rounded-2xl bg-white/90 dark:bg-slate-800/90 border border-[#75D2EE]/40 text-[#17364A] dark:text-white font-semibold focus:outline-hidden cursor-pointer"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#526D7D] pointer-events-none" />
          </div>

          {/* Quick Filter Toggles */}
          <button
            onClick={() => setFilterRefill(!filterRefill)}
            className={`px-3 py-2 rounded-2xl text-xs font-semibold border transition-all cursor-pointer ${
              filterRefill
                ? 'bg-[#167AA0] text-white border-[#167AA0]'
                : 'bg-white/80 dark:bg-slate-800/80 text-[#526D7D] border-[#75D2EE]/40 hover:bg-white'
            }`}
          >
            Refill Eligible
          </button>

          <button
            onClick={() => setFilterCancel(!filterCancel)}
            className={`px-3 py-2 rounded-2xl text-xs font-semibold border transition-all cursor-pointer ${
              filterCancel
                ? 'bg-[#167AA0] text-white border-[#167AA0]'
                : 'bg-white/80 dark:bg-slate-800/80 text-[#526D7D] border-[#75D2EE]/40 hover:bg-white'
            }`}
          >
            Cancel Eligible
          </button>

          {/* Sync Catalog Button */}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#D7F1FA] hover:bg-[#BBE6F6] text-[#167AA0] dark:bg-sky-950 dark:text-[#75D2EE] text-xs font-bold border border-[#75D2EE]/40 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync Catalog'}</span>
          </button>
        </div>
      </div>

      {/* Services Table View */}
      <div className="overflow-hidden rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/80 dark:border-sky-800/80 shadow-xs">
        {loading ? (
          <div className="p-16 text-center text-xs text-[#526D7D]">Loading service catalog...</div>
        ) : filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#75D2EE]/25 bg-white/40 dark:bg-slate-800/40 text-[#526D7D] dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Service Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Min / Max</th>
                  <th className="py-3 px-4">Rate / 1k</th>
                  <th className="py-3 px-4">Features</th>
                  <th className="py-3 px-4 text-center">Enabled</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#75D2EE]/15">
                {filtered.map((service) => (
                  <tr
                    key={service.service_id}
                    className={`hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors ${
                      !service.is_enabled ? 'opacity-50 bg-slate-50/50 dark:bg-slate-900/40' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-[#526D7D] dark:text-slate-400">
                      {service.service_id}
                    </td>
                    <td className="py-3 px-4 max-w-sm">
                      <p className="font-bold text-[#17364A] dark:text-white line-clamp-2">
                        {service.name}
                      </p>
                      <span className="inline-block mt-0.5 text-[10px] text-[#526D7D] dark:text-slate-400">
                        Type: {service.type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#D7F1FA] text-[#167AA0] dark:bg-sky-950 dark:text-[#75D2EE]">
                        {service.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#526D7D] dark:text-slate-300 font-mono text-[11px] whitespace-nowrap">
                      {service.min_quantity.toLocaleString()} – {service.max_quantity.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-[#167AA0] dark:text-[#75D2EE] text-sm">
                          ${service.retail_rate.toFixed(3)}
                        </span>
                        <button
                          onClick={() => {
                            setEditingService(service);
                            setNewRetailRate(String(service.retail_rate));
                          }}
                          className="p-1 rounded text-[#526D7D] hover:text-[#167AA0] cursor-pointer"
                          title="Edit retail price markup"
                        >
                          <Sliders className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="text-[10px] text-[#526D7D] block">
                        Cost: ${service.rate.toFixed(3)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {service.refill && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200">
                            Refill
                          </span>
                        )}
                        {service.cancel && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200">
                            Cancel
                          </span>
                        )}
                        {service.dripfeed && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200">
                            Drip-feed
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleToggleEnabled(service)}
                        className={`w-8 h-4 rounded-full transition-colors relative cursor-pointer inline-block ${
                          service.is_enabled ? 'bg-[#167AA0]' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                        title={service.is_enabled ? 'Disable service' : 'Enable service'}
                      >
                        <span
                          className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                            service.is_enabled ? 'left-4.5' : 'left-0.5'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <Link
                        href={`/social-marketing/new-order?serviceId=${service.service_id}`}
                        className="px-3 py-1.5 rounded-xl bg-[#167AA0] hover:bg-[#0E526E] text-white font-bold text-xs shadow-xs transition-all inline-block"
                      >
                        Order
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-16 text-center space-y-3">
            <Package className="w-10 h-10 text-[#526D7D]/60 mx-auto" />
            <h3 className="text-sm font-bold text-[#17364A] dark:text-white">
              No matching services found
            </h3>
            <p className="text-xs text-[#526D7D] dark:text-slate-400 max-w-sm mx-auto">
              Try adjusting your search query, clearing filters, or syncing the latest services from SMMFollows.
            </p>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#167AA0] text-white text-xs font-bold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>Sync Services Now</span>
            </button>
          </div>
        )}
      </div>

      {/* Edit Retail Price Modal */}
      {editingService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-[#75D2EE]/40 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-[#17364A] dark:text-white">
                Customize Retail Price
              </h3>
              <button
                onClick={() => setEditingService(null)}
                className="p-1 text-[#526D7D] hover:text-[#17364A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#526D7D] dark:text-slate-300">
              Set the customer retail price charged per 1,000 units for{' '}
              <strong className="text-[#17364A] dark:text-white">{editingService.name}</strong>.
            </p>

            <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-xs space-y-1">
              <p className="text-[#526D7D] dark:text-slate-300">
                Provider Wholesale Rate:{' '}
                <strong className="text-[#17364A] dark:text-white">
                  ${editingService.rate.toFixed(4)} / 1k
                </strong>
              </p>
            </div>

            <form onSubmit={handleSaveCustomPrice} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#17364A] dark:text-white mb-1">
                  Retail Price per 1,000 units (USD)
                </label>
                <input
                  type="number"
                  step="0.001"
                  min={editingService.rate}
                  value={newRetailRate}
                  onChange={(e) => setNewRetailRate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#75D2EE]/50 bg-white dark:bg-slate-800 text-[#17364A] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#167AA0]/40 font-mono font-bold"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingService(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#526D7D] hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPrice}
                  className="px-4 py-2 rounded-xl bg-[#167AA0] hover:bg-[#0E526E] text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50"
                >
                  {savingPrice ? 'Saving...' : 'Save Price'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
