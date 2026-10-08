'use client';

import React, { useState } from 'react';
import { Activity, ActivityType } from '@/lib/types/crm';
import { createActivity } from '@/lib/actions/activities';
import {
  FileText,
  Phone,
  Calendar,
  Mail,
  GitCommit,
  TrendingUp,
  Send,
  Loader2,
  Clock,
} from 'lucide-react';

interface ActivityTimelineProps {
  workspaceId: string;
  activities: Activity[];
  contactId?: string;
  companyId?: string;
  dealId?: string;
  onActivityCreated?: (activity: Activity) => void;
}

export function ActivityTimeline({
  workspaceId,
  activities: initialActivities,
  contactId,
  companyId,
  dealId,
  onActivityCreated,
}: ActivityTimelineProps) {
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [activeType, setActiveType] = useState<ActivityType>('note');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await createActivity(workspaceId, {
        type: activeType,
        title: title.trim(),
        description: description.trim() || undefined,
        contact_id: contactId,
        company_id: companyId,
        deal_id: dealId,
      });

      if (!res.success || !res.activity) {
        setError(res.error || 'Failed to log activity');
        setLoading(false);
        return;
      }

      setActivities([res.activity, ...activities]);
      setTitle('');
      setDescription('');
      if (onActivityCreated) onActivityCreated(res.activity);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case 'note':
        return <FileText className="w-4 h-4 text-amber-500" />;
      case 'call':
        return <Phone className="w-4 h-4 text-blue-500" />;
      case 'meeting':
        return <Calendar className="w-4 h-4 text-purple-500" />;
      case 'email':
        return <Mail className="w-4 h-4 text-emerald-500" />;
      case 'stage_change':
        return <TrendingUp className="w-4 h-4 text-indigo-500" />;
      case 'deal_created':
        return <GitCommit className="w-4 h-4 text-teal-500" />;
      default:
        return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Log Form */}
      <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <div className="flex items-center gap-1 pb-3 mb-3 border-b border-slate-100 dark:border-slate-800 overflow-x-auto">
          {[
            { type: 'note' as ActivityType, label: 'Note', icon: FileText },
            { type: 'call' as ActivityType, label: 'Call', icon: Phone },
            { type: 'meeting' as ActivityType, label: 'Meeting', icon: Calendar },
            { type: 'email' as ActivityType, label: 'Email', icon: Mail },
          ].map((item) => (
            <button
              key={item.type}
              type="button"
              onClick={() => setActiveType(item.type)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeType === item.type
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <item.icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="text-xs text-rose-600 dark:text-rose-400">{error}</div>
          )}

          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`Log a ${activeType}... (e.g. Discussed Q4 budget expansion)`}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />

          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Additional details, action items, or meeting notes..."
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none"
          />

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>Log {activeType}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Activity Timeline List */}
      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
        {activities.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No activity logged yet. Add your first note or call above.
          </div>
        ) : (
          activities.map((act) => (
            <div key={act.id} className="relative group">
              {/* Icon Marker */}
              <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 flex items-center justify-center">
                {getActivityIcon(act.type)}
              </div>

              {/* Card */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-2xs">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white capitalize">
                    {act.title}
                  </h4>
                  <time className="text-[10px] text-slate-400 shrink-0">
                    {new Date(act.created_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </time>
                </div>
                {act.description && (
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {act.description}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
