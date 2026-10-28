'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Calendar as CalendarIcon,
  Plus,
  Share2,
  Video,
  FileText,
  Mail,
  Sparkles,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Filter,
  Layers,
  ArrowRight,
  Eye,
} from 'lucide-react';
import {
  SocialPost,
  PlatformType,
  PublishingStatus,
  ApprovalStatus,
} from '@/lib/types/content-studio';
import {
  getSocialPosts,
  updatePostApproval,
  schedulePost,
  publishPostNow,
  duplicatePost,
  deletePost,
} from '@/lib/actions/content-studio';

interface Props {
  initialPosts: SocialPost[];
  workspaceId: string;
}

export function MarketingCalendarClient({ initialPosts, workspaceId }: Props) {
  const [posts, setPosts] = useState<SocialPost[]>(initialPosts);
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // Selected post drawer/modal
  const [selectedPost, setSelectedPost] = useState<SocialPost | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [publishFeedback, setPublishFeedback] = useState<string | null>(null);
  const [manualFallbackInstructions, setManualFallbackInstructions] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Month navigation
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleApprove = async (postId: string, newApproval: ApprovalStatus) => {
    setActionLoading(true);
    try {
      const res = await updatePostApproval(workspaceId, postId, newApproval);
      if (res.success) {
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, approval_status: newApproval } : p))
        );
        if (selectedPost && selectedPost.id === postId) {
          setSelectedPost({ ...selectedPost, approval_status: newApproval });
        }
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handlePublishNow = async (postId: string) => {
    setActionLoading(true);
    setPublishFeedback(null);
    setManualFallbackInstructions(null);
    try {
      const res = await publishPostNow(workspaceId, postId);
      if (res.isManualFallback) {
        setManualFallbackInstructions(res.instructions || 'Manual publishing fallback activated.');
      } else if (res.success) {
        setPublishFeedback(`Successfully published! URL: ${res.publishedUrl || 'N/A'}`);
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, publishing_status: 'published', published_url: res.publishedUrl }
              : p
          )
        );
        if (selectedPost && selectedPost.id === postId) {
          setSelectedPost({
            ...selectedPost,
            publishing_status: 'published',
            published_url: res.publishedUrl,
          });
        }
      } else {
        alert(res.error || 'Publishing error');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleDuplicate = async (postId: string) => {
    setActionLoading(true);
    try {
      const res = await duplicatePost(workspaceId, postId);
      if (res.success && res.newPost) {
        setPosts((prev) => [res.newPost!, ...prev]);
        setSelectedPost(res.newPost!);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this scheduled post?')) return;
    setActionLoading(true);
    try {
      const res = await deletePost(workspaceId, postId);
      if (res.success) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
        setSelectedPost(null);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Filter posts
  const filteredPosts = posts.filter((p) => {
    if (platformFilter !== 'all' && p.platform !== platformFilter) return false;
    if (statusFilter !== 'all' && p.publishing_status !== statusFilter) return false;
    return true;
  });

  // Calendar day calculation
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  const getPostsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return filteredPosts.filter((p) => {
      if (!p.scheduled_at) return false;
      return p.scheduled_at.startsWith(dateStr);
    });
  };

  const platformBadgeColor: Record<string, string> = {
    facebook: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200',
    instagram: 'bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-400 border-pink-200',
    youtube_shorts: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200',
    tiktok: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border-purple-200',
    blog: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200',
    email: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200',
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#75D2EE]/25">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-[#D7F1FA] text-[#167AA0] dark:bg-[#167AA0]/30 dark:text-[#75D2EE] border border-[#75D2EE]/40 flex items-center gap-1">
              <CalendarIcon className="w-3.5 h-3.5" />
              Content Schedule
            </span>
            <h1 className="text-2xl font-black tracking-tight text-[#17364A] dark:text-white">
              Marketing Calendar &amp; Publishing
            </h1>
          </div>
          <p className="text-xs text-[#526D7D] dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Multi-platform scheduling canvas with approval workflows, idempotent publish triggers, and official API fallbacks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View switcher */}
          <div className="inline-flex p-1 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-[#75D2EE]/30 shadow-xs">
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                viewMode === 'calendar'
                  ? 'bg-[#167AA0] text-white shadow-2xs'
                  : 'text-[#526D7D] hover:text-[#17364A]'
              }`}
            >
              Calendar View
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-[#167AA0] text-white shadow-2xs'
                  : 'text-[#526D7D] hover:text-[#17364A]'
              }`}
            >
              List View
            </button>
          </div>

          <Link
            href="/ai-studio"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-[#167AA0] hover:bg-[#0E526E] text-white transition shadow-xs glass-button-press"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Draft New Post</span>
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 glass-panel rounded-2xl border border-[#75D2EE]/40 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
        {/* Month Navigator */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-xl bg-white/80 dark:bg-slate-800 border border-[#75D2EE]/30 text-[#17364A] dark:text-white hover:bg-[#D7F1FA]/30 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-bold text-sm text-[#17364A] dark:text-white px-2">
            {monthName} {year}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-xl bg-white/80 dark:bg-slate-800 border border-[#75D2EE]/30 text-[#17364A] dark:text-white hover:bg-[#D7F1FA]/30 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-[#526D7D]" />
            <span className="font-semibold text-[#17364A] dark:text-slate-300">Platform:</span>
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="px-2.5 py-1 bg-white/70 dark:bg-slate-800 border border-[#75D2EE]/30 rounded-lg text-[#17364A] dark:text-slate-300 focus:outline-hidden"
            >
              <option value="all">All Channels</option>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
              <option value="youtube_shorts">YouTube Shorts</option>
              <option value="tiktok">TikTok</option>
              <option value="blog">Blog</option>
              <option value="email">Email</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-[#17364A] dark:text-slate-300">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1 bg-white/70 dark:bg-slate-800 border border-[#75D2EE]/30 rounded-lg text-[#17364A] dark:text-slate-300 focus:outline-hidden"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="published">Published</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Calendar Grid View */}
      {viewMode === 'calendar' ? (
        <div className="glass-panel rounded-2xl border border-[#75D2EE]/45 shadow-xs overflow-hidden">
          {/* Days of week header */}
          <div className="grid grid-cols-7 bg-[#D7F1FA]/30 dark:bg-[#17364A]/30 border-b border-[#75D2EE]/25 text-center text-xs font-bold text-[#17364A] dark:text-slate-300 py-2.5">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>

          {/* Calendar Day Cells */}
          <div className="grid grid-cols-7 divide-x divide-y divide-[#75D2EE]/15">
            {/* Empty offset days */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[110px] bg-slate-50/40 dark:bg-slate-900/30 p-2" />
            ))}

            {/* Days in Month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayPosts = getPostsForDay(day);
              const isToday =
                new Date().getDate() === day &&
                new Date().getMonth() === month &&
                new Date().getFullYear() === year;

              return (
                <div
                  key={`day-${day}`}
                  className={`min-h-[110px] p-2 transition-colors hover:bg-[#D7F1FA]/20 dark:hover:bg-[#17364A]/20 flex flex-col justify-between ${
                    isToday ? 'bg-[#D7F1FA]/35 dark:bg-sky-950/40' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                        isToday
                          ? 'bg-[#167AA0] text-white shadow-2xs'
                          : 'text-[#17364A] dark:text-slate-300'
                      }`}
                    >
                      {day}
                    </span>
                    {dayPosts.length > 0 && (
                      <span className="text-[10px] font-bold text-[#526D7D]">
                        {dayPosts.length}
                      </span>
                    )}
                  </div>

                  {/* Post Badges */}
                  <div className="space-y-1 overflow-y-auto max-h-[85px] pr-0.5">
                    {dayPosts.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPost(p)}
                        className={`p-1.5 rounded-lg border text-[11px] font-bold truncate cursor-pointer transition shadow-2xs ${
                          platformBadgeColor[p.platform] || 'bg-slate-100 text-slate-700'
                        }`}
                        title={p.title}
                      >
                        <span className="block truncate">{p.title}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-1" />
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* List / Table View */
        <div className="glass-panel-opaque rounded-2xl overflow-hidden shadow-xs border border-[#75D2EE]/30">
          {filteredPosts.length === 0 ? (
            <div className="p-16 text-center text-[#526D7D] space-y-2">
              <CalendarIcon className="w-10 h-10 mx-auto text-[#75D2EE]" />
              <p className="text-sm font-bold text-[#17364A] dark:text-white">No posts scheduled</p>
              <p className="text-xs">Draft and schedule your first multi-platform post from the AI Content Studio.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#D7F1FA]/40 dark:bg-[#17364A]/40 border-b border-[#75D2EE]/30 font-bold text-[#17364A] dark:text-slate-300">
                  <tr>
                    <th className="p-3.5">Post Title</th>
                    <th className="p-3.5">Platform</th>
                    <th className="p-3.5">Scheduled Date</th>
                    <th className="p-3.5">Approval</th>
                    <th className="p-3.5">Publish Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#75D2EE]/15 text-[#17364A] dark:text-slate-300">
                  {filteredPosts.map((post) => (
                    <tr
                      key={post.id}
                      onClick={() => setSelectedPost(post)}
                      className="hover:bg-[#D7F1FA]/20 dark:hover:bg-[#17364A]/30 cursor-pointer transition"
                    >
                      <td className="p-3.5 font-bold text-[#17364A] dark:text-white max-w-xs truncate">
                        {post.title}
                      </td>
                      <td className="p-3.5 font-bold uppercase tracking-wider text-[11px] text-[#167AA0] dark:text-[#75D2EE]">
                        {post.platform.replace('_', ' ')}
                      </td>
                      <td className="p-3.5 font-mono text-[#526D7D]">
                        {post.scheduled_at ? new Date(post.scheduled_at).toLocaleString() : 'Unscheduled'}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                            post.approval_status === 'approved'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : post.approval_status === 'rejected'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : post.approval_status === 'pending_approval'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {post.approval_status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                            post.publishing_status === 'published'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : post.publishing_status === 'scheduled'
                              ? 'bg-[#D7F1FA] text-[#167AA0] border border-[#75D2EE]/40'
                              : post.publishing_status === 'failed'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {post.publishing_status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPost(post);
                          }}
                          className="px-2.5 py-1 bg-white/80 dark:bg-slate-800 hover:bg-[#D7F1FA]/40 border border-[#75D2EE]/30 rounded-lg text-xs font-semibold transition cursor-pointer"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Post Detail Drawer / Modal */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-end animate-in fade-in duration-140">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setSelectedPost(null)}
          />

          <div className="relative w-full max-w-lg bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl h-full shadow-2xl p-6 z-10 overflow-y-auto flex flex-col justify-between space-y-6">
            <div className="space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#75D2EE]/25">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#D7F1FA] text-[#167AA0] dark:bg-[#167AA0]/30 dark:text-[#75D2EE]">
                    {selectedPost.platform.replace('_', ' ')}
                  </span>
                  <h3 className="text-base font-bold text-[#17364A] dark:text-white mt-1.5">
                    {selectedPost.title}
                  </h3>
                </div>

                <button
                  onClick={() => setSelectedPost(null)}
                  className="p-1.5 rounded-xl text-[#526D7D] hover:text-[#17364A] hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Status Badges */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-800 border border-[#75D2EE]/30">
                  <span className="text-[10px] font-bold text-[#526D7D] uppercase">Approval Status</span>
                  <p className="font-bold text-[#17364A] dark:text-white mt-0.5 capitalize">
                    {selectedPost.approval_status.replace('_', ' ')}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-800 border border-[#75D2EE]/30">
                  <span className="text-[10px] font-bold text-[#526D7D] uppercase">Publishing Status</span>
                  <p className="font-bold text-[#167AA0] dark:text-[#75D2EE] mt-0.5 capitalize">
                    {selectedPost.publishing_status}
                  </p>
                </div>
              </div>

              {/* Scheduled Date */}
              {selectedPost.scheduled_at && (
                <div className="p-3 bg-white/70 dark:bg-slate-800 rounded-xl border border-[#75D2EE]/30 text-xs flex items-center justify-between">
                  <span className="text-[#526D7D] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#167AA0]" /> Scheduled For:
                  </span>
                  <span className="font-mono font-bold text-[#17364A] dark:text-white">
                    {new Date(selectedPost.scheduled_at).toLocaleString()} ({selectedPost.timezone})
                  </span>
                </div>
              )}

              {/* Content Box */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-[#526D7D] uppercase tracking-wider">
                    Post Content
                  </label>
                  <button
                    onClick={() => handleCopy(selectedPost.content, 'modal-content')}
                    className="text-[11px] text-[#167AA0] font-bold hover:underline"
                  >
                    {copiedKey === 'modal-content' ? 'Copied!' : 'Copy Text'}
                  </button>
                </div>
                <div className="p-3 bg-white/70 dark:bg-slate-800 rounded-xl border border-[#75D2EE]/30 text-xs text-[#17364A] dark:text-slate-200 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                  {selectedPost.content}
                </div>
              </div>

              {/* Bangla Translation */}
              {selectedPost.content_bn && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-[#167AA0] uppercase tracking-wider">
                      বাংলা ভার্সন (Bangla Version)
                    </label>
                    <button
                      onClick={() => handleCopy(selectedPost.content_bn || '', 'modal-bn')}
                      className="text-[11px] text-[#167AA0] font-bold hover:underline"
                    >
                      {copiedKey === 'modal-bn' ? 'Copied!' : 'কপি করুন'}
                    </button>
                  </div>
                  <div className="p-3 bg-white/70 dark:bg-slate-800 rounded-xl border border-[#75D2EE]/30 text-xs text-[#17364A] dark:text-slate-200 whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                    {selectedPost.content_bn}
                  </div>
                </div>
              )}

              {/* Hashtags */}
              {selectedPost.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedPost.hashtags.map((h, i) => (
                    <span
                      key={i}
                      className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#D7F1FA] text-[#167AA0]"
                    >
                      {h}
                    </span>
                  ))}
                </div>
              )}

              {/* Feedback Alert */}
              {publishFeedback && (
                <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{publishFeedback}</span>
                </div>
              )}

              {/* Manual Fallback Checklist Alert */}
              {manualFallbackInstructions && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200 rounded-xl text-xs space-y-2">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Official OAuth Unconnected — Manual Publishing Required</span>
                  </div>
                  <pre className="whitespace-pre-wrap font-sans text-[11px] leading-relaxed">
                    {manualFallbackInstructions}
                  </pre>
                  <button
                    onClick={() => handleCopy(`${selectedPost.content}\n\n${selectedPost.hashtags.join(' ')}`, 'fallback-all')}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs"
                  >
                    {copiedKey === 'fallback-all' ? 'Copied to Clipboard!' : 'Copy Caption & Hashtags'}
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-[#75D2EE]/25 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {selectedPost.approval_status !== 'approved' && (
                    <button
                      onClick={() => handleApprove(selectedPost.id, 'approved')}
                      disabled={actionLoading}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                    >
                      Approve Post
                    </button>
                  )}

                  <button
                    onClick={() => handlePublishNow(selectedPost.id)}
                    disabled={actionLoading}
                    className="px-3 py-1.5 rounded-xl bg-[#167AA0] hover:bg-[#0E526E] text-white text-xs font-bold cursor-pointer glass-button-press"
                  >
                    Publish Now
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDuplicate(selectedPost.id)}
                    disabled={actionLoading}
                    className="p-2 rounded-xl bg-white/80 dark:bg-slate-800 border border-[#75D2EE]/30 text-[#526D7D] hover:text-[#17364A] cursor-pointer"
                    title="Duplicate post"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(selectedPost.id)}
                    disabled={actionLoading}
                    className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 cursor-pointer"
                    title="Delete post"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
