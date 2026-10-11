'use client';

import React, { useState, useEffect } from 'react';
import { Integration, IntegrationProvider } from '@/lib/types/crm';
import {
  getIntegrations,
  saveIntegration,
  syncMautic,
  testWebhook,
} from '@/lib/actions/integrations';
import {
  Plug,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Loader2,
  Globe,
  Settings,
  Send,
  Sliders,
  ExternalLink,
  MessageSquare,
  Mail,
  X,
  Check,
} from 'lucide-react';

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [workspaceId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('nexusmark_active_workspace') || 'ws-default'
      );
    }
    return 'ws-default';
  });
  const [loading, setLoading] = useState(true);

  // Modal configuration
  const [selectedProvider, setSelectedProvider] = useState<IntegrationProvider | null>(null);
  const [configForm, setConfigForm] = useState<Record<string, any>>({});
  const [isEnabledForm, setIsEnabledForm] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  // Sync / Test feedback
  const [mauticSyncing, setMauticSyncing] = useState(false);
  const [webhookTesting, setWebhookTesting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const fetchIntegrationsData = async (wsId: string) => {
    setLoading(true);
    try {
      const data = await getIntegrations(wsId);
      setIntegrations(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrationsData(workspaceId);
  }, [workspaceId]);

  const providerCatalog: Array<{
    id: IntegrationProvider;
    name: string;
    description: string;
    category: string;
    icon: any;
    fields: Array<{ key: string; label: string; placeholder: string; type?: string }>;
  }> = [
    {
      id: 'mautic',
      name: 'Mautic Marketing Automation',
      description: 'Bi-directional contact & segment sync with self-hosted or cloud Mautic instances.',
      category: 'Marketing Automation',
      icon: Plug,
      fields: [
        { key: 'baseUrl', label: 'Mautic Instance URL', placeholder: 'https://mautic.yourcompany.com' },
        { key: 'publicKey', label: 'Public Key / Client ID', placeholder: 'mautic_client_id_here' },
        { key: 'secretKey', label: 'Secret Key / Token', placeholder: 'mautic_secret_token_here', type: 'password' },
      ],
    },
    {
      id: 'webhook',
      name: 'Custom Inbound & Outbound Webhooks',
      description: 'Stream CRM lead events to your custom endpoints or consume inbound payload hooks.',
      category: 'Developer Webhooks',
      icon: Globe,
      fields: [
        { key: 'endpointUrl', label: 'Destination Webhook URL', placeholder: 'https://api.yourcompany.com/nexusmark-webhook' },
        { key: 'signingSecret', label: 'Payload Signing Secret (HMAC)', placeholder: 'whsec_...' },
      ],
    },
    {
      id: 'resend',
      name: 'Resend Email API',
      description: 'High-deliverability transactional and marketing email delivery infrastructure.',
      category: 'Email Delivery',
      icon: Mail,
      fields: [
        { key: 'apiKey', label: 'Resend API Key', placeholder: 're_123456789...', type: 'password' },
        { key: 'fromEmail', label: 'Default From Email Address', placeholder: 'updates@yourcompany.com' },
      ],
    },
    {
      id: 'slack',
      name: 'Slack Deal Alerts',
      description: 'Get instant notifications in team Slack channels when deals close or high-value leads submit forms.',
      category: 'Team Collaboration',
      icon: MessageSquare,
      fields: [
        { key: 'webhookUrl', label: 'Incoming Slack Webhook URL', placeholder: 'https://hooks.slack.com/services/...' },
        { key: 'channelName', label: 'Channel Name', placeholder: '#growth-wins' },
      ],
    },
  ];

  const handleOpenConfig = (providerId: IntegrationProvider) => {
    const existing = integrations.find((i) => i.provider === providerId);
    setSelectedProvider(providerId);
    setConfigForm(existing?.config || {});
    setIsEnabledForm(existing?.is_enabled ?? false);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvider) return;

    setSavingConfig(true);
    const providerMeta = providerCatalog.find((p) => p.id === selectedProvider);

    try {
      const res = await saveIntegration(
        workspaceId,
        selectedProvider,
        providerMeta?.name || selectedProvider,
        configForm,
        isEnabledForm
      );

      if (res.success) {
        await fetchIntegrationsData(workspaceId);
        setSelectedProvider(null);
        setFeedbackMessage(`Integration settings for ${providerMeta?.name} saved successfully.`);
      } else {
        alert(res.error || 'Failed to save configuration');
      }
    } catch (err: any) {
      alert(err.message || 'Error saving configuration');
    } finally {
      setSavingConfig(false);
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };

  const handleMauticSync = async () => {
    setMauticSyncing(true);
    try {
      const res = await syncMautic(workspaceId);
      if (res.success) {
        setFeedbackMessage(res.message || 'Mautic sync complete.');
        await fetchIntegrationsData(workspaceId);
      } else {
        alert(res.error || 'Mautic sync failed. Make sure the integration is enabled.');
      }
    } catch (err: any) {
      alert(err.message || 'Error during sync');
    } finally {
      setMauticSyncing(false);
      setTimeout(() => setFeedbackMessage(null), 5000);
    }
  };

  const handleWebhookTest = async (endpointUrl: string) => {
    if (!endpointUrl) {
      alert('Please configure a valid webhook endpoint URL first.');
    } else {
      setWebhookTesting(true);
      try {
        const res = await testWebhook(workspaceId, endpointUrl);
        if (res.success) {
          setFeedbackMessage(res.message || 'Webhook ping dispatched successfully.');
        } else {
          alert(res.error || 'Failed to ping webhook.');
        }
      } catch (err: any) {
        alert(err.message || 'Error testing webhook');
      } finally {
        setWebhookTesting(false);
        setTimeout(() => setFeedbackMessage(null), 5000);
      }
    }
  };

  const activeProvider = providerCatalog.find((p) => p.id === selectedProvider);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-[#75D2EE]/15 text-[#167AA0] dark:text-[#75D2EE] border border-[#75D2EE]/30">
              Active Bridges
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-[#17364A] dark:text-white">
              Integrations & Marketing Bridges
            </h1>
          </div>
          <p className="text-sm text-[#526D7D] dark:text-slate-300 mt-1">
            Connect NexusMark CRM with marketing automation tools (Mautic), email delivery APIs (Resend), team chat, and custom webhooks.
          </p>
        </div>

        <button
          onClick={() => fetchIntegrationsData(workspaceId)}
          className="p-2.5 text-[#526D7D] hover:text-[#167AA0] dark:text-slate-300 dark:hover:text-white rounded-xl glass-panel hover:border-[#75D2EE]/50 transition-all cursor-pointer"
          title="Refresh Integrations"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {feedbackMessage && (
        <div className="p-4 bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/30 rounded-2xl flex items-center gap-2 text-sm text-emerald-800 dark:text-emerald-300 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Catalog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {providerCatalog.map((item) => {
          const configEntry = integrations.find((i) => i.provider === item.id);
          const isEnabled = configEntry?.is_enabled || false;
          const Icon = item.icon;

          return (
            <div
              key={item.id}
              className="glass-panel preview-tile-3d rounded-2xl p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-[#75D2EE]/15 text-[#167AA0] dark:text-[#75D2EE] border border-[#75D2EE]/25">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#17364A] dark:text-white">
                        {item.name}
                      </h3>
                      <span className="text-xs text-[#526D7D] dark:text-slate-400 font-medium">{item.category}</span>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
                      isEnabled
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                        : 'bg-[#D7F1FA]/40 text-[#526D7D] border-[#75D2EE]/20 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                    }`}
                  >
                    {isEnabled ? 'Connected' : 'Not Configured'}
                  </span>
                </div>

                <p className="text-xs text-[#526D7D] dark:text-slate-300 leading-relaxed">
                  {item.description}
                </p>

                {item.id === 'mautic' && configEntry?.last_synced_at && (
                  <div className="mt-3 text-[11px] text-[#526D7D] dark:text-slate-400">
                    Last synced: {new Date(configEntry.last_synced_at).toLocaleString()}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-6 pt-4 border-t border-[#75D2EE]/20 dark:border-slate-800 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenConfig(item.id)}
                  className="px-3.5 py-2 bg-[#D7F1FA]/50 hover:bg-[#D7F1FA] text-[#167AA0] dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:text-[#75D2EE] border border-[#75D2EE]/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Configure
                </button>

                {item.id === 'mautic' && (
                  <button
                    type="button"
                    onClick={handleMauticSync}
                    disabled={mauticSyncing}
                    className="px-3.5 py-2 bg-[#167AA0] hover:bg-[#0E526E] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-60 cursor-pointer"
                  >
                    {mauticSyncing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    Sync Contacts
                  </button>
                )}

                {item.id === 'webhook' && (
                  <button
                    type="button"
                    onClick={() => handleWebhookTest(configEntry?.config?.endpointUrl)}
                    disabled={webhookTesting}
                    className="px-3.5 py-2 bg-[#167AA0] hover:bg-[#0E526E] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-60 cursor-pointer"
                  >
                    {webhookTesting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    Ping Test
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Configuration Modal */}
      {selectedProvider && activeProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-panel-opaque rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden border border-[#75D2EE]/40">
            <div className="px-6 py-4 border-b border-[#75D2EE]/20 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#17364A] dark:text-white">
                  Configure {activeProvider.name}
                </h2>
                <p className="text-xs text-[#526D7D] dark:text-slate-400">Enter API credentials and parameters</p>
              </div>
              <button
                onClick={() => setSelectedProvider(null)}
                className="p-1.5 rounded-lg text-[#526D7D] hover:text-[#17364A] dark:text-slate-400 dark:hover:text-white hover:bg-[#D7F1FA]/40 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="p-6 space-y-4">
              {activeProvider.fields.map((f) => (
                <div key={f.key}>
                  <label className="block text-xs font-semibold text-[#17364A] dark:text-slate-300 mb-1">
                    {f.label}
                  </label>
                  <input
                    type={f.type || 'text'}
                    value={configForm[f.key] || ''}
                    onChange={(e) =>
                      setConfigForm((prev) => ({ ...prev, [f.key]: e.target.value }))
                    }
                    placeholder={f.placeholder}
                    className="w-full px-3 py-2 text-xs bg-white/80 dark:bg-slate-800/80 border border-[#75D2EE]/30 dark:border-slate-700 rounded-xl text-[#17364A] dark:text-slate-100 font-mono focus:outline-hidden focus:ring-2 focus:ring-[#167AA0]"
                  />
                </div>
              ))}

              <div className="flex items-center justify-between p-3 bg-[#D7F1FA]/30 dark:bg-slate-800/40 rounded-xl border border-[#75D2EE]/20 pt-3">
                <div>
                  <span className="text-xs font-semibold text-[#17364A] dark:text-white">
                    Enable Integration
                  </span>
                  <p className="text-[11px] text-[#526D7D] dark:text-slate-400">
                    Activate bi-directional synchronization or live webhooks
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={isEnabledForm}
                  onChange={(e) => setIsEnabledForm(e.target.checked)}
                  className="w-4 h-4 rounded text-[#167AA0] focus:ring-[#167AA0] cursor-pointer"
                />
              </div>

              <div className="pt-4 border-t border-[#75D2EE]/20 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedProvider(null)}
                  className="px-4 py-2 text-xs font-semibold text-[#526D7D] dark:text-slate-400 hover:bg-[#D7F1FA]/40 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#167AA0] hover:bg-[#0E526E] rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {savingConfig && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
