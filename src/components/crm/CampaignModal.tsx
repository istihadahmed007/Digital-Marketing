'use client';

import React, { useState, useEffect } from 'react';
import { EmailCampaign, LifecycleStage, LeadStatus } from '@/lib/types/crm';
import { createCampaign, updateCampaign } from '@/lib/actions/campaigns';
import {
  X,
  Mail,
  AlertCircle,
  Loader2,
  Send,
  Layers,
  Sparkles,
  CheckCircle,
} from 'lucide-react';

interface CampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  campaignToEdit?: EmailCampaign | null;
  onSuccess: () => void;
}

export function CampaignModal({
  isOpen,
  onClose,
  workspaceId,
  campaignToEdit,
  onSuccess,
}: CampaignModalProps) {
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailTemplates = [
    {
      name: 'Product Launch & Update',
      subject: '🚀 Introducing our newest platform capabilities',
      preview: 'Check out the new features designed to streamline your operations.',
      content: `<h2>Exciting Updates from Our Team</h2>
<p>Hello {{contact.first_name}},</p>
<p>We are thrilled to announce a major expansion of our digital marketing operations platform.</p>
<p>Key highlights include:</p>
<ul>
  <li>Automated lead ingestion and CRM sync</li>
  <li>Customizable delivery pipelines and tracking</li>
  <li>AI-assisted outreach summaries</li>
</ul>
<p>We would love to know what you think!</p>
<p>Best regards,<br>The Growth Team</p>`,
    },
    {
      name: 'Quarterly Re-engagement',
      subject: 'Checking in on your marketing goals this quarter',
      preview: 'A quick look at how other teams are boosting conversion rates.',
      content: `<p>Hi {{contact.first_name}},</p>
<p>We noticed you haven't checked out our latest benchmarks report yet. Teams in your sector are seeing a 35% increase in pipeline velocity by standardizing their lead workflows.</p>
<p>Would you like to schedule a 15-minute sync this week to explore how this applies to your team?</p>
<p>Best,<br>NexusMark Advisory</p>`,
    },
  ];

  useEffect(() => {
    if (campaignToEdit) {
      setName(campaignToEdit.name);
      setSubject(campaignToEdit.subject);
      setPreviewText(campaignToEdit.preview_text || '');
      setContentHtml(campaignToEdit.content_html || '');
      setScheduledFor(campaignToEdit.scheduled_for ? campaignToEdit.scheduled_for.slice(0, 16) : '');
    } else {
      setName('');
      setSubject('Quarterly Platform Briefing');
      setPreviewText('Discover the latest strategies for accelerating your customer pipeline.');
      setContentHtml(emailTemplates[0].content);
      setScheduledFor('');
    }
    setError(null);
  }, [campaignToEdit, isOpen]);

  const handleApplyTemplate = (tpl: typeof emailTemplates[0]) => {
    setSubject(tpl.subject);
    setPreviewText(tpl.preview);
    setContentHtml(tpl.content);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Campaign internal name is required.');
      return;
    }
    if (!subject.trim()) {
      setError('Email subject line is required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (campaignToEdit) {
        const res = await updateCampaign(workspaceId, campaignToEdit.id, {
          name,
          subject,
          preview_text: previewText || null,
          content_html: contentHtml,
          scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null,
        });

        if (!res.success) {
          setError(res.error || 'Failed to update campaign');
          setLoading(false);
          return;
        }
      } else {
        const res = await createCampaign(workspaceId, {
          name,
          subject,
          preview_text: previewText || undefined,
          content_html: contentHtml,
          scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null,
          target_audience: {
            lifecycle_stage: stageFilter,
            lead_status: statusFilter,
            tag: tagFilter || undefined,
          },
        });

        if (!res.success) {
          setError(res.error || 'Failed to create campaign');
          setLoading(false);
          return;
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {campaignToEdit ? 'Edit Campaign' : 'Create Email Campaign'}
              </h2>
              <p className="text-xs text-slate-500">
                Craft targeted email broadcasts to segmented contacts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Campaign Info */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Internal Campaign Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Q4 Growth Webinar Announcement"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Subject Line *
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Elevate your revenue velocity this quarter"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Preview Preheader Text
              </label>
              <input
                type="text"
                value={previewText}
                onChange={(e) => setPreviewText(e.target.value)}
                placeholder="A sneak peek at the new features..."
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Quick Starter Templates */}
          <div className="pt-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Preset Content Templates
            </span>
            <div className="flex flex-wrap gap-2">
              {emailTemplates.map((tpl) => (
                <button
                  key={tpl.name}
                  type="button"
                  onClick={() => handleApplyTemplate(tpl)}
                  className="px-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                  {tpl.name}
                </button>
              ))}
            </div>
          </div>

          {/* Email Content HTML */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Email HTML / Body
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                Supports {'{{contact.first_name}}'} variables
              </span>
            </div>
            <textarea
              rows={8}
              value={contentHtml}
              onChange={(e) => setContentHtml(e.target.value)}
              className="w-full font-mono text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Audience Segmentation */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-purple-500" />
              Recipient Segmentation
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                  Lifecycle Stage
                </label>
                <select
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md"
                >
                  <option value="all">All Lifecycle Stages</option>
                  <option value="lead">Lead</option>
                  <option value="mql">Marketing Qualified (MQL)</option>
                  <option value="sql">Sales Qualified (SQL)</option>
                  <option value="opportunity">Opportunity</option>
                  <option value="customer">Customer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                  Lead Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md"
                >
                  <option value="all">All Lead Statuses</option>
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="customer">Customer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                  Required Tag
                </label>
                <input
                  type="text"
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                  placeholder="e.g. newsletter"
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md"
                />
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Optional Schedule Time (Leave blank to save as Draft)
            </label>
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-sm transition flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {campaignToEdit ? 'Save Changes' : 'Save Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
