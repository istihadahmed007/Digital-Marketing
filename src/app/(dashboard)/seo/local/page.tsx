'use client';

import React, { useState, useEffect } from 'react';
import { SeoLocalLocation, SeoWebsite } from '@/lib/types/seo';
import {
  getLocalLocations,
  saveLocalLocation,
  runNapAudit,
  getSeoWebsites,
} from '@/lib/actions/seo';
import {
  MapPin,
  Building2,
  Phone,
  Globe,
  Plus,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ExternalLink,
  Info,
} from 'lucide-react';

export default function SeoLocalPage() {
  const [locations, setLocations] = useState<SeoLocalLocation[]>([]);
  const [websites, setWebsites] = useState<SeoWebsite[]>([]);
  const [workspaceId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nexusmark_active_workspace') || 'ws-default';
    }
    return 'ws-default';
  });

  const [loading, setLoading] = useState(true);
  const [auditingId, setAuditingId] = useState<string | null>(null);

  // Add location modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [phone, setPhone] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [savingLocation, setSavingLocation] = useState(false);

  const fetchData = async (wsId: string) => {
    setLoading(true);
    try {
      const [locList, siteList] = await Promise.all([
        getLocalLocations(wsId),
        getSeoWebsites(wsId),
      ]);
      setLocations(locList);
      setWebsites(siteList);
      if (siteList.length > 0 && !siteUrl) {
        setSiteUrl(`https://${siteList[0].domain}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(workspaceId);
  }, [workspaceId]);

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim() || !phone.trim() || !siteUrl.trim()) return;

    setSavingLocation(true);
    try {
      const res = await saveLocalLocation(workspaceId, {
        business_name: businessName,
        address_street: street,
        address_city: city,
        address_state: state,
        address_postal_code: zip,
        phone,
        website_url: siteUrl,
      });

      if (res.success && res.location) {
        setLocations((prev) => [res.location!, ...prev]);
        setIsAddOpen(false);
        setBusinessName('');
        setStreet('');
        setCity('');
        setState('');
        setZip('');
        setPhone('');
      } else {
        alert(res.error || 'Failed to save location');
      }
    } catch (err: any) {
      alert(err.message || 'Error saving location');
    } finally {
      setSavingLocation(false);
    }
  };

  const handleRunNapAudit = async (locId: string) => {
    setAuditingId(locId);
    try {
      const res = await runNapAudit(workspaceId, locId);
      if (res.success) {
        await fetchData(workspaceId);
      } else {
        alert(res.error || 'NAP audit failed');
      }
    } catch (err: any) {
      alert(err.message || 'Error running audit');
    } finally {
      setAuditingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              Local SEO
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Local SEO & NAP Consistency Checker
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage business locations and verify Name, Address, and Phone (NAP) citation consistency across your verified landing pages.
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Business Location
        </button>
      </div>

      {/* Locations Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <Loader2 className="w-8 h-8 text-rose-600 animate-spin mb-3" />
          <p className="text-xs text-slate-500">Loading business locations...</p>
        </div>
      ) : locations.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-500 space-y-3">
          <MapPin className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
          <p className="text-sm font-semibold">No business locations registered</p>
          <p className="text-xs max-w-sm mx-auto">
            Add your primary physical or registered office to audit NAP citations and verify local SEO visibility.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {locations.map((loc) => (
            <div
              key={loc.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {loc.business_name}
                    </h3>
                    <span className="text-xs text-slate-500 font-mono">
                      {loc.website_url}
                    </span>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase border ${
                      loc.nap_status === 'verified'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
                        : loc.nap_status === 'inconsistent'
                        ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400'
                        : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {loc.nap_status.replace('_', ' ')}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{loc.address_street}, {loc.address_city}, {loc.address_state} {loc.address_postal_code}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-mono">{loc.phone}</span>
                  </div>
                </div>

                {/* Audit Details */}
                {loc.audit_results?.discrepancies && loc.audit_results.discrepancies.length > 0 && (
                  <div className="mt-3 p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl space-y-1 text-xs">
                    <span className="font-bold text-amber-800 dark:text-amber-400 block">
                      Discrepancies Detected on Website:
                    </span>
                    <ul className="text-slate-600 dark:text-slate-400 list-disc list-inside space-y-0.5 text-[11px]">
                      {loc.audit_results.discrepancies.map((d: string, idx: number) => (
                        <li key={idx}>{d}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  {loc.audit_results?.lastChecked ? `Checked: ${new Date(loc.audit_results.lastChecked).toLocaleDateString()}` : 'Never checked'}
                </span>

                <button
                  onClick={() => handleRunNapAudit(loc.id)}
                  disabled={auditingId === loc.id}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
                >
                  {auditingId === loc.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  Run NAP Audit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Location Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Add Business Location
              </h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 text-xs">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddLocation} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Registered Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Acme Marketing LLC"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Street Address *
                </label>
                <input
                  type="text"
                  required
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="123 Market St, Suite 400"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="San Francisco"
                    className="w-full px-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">State</label>
                  <input
                    type="text"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="CA"
                    className="w-full px-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Postal Code</label>
                  <input
                    type="text"
                    required
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    placeholder="94105"
                    className="w-full px-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Phone *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (415) 555-0199"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Website URL *</label>
                  <input
                    type="url"
                    required
                    value={siteUrl}
                    onChange={(e) => setSiteUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-500 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingLocation}
                  className="px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-xl"
                >
                  {savingLocation ? 'Saving...' : 'Add Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
