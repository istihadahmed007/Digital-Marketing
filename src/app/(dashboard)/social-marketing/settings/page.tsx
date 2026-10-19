'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Key,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Percent,
  DollarSign,
  Layers,
  Activity,
  Server,
  Lock,
} from 'lucide-react';
import {
  getSmmSettingsAction,
  updateSmmSettingsAction,
  testSmmConnectionAction,
  getSmmProviderBalanceAction,
  syncSmmServicesAction,
} from '@/lib/actions/social-marketing';
import { SmmSettings } from '@/lib/types/social-marketing';

export default function SocialMarketingSettingsPage() {
  const [settings, setSettings] = useState<SmmSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [markupPercent, setMarkupPercent] = useState<number>(30);
  const [minMargin, setMinMargin] = useState<number>(0.05);
  const [isEnabled, setIsEnabled] = useState(false);

  // Actions state
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [syncingCatalog, setSyncingCatalog] = useState(false);
  const [providerBalance, setProviderBalance] = useState<{ balance: string; currency: string } | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await getSmmSettingsAction();
      setSettings(data);
      setApiKeyInput(data.api_key || '');
      setMarkupPercent(data.default_markup_percent || 30);
      setMinMargin(data.min_order_margin || 0.05);
      setIsEnabled(data.is_enabled);

      if (data.connection_status === 'connected') {
        getSmmProviderBalanceAction()
          .then((b) => setProviderBalance(b))
          .catch(() => setProviderBalance(null));
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage(null);

    try {
      const res = await updateSmmSettingsAction(settings?.workspace_id || '', {
        apiKey: apiKeyInput,
        defaultMarkupPercent: markupPercent,
        minOrderMargin: minMargin,
        isEnabled,
      });

      if (res.success) {
        setFeedback('Social marketing settings saved successfully.');
        await loadSettings();
      } else {
        setErrorMessage(res.error || 'Failed to save settings.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving settings');
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setErrorMessage(null);
    try {
      const res = await testSmmConnectionAction(settings?.workspace_id || '', apiKeyInput);
      if (res.success) {
        setFeedback(`Connection verified! Live wholesale provider balance: $${res.balance} ${res.currency}`);
        setProviderBalance({ balance: res.balance || '0.00', currency: res.currency || 'USD' });
        await loadSettings();
      } else {
        setErrorMessage(res.error || 'Connection test failed. Verify your API key.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Connection test failed');
    } finally {
      setTestingConnection(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const handleSyncServices = async () => {
    setSyncingCatalog(true);
    setErrorMessage(null);
    try {
      const res = await syncSmmServicesAction(settings?.workspace_id);
      if (res.success) {
        setFeedback(res.message);
      } else {
        setErrorMessage(res.error || res.message);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Catalog synchronization failed');
    } finally {
      setSyncingCatalog(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const isConnected = settings?.connection_status === 'connected';

  if (loading) {
    return <div className="p-16 text-center text-xs text-[#526D7D]">Loading settings...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Provider Status Header Card */}
      <div className="p-6 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/80 dark:border-sky-800/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#D7F1FA] text-[#167AA0] dark:bg-sky-950 dark:text-[#75D2EE] flex items-center justify-center border border-[#75D2EE]/40">
            <Server className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-black text-[#17364A] dark:text-white">
                SMMFollows Provider Infrastructure
              </h2>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                  isConnected
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-300'
                }`}
              >
                {isConnected ? 'Connected & Verified' : 'Configuration Required'}
              </span>
            </div>
            <p className="text-xs text-[#526D7D] dark:text-slate-400 mt-1">
              Endpoint: <code className="font-mono text-[11px]">https://smmfollows.com/api/v2</code>
            </p>
          </div>
        </div>

        {/* Live Provider Balance (Admin only) */}
        {providerBalance && (
          <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-[#75D2EE]/40 text-right self-start md:self-auto">
            <p className="text-[10px] uppercase font-bold text-[#526D7D] dark:text-slate-400">
              Provider Wholesale Balance
            </p>
            <p className="text-xl font-black text-[#167AA0] dark:text-[#75D2EE] font-mono mt-0.5">
              ${parseFloat(providerBalance.balance).toFixed(2)} {providerBalance.currency}
            </p>
            <span className="text-[10px] text-[#526D7D]">Restricted to authorized admins</span>
          </div>
        )}
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSaveSettings} className="p-6 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/80 dark:border-sky-800/80 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#75D2EE]/25">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-[#167AA0]" />
            <h3 className="text-sm font-black text-[#17364A] dark:text-white">
              Credentials & Secret Vault
            </h3>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
            <Lock className="w-3.5 h-3.5" />
            <span>AES-256-GCM Encrypted at Rest</span>
          </span>
        </div>

        {/* API Key Field */}
        <div>
          <label className="block text-xs font-bold text-[#17364A] dark:text-white mb-1.5">
            SMMFollows API Key
          </label>
          <div className="relative">
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder={
                settings?.api_key_is_set
                  ? '•••••••••••••••••••••••••••••••• (Configured)'
                  : 'Enter SMMFollows API Key...'
              }
              className="w-full px-3.5 py-2.5 text-xs rounded-2xl bg-white/90 dark:bg-slate-800/90 border border-[#75D2EE]/50 text-[#17364A] dark:text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-[#167AA0]/40"
            />
          </div>
          <p className="text-[11px] text-[#526D7D] dark:text-slate-400 mt-1">
            API key is stored encrypted and never returned in plaintext to browser code. You may also provide{' '}
            <code className="font-mono">SMMFOLLOWS_API_KEY</code> in server environment variables.
          </p>
        </div>

        {/* Action Button: Test Connection */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testingConnection}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#D7F1FA] hover:bg-[#BBE6F6] text-[#167AA0] dark:bg-sky-950 dark:text-[#75D2EE] text-xs font-bold border border-[#75D2EE]/40 transition-all cursor-pointer disabled:opacity-50"
          >
            <Activity className={`w-4 h-4 ${testingConnection ? 'animate-spin' : ''}`} />
            <span>{testingConnection ? 'Testing Connection...' : 'Test API Connection'}</span>
          </button>
        </div>

        {/* Retail Pricing & Markup Section */}
        <div className="pt-6 border-t border-[#75D2EE]/25 space-y-4">
          <div className="flex items-center gap-2">
            <Percent className="w-5 h-5 text-[#167AA0]" />
            <h3 className="text-sm font-black text-[#17364A] dark:text-white">
              Global Retail Markup & Pricing Rules
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#17364A] dark:text-white mb-1.5">
                Default Retail Markup (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="1000"
                  step="1"
                  value={markupPercent}
                  onChange={(e) => setMarkupPercent(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-2xl bg-white/90 dark:bg-slate-800/90 border border-[#75D2EE]/50 text-[#17364A] dark:text-white font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-[#167AA0]/40"
                />
              </div>
              <p className="text-[11px] text-[#526D7D] dark:text-slate-400 mt-1">
                Markup percentage added to provider wholesale rates across synchronized services.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#17364A] dark:text-white mb-1.5">
                Minimum Guaranteed Order Margin (USD)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={minMargin}
                  onChange={(e) => setMinMargin(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-2xl bg-white/90 dark:bg-slate-800/90 border border-[#75D2EE]/50 text-[#17364A] dark:text-white font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-[#167AA0]/40"
                />
              </div>
              <p className="text-[11px] text-[#526D7D] dark:text-slate-400 mt-1">
                Ensures low-cost orders always retain a minimum gross margin (e.g. $0.05).
              </p>
            </div>
          </div>
        </div>

        {/* Enable / Disable Module Toggle */}
        <div className="pt-6 border-t border-[#75D2EE]/25 flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-[#17364A] dark:text-white">
              Enable Social Marketing for Workspace Users
            </h4>
            <p className="text-[11px] text-[#526D7D] dark:text-slate-400">
              When disabled, regular workspace members cannot submit new orders.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsEnabled(!isEnabled)}
            className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
              isEnabled ? 'bg-[#167AA0]' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                isEnabled ? 'left-5.5' : 'left-0.5'
              }`}
            />
          </button>
        </div>

        {/* Save Button */}
        <div className="pt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={handleSyncServices}
            disabled={syncingCatalog}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 hover:bg-white text-[#17364A] dark:text-white text-xs font-bold border border-[#75D2EE]/40 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncingCatalog ? 'animate-spin' : ''}`} />
            <span>{syncingCatalog ? 'Syncing Catalog...' : 'Synchronize Services'}</span>
          </button>

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-2xl bg-[#167AA0] hover:bg-[#0E526E] text-white text-xs font-bold shadow-md shadow-[#167AA0]/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
}
