'use client';

import React, { useState, useEffect } from 'react';
import { EmailCampaign } from '@/lib/types/crm';
import {
  getCampaigns,
  deleteCampaign,
  sendCampaign,
} from '@/lib/actions/campaigns';
import { CampaignModal } from '@/components/crm/CampaignModal';
import { EmptyState } from '@/components/crm/EmptyState';
import {
  Mail,
  Plus,
  Send,
  Trash2,
  Edit2,
  CheckCircle2,
  Clock,
  BarChart2,
  RefreshCw,
  Loader2,
  Eye,
  MousePointerClick,
  UserX,
  Layers,
} from 'lucide-react';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [workspaceId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('nexusmark_active_workspace') || 'ws-default'
      );
    }
    return 'ws-default';
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'sent' | 'draft' | 'scheduled'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<EmailCampaign | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sendFeedback, setSendFeedback] = useState<string | null>(null);

  const fetchCampaigns = async (wsId: string) => {
    setLoading(true);
    try {
      const data = await getCampaigns(wsId);
      setCampaigns(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns(workspaceId);
  }, [workspaceId]);

  const handleSendNow = async (campaign: EmailCampaign) => {
    if (!confirm(`Are you sure you want to dispatch broadcast "${campaign.name}"?`)) {
      return;
    }
    setSendingId(campaign.id);
    setSendFeedback(null);
    try {
      const res = await sendCampaign(workspaceId, campaign.id);
      if (res.success && res.stats) {
        setSendFeedback(
          `Dispatched! Sent to ${res.stats.recipients} contacts (${res.stats.delivered} delivered).`
        );
        await fetchCampaigns(workspaceId);
      } else {
        alert(res.error || 'Failed to dispatch broadcast');
      }
    } catch (err: any) {
      alert(err.message || 'Error sending campaign');
    } finally {
      setSendingId(null);
      setTimeout(() => setSendFeedback(null), 4000);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    await deleteCampaign(workspaceId, id);
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
  };

  const filteredCampaigns = campaigns.filter((c) => {
    if (filter === 'all') return true;
    return c.status === filter;
  });

  const totalDelivered = campaigns.reduce((acc, c) => acc + (c.delivered_count || 0), 0);
  const totalOpened = campaigns.reduce((acc, c) => acc + (c.opened_count || 0), 0);
  const totalClicked = campaigns.reduce((acc, c) => acc + (c.clicked_count || 0), 0);
  const avgOpenRate = totalDelivered > 0 ? Math.round((totalOpened / totalDelivered) * 100) : 0;
  const avgClickRate = totalOpened > 0 ? Math.round((totalClicked / totalOpened) * 100) : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              Phase 2 Live
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Email Delivery Campaigns
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Design targeted broadcasts, segment contacts by lifecycle stage or tags, and track live deliverability metrics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchCampaigns(workspaceId)}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setEditingCampaign(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Create Campaign
          </button>
        </div>
      </div>

      {sendFeedback && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{sendFeedback}</span>
        </div>
      )}

      {/* Aggregate Deliverability Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Total Delivered
          </span>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {totalDelivered.toLocaleString()}
          </p>
          <span className="text-xs text-slate-500">Across all broadcasts</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Avg. Open Rate
          </span>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
            {avgOpenRate}%
          </p>
          <span className="text-xs text-slate-500">{totalOpened} total opens</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Click-To-Open
          </span>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
            {avgClickRate}%
          </p>
          <span className="text-xs text-slate-500">{totalClicked} total clicks</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Unsubscribe Rate
          </span>
          <p className="text-2xl font-black text-slate-600 dark:text-slate-400 mt-1">
            &lt; 0.8%
          </p>
          <span className="text-xs text-slate-500">CAN-SPAM compliant</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {(['all', 'sent', 'draft', 'scheduled'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition ${
              filter === tab
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {tab} ({campaigns.filter((c) => (tab === 'all' ? true : c.status === tab)).length})
          </button>
        ))}
      </div>

      {/* Campaigns Listing */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin mb-3" />
          <p className="text-sm text-slate-500">Loading campaigns...</p>
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="No campaigns found"
          description="Create your first email broadcast campaign to engage prospective customers."
          actionText="Create Campaign"
          onAction={() => {
            setEditingCampaign(null);
            setIsModalOpen(true);
          }}
        />
      ) : (
        <div className="space-y-4">
          {filteredCampaigns.map((camp) => (
            <div
              key={camp.id}
              className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-300 dark:hover:border-slate-700 transition"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border capitalize ${
                      camp.status === 'sent'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                        : camp.status === 'scheduled'
                        ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
                        : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                    }`}
                  >
                    {camp.status}
                  </span>
                  <span className="text-xs text-slate-400">
                    Created {new Date(camp.created_at).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {camp.name}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Subject: <span className="text-slate-700 dark:text-slate-300">&ldquo;{camp.subject}&rdquo;</span>
                </p>

                {camp.status === 'sent' && (
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-2">
                    <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                      <Send className="w-3.5 h-3.5 text-purple-500" />
                      {camp.delivered_count} Delivered
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5 text-emerald-500" />
                      {camp.opened_count} Opens ({camp.delivered_count > 0 ? Math.round((camp.opened_count / camp.delivered_count) * 100) : 0}%)
                    </span>
                    <span className="flex items-center gap-1">
                      <MousePointerClick className="w-3.5 h-3.5 text-indigo-500" />
                      {camp.clicked_count} Clicks
                    </span>
                    <span className="flex items-center gap-1">
                      <UserX className="w-3.5 h-3.5 text-slate-400" />
                      {camp.unsubscribed_count} Unsubscribed
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {camp.status !== 'sent' && (
                  <button
                    onClick={() => handleSendNow(camp)}
                    disabled={sendingId === camp.id}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs transition"
                  >
                    {sendingId === camp.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    Send Broadcast
                  </button>
                )}

                <button
                  onClick={() => {
                    setEditingCampaign(camp);
                    setIsModalOpen(true);
                  }}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                  title="Edit Campaign"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleDelete(camp.id)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                  title="Delete Campaign"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Campaign Creator / Editor Modal */}
      <CampaignModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCampaign(null);
        }}
        workspaceId={workspaceId}
        campaignToEdit={editingCampaign}
        onSuccess={() => fetchCampaigns(workspaceId)}
      />
    </div>
  );
}
