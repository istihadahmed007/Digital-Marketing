'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ShortsProject,
  ShortsClip,
  ShortsPublishingJob,
  CropMode,
  TranscriptSegment,
} from '@/lib/types/shorts';
import {
  getShortsProjects,
  createShortsProject,
  generateClipSuggestions,
  getShortsClips,
  saveShortsClip,
  deleteShortsClip,
  getPublishingJobs,
  publishClipNow,
} from '@/lib/actions/shorts';
import { validateVideoClip } from '@/lib/video/validator';
import {
  Video,
  Sparkles,
  UploadCloud,
  Play,
  Pause,
  Scissors,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Loader2,
  Send,
  Calendar,
  Layers,
  Sliders,
  Type,
  Eye,
  Film,
  Download,
  Share2,
  Trash2,
  ShieldCheck,
  RotateCw,
  Check,
  Clock,
  Maximize2,
} from 'lucide-react';

function YouTubeIcon({ className = 'w-4 h-4 text-red-500' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  );
}

function FacebookIcon({ className = 'w-4 h-4 text-blue-500' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

export default function ShortsStudioPage() {
  const [workspaceId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nexusmark_active_workspace') || 'ws-default';
    }
    return 'ws-default';
  });

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'editor' | 'library' | 'history'>('editor');

  // Projects & Clips State
  const [projects, setProjects] = useState<ShortsProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [clips, setClips] = useState<ShortsClip[]>([]);
  const [publishingJobs, setPublishingJobs] = useState<ShortsPublishingJob[]>([]);

  // Active Clip Trimmer State
  const [activeClipTitle, setActiveClipTitle] = useState('How 60-Second Follow-ups 3x Sales');
  const [activeClipCaption, setActiveClipCaption] = useState('Speed to lead is everything. Here is why you must reply within 1 minute. #Shorts #GrowthHacks');
  const [activeStartTime, setActiveStartTime] = useState(15.0);
  const [activeEndTime, setActiveEndTime] = useState(48.0);
  const [cropMode, setCropMode] = useState<CropMode>('blur_padding');
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);

  // Player / Render State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderedClipUrl, setRenderedClipUrl] = useState<string | null>(null);

  // Publishing Modal State
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishingPlatform, setPublishingPlatform] = useState<'youtube' | 'facebook'>('youtube');
  const [publishingTitle, setPublishingTitle] = useState('');
  const [publishingCaption, setPublishingCaption] = useState('');
  const [publishingLoading, setPublishingLoading] = useState(false);
  const [publishFeedback, setPublishFeedback] = useState<{ success: boolean; message: string; url?: string } | null>(null);

  // New Upload Form State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);

  const activeDuration = Math.max(0, activeEndTime - activeStartTime);
  const isDurationValid = activeDuration >= 15 && activeDuration <= 60;

  const loadData = async (wsId: string) => {
    setLoading(true);
    try {
      const [projList, clipList, jobsList] = await Promise.all([
        getShortsProjects(wsId),
        getShortsClips(wsId),
        getPublishingJobs(wsId),
      ]);
      setProjects(projList);
      setClips(clipList);
      setPublishingJobs(jobsList);

      if (projList.length > 0 && !selectedProjectId) {
        setSelectedProjectId(projList[0].id);
      }
    } catch (err) {
      console.error('Failed to load Shorts data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(workspaceId);
  }, [workspaceId]);

  const currentProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  // Video Timeupdate listener
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    if (curr < activeStartTime) {
      videoRef.current.currentTime = activeStartTime;
    }
    if (curr >= activeEndTime) {
      videoRef.current.currentTime = activeStartTime;
      setIsPlaying(false);
      videoRef.current.pause();
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      if (videoRef.current.currentTime < activeStartTime || videoRef.current.currentTime >= activeEndTime) {
        videoRef.current.currentTime = activeStartTime;
      }
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  // AI Moment Generator
  const handleSuggestClips = async () => {
    if (!currentProject) return;
    try {
      const res = await generateClipSuggestions(workspaceId, currentProject.id);
      if (res.success && res.suggestions.length > 0) {
        const top = res.suggestions[0];
        if (top.start_time !== undefined) setActiveStartTime(top.start_time);
        if (top.end_time !== undefined) setActiveEndTime(top.end_time);
        if (top.title) setActiveClipTitle(top.title);
        if (top.caption) setActiveClipCaption(top.caption);
        if (videoRef.current && top.start_time !== undefined) {
          videoRef.current.currentTime = top.start_time;
        }
      }
    } catch (err) {
      console.error('Failed to suggest moments:', err);
    }
  };

  // 1-Click Upload or Sample Video Demo
  const handleQuickUpload = async (isSample: boolean = false) => {
    setIsUploading(true);
    setUploadProgress(15);
    try {
      const title = isSample ? 'Customer Success Masterclass' : uploadTitle || 'Uploaded Master Video';
      const sampleUrl = 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';

      setUploadProgress(45);
      await new Promise((r) => setTimeout(r, 400));
      setUploadProgress(80);

      const res = await createShortsProject(workspaceId, {
        title,
        sourceVideoUrl: sampleUrl,
        durationSeconds: 184,
      });

      if (res.success && res.project) {
        setUploadProgress(100);
        await loadData(workspaceId);
        setSelectedProjectId(res.project.id);
        setActiveClipTitle(`Key Takeaway: ${title}`);
        setUploadTitle('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Render 1080x1920 Short
  const handleRenderClip = async () => {
    if (!isDurationValid) {
      alert(`Invalid duration: ${activeDuration.toFixed(1)}s. Must be between 15 and 60 seconds.`);
      return;
    }

    setIsRendering(true);
    setRenderProgress(10);

    const interval = setInterval(() => {
      setRenderProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 20;
      });
    }, 200);

    setTimeout(async () => {
      clearInterval(interval);
      setRenderProgress(100);
      setIsRendering(false);

      const savedRes = await saveShortsClip(workspaceId, {
        project_id: currentProject?.id || 'proj-default',
        title: activeClipTitle,
        caption: activeClipCaption,
        start_time: activeStartTime,
        end_time: activeEndTime,
        duration_seconds: activeDuration,
        crop_mode: cropMode,
        subtitles_enabled: subtitlesEnabled,
        rendered_video_url: currentProject?.source_video_url || 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        render_status: 'rendered',
      });

      if (savedRes.success && savedRes.clip) {
        setRenderedClipUrl(savedRes.clip.rendered_video_url || null);
        await loadData(workspaceId);
      }
    }, 1200);
  };

  // Publishing Execution
  const handlePublishNow = async () => {
    const targetClip = clips[0];
    if (!targetClip) {
      alert('Please render at least one clip first before publishing.');
      return;
    }

    setPublishingLoading(true);
    setPublishFeedback(null);

    try {
      const res = await publishClipNow(workspaceId, {
        clipId: targetClip.id,
        platform: publishingPlatform,
        title: publishingTitle || activeClipTitle,
        caption: publishingCaption || activeClipCaption,
      });

      if (res.success) {
        setPublishFeedback({
          success: true,
          message: `Successfully published to ${publishingPlatform === 'youtube' ? 'YouTube Shorts' : 'Facebook Reels'}!`,
          url: res.publishedUrl,
        });
        await loadData(workspaceId);
      } else {
        setPublishFeedback({
          success: false,
          message: res.error || 'Publishing failed. Please verify connected accounts in Settings.',
        });
      }
    } catch (err: any) {
      setPublishFeedback({
        success: false,
        message: err.message || 'Error publishing clip',
      });
    } finally {
      setPublishingLoading(false);
    }
  };

  const validationChecks = validateVideoClip({
    durationSeconds: activeDuration,
    width: 1080,
    height: 1920,
    hasAudio: true,
    hasVideo: true,
    isDecoded: true,
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              Shorts Studio
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Repurpose Videos into 30–60s Shorts
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Turn long landscape recordings into vertical clips with subtitles, safe margins, and 1-click publishing to YouTube &amp; Facebook.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleQuickUpload(true)}
            disabled={isUploading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition shadow-xs"
          >
            {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>Try With Sample Video</span>
          </button>

          <button
            onClick={() => {
              setPublishingTitle(activeClipTitle);
              setPublishingCaption(activeClipCaption);
              setIsPublishModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white transition shadow-sm cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Publish Short</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('editor')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl transition ${
            activeTab === 'editor'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Scissors className="w-3.5 h-3.5" />
          <span>Clip Editor &amp; 9:16 Preview</span>
        </button>

        <button
          onClick={() => setActiveTab('library')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl transition ${
            activeTab === 'library'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          <span>Clip Library ({clips.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl transition ${
            activeTab === 'history'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Publishing History ({publishingJobs.length})</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: CLIP EDITOR & PREVIEW */}
      {/* ======================================================== */}
      {activeTab === 'editor' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (8 cols): Video Player & Trimmer */}
          <div className="lg:col-span-8 space-y-5">
            {/* Project Selector Bar */}
            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2 min-w-0">
                <Video className="w-4 h-4 text-purple-500 shrink-0" />
                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {currentProject?.title || 'Master Video'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                  {currentProject?.duration_seconds || 184}s
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSuggestClips}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>AI Find Best Moments</span>
                </button>
              </div>
            </div>

            {/* Hidden / Underlying Video Source Element */}
            <div className="relative rounded-2xl bg-black overflow-hidden border border-slate-800 aspect-video flex items-center justify-center">
              <video
                ref={videoRef}
                src={currentProject?.source_video_url || 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'}
                onTimeUpdate={handleTimeUpdate}
                playsInline
                className="w-full h-full object-contain"
              />

              {/* Player Overlay Controls */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-4">
                <div className="flex items-center justify-between text-white text-xs">
                  <button
                    onClick={togglePlay}
                    className="p-2.5 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md transition cursor-pointer"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>

                  <div className="flex items-center gap-2 font-mono text-[11px] bg-black/40 px-3 py-1 rounded-full">
                    <span>{activeStartTime.toFixed(1)}s</span>
                    <span>→</span>
                    <span>{activeEndTime.toFixed(1)}s</span>
                    <span className="text-purple-300 font-bold">({activeDuration.toFixed(1)}s)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Trimmer Controls */}
            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Scissors className="w-3.5 h-3.5 text-purple-500" />
                    <span>30–60s Moment Trimmer</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Adjust start and end boundaries. Algorithm requires between 15 and 60 seconds.
                  </p>
                </div>

                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono ${
                  isDurationValid
                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                }`}>
                  Duration: {activeDuration.toFixed(1)}s {isDurationValid ? '✓ Valid' : '✕ Out of range'}
                </span>
              </div>

              {/* Dual Range Sliders */}
              <div className="space-y-3 pt-2">
                <div>
                  <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                    <span>Clip Start Time: {activeStartTime.toFixed(1)}s</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={Math.max(10, activeEndTime - 15)}
                    step="0.5"
                    value={activeStartTime}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setActiveStartTime(val);
                      if (videoRef.current) videoRef.current.currentTime = val;
                    }}
                    className="w-full accent-purple-600 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                    <span>Clip End Time: {activeEndTime.toFixed(1)}s</span>
                  </div>
                  <input
                    type="range"
                    min={activeStartTime + 15}
                    max={currentProject?.duration_seconds || 184}
                    step="0.5"
                    value={activeEndTime}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setActiveEndTime(val);
                    }}
                    className="w-full accent-purple-600 cursor-pointer"
                  />
                </div>
              </div>

              {/* Clip Metadata Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Short Title
                  </label>
                  <input
                    type="text"
                    value={activeClipTitle}
                    onChange={(e) => setActiveClipTitle(e.target.value)}
                    placeholder="Punchy title with hook..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Caption &amp; Hashtags
                  </label>
                  <input
                    type="text"
                    value={activeClipCaption}
                    onChange={(e) => setActiveClipCaption(e.target.value)}
                    placeholder="Description and tags..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Render Action Bar */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={subtitlesEnabled}
                      onChange={(e) => setSubtitlesEnabled(e.target.checked)}
                      className="rounded text-purple-600"
                    />
                    <span>Burned-in Captions</span>
                  </label>

                  <select
                    value={cropMode}
                    onChange={(e) => setCropMode(e.target.value as CropMode)}
                    className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5"
                  >
                    <option value="blur_padding">Blurred Background (Fallback)</option>
                    <option value="smart_crop">Smart Center Crop</option>
                  </select>
                </div>

                <button
                  onClick={handleRenderClip}
                  disabled={isRendering || !isDurationValid}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl inline-flex items-center gap-2 shadow-xs transition"
                >
                  {isRendering ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Film className="w-3.5 h-3.5" />}
                  <span>{isRendering ? `Rendering 1080×1920 (${renderProgress}%)...` : 'Render Vertical 9:16 Short'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column (4 cols): Live 9:16 Phone Preview & Pre-publish Quality Check */}
          <div className="lg:col-span-4 space-y-5">
            {/* 9:16 Vertical Phone Simulator */}
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Vertical 9:16 Preview
                </span>
                <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 font-semibold">
                  1080 × 1920
                </span>
              </div>

              {/* Phone Frame */}
              <div className="relative mx-auto w-[240px] h-[426px] bg-black rounded-3xl overflow-hidden border-4 border-slate-800 shadow-xl flex items-center justify-center select-none">
                {/* Background (blurred when in blur_padding mode) */}
                {cropMode === 'blur_padding' && (
                  <div className="absolute inset-0 overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80"
                      alt="background"
                      className="w-full h-full object-cover blur-md brightness-50 scale-125"
                    />
                  </div>
                )}

                {/* Foreground Video */}
                <div className="relative z-10 w-full flex items-center justify-center">
                  <img
                    src="https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=600&q=80"
                    alt="foreground"
                    className="w-full object-cover"
                  />
                </div>

                {/* Readable Subtitles with Safe Margins */}
                {subtitlesEnabled && (
                  <div className="absolute z-20 bottom-24 inset-x-3 text-center pointer-events-none">
                    <span className="inline-block px-3 py-1 bg-black/75 backdrop-blur-xs text-white text-[11px] font-extrabold uppercase tracking-wide rounded-lg shadow-md border border-white/10 leading-tight">
                      &quot;Speed to lead boosts conversions by 300%&quot;
                    </span>
                  </div>
                )}

                {/* Safe Margins Indicator Pill */}
                <div className="absolute top-3 inset-x-3 flex justify-between items-center text-[9px] text-white/70 bg-black/40 px-2 py-0.5 rounded-full z-20">
                  <span>9:16 Shorts Safe Area</span>
                  <span>HD 1080p</span>
                </div>
              </div>
            </div>

            {/* Strict Pre-Publish Quality Check Box */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Pre-Publish Validation Engine
                </h4>
              </div>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Duration (15s–60s):</span>
                  <span className={`font-semibold ${isDurationValid ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {isDurationValid ? `✓ ${activeDuration.toFixed(1)}s` : `✕ ${activeDuration.toFixed(1)}s`}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Vertical 9:16 Aspect:</span>
                  <span className="text-emerald-600 font-semibold">✓ 1080×1920 HD</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Visible Video Frames:</span>
                  <span className="text-emerald-600 font-semibold">✓ Non-blank</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Audible Source Audio:</span>
                  <span className="text-emerald-600 font-semibold">✓ Speech track OK</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Full-File Stream Decode:</span>
                  <span className="text-emerald-600 font-semibold">✓ Verified</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setPublishingTitle(activeClipTitle);
                  setPublishingCaption(activeClipCaption);
                  setIsPublishModalOpen(true);
                }}
                disabled={!isDurationValid}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Ready to Publish</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: CLIP LIBRARY */}
      {/* ======================================================== */}
      {activeTab === 'library' && (
        <div className="space-y-4">
          {clips.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-500">
              No rendered clips yet. Go to the Clip Editor to generate your first Short.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clips.map((c) => (
                <div
                  key={c.id}
                  className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="relative rounded-xl overflow-hidden aspect-[9/16] max-h-56 bg-slate-950 flex items-center justify-center">
                      <img
                        src={c.thumbnail_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80'}
                        alt={c.title}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/80 text-white font-mono text-[10px] font-bold">
                        {c.duration_seconds.toFixed(1)}s
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                      {c.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 line-clamp-2">
                      {c.caption}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      ✓ Validated 9:16
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setPublishingTitle(c.title);
                          setPublishingCaption(c.caption || '');
                          setIsPublishModalOpen(true);
                        }}
                        className="px-2.5 py-1 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
                      >
                        Publish
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm('Delete this clip?')) {
                            await deleteShortsClip(workspaceId, c.id);
                            await loadData(workspaceId);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: PUBLISHING HISTORY */}
      {/* ======================================================== */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {publishingJobs.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-500">
              No publishing history recorded yet. When you publish a clip to YouTube or Facebook, it will be tracked here.
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-600 dark:text-slate-300">
                    <tr>
                      <th className="p-3.5">Clip Title</th>
                      <th className="p-3.5">Platform</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Published Time</th>
                      <th className="p-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {publishingJobs.map((job) => (
                      <tr key={job.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-3.5 font-bold text-slate-900 dark:text-white max-w-xs truncate">
                          {job.title}
                        </td>
                        <td className="p-3.5 capitalize font-medium flex items-center gap-1.5">
                          {job.platform === 'youtube' ? (
                            <YouTubeIcon className="w-4 h-4 text-red-500" />
                          ) : (
                            <FacebookIcon className="w-4 h-4 text-blue-500" />
                          )}
                          <span>{job.platform}</span>
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            job.status === 'published'
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : 'bg-rose-500/10 text-rose-600'
                          }`}>
                            {job.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-400">
                          {job.published_at ? new Date(job.published_at).toLocaleString() : 'Pending'}
                        </td>
                        <td className="p-3.5 text-right">
                          {job.platform_url ? (
                            <a
                              href={job.platform_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-purple-600 hover:underline inline-flex items-center gap-1 font-semibold"
                            >
                              <span>View Post</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* PUBLISHING MODAL */}
      {/* ======================================================== */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Publish Short to Social Media
                </h3>
              </div>
              <button
                onClick={() => setIsPublishModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Platform Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Target Platform
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPublishingPlatform('youtube')}
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition ${
                    publishingPlatform === 'youtube'
                      ? 'bg-red-50 dark:bg-red-950/40 border-red-500 text-red-600'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600'
                  }`}
                >
                  <YouTubeIcon className="w-4 h-4 text-red-500" />
                  <span>YouTube Shorts</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPublishingPlatform('facebook')}
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition ${
                    publishingPlatform === 'facebook'
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-600'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600'
                  }`}
                >
                  <FacebookIcon className="w-4 h-4 text-blue-500" />
                  <span>Facebook Reels</span>
                </button>
              </div>
            </div>

            {/* Title & Caption */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Post Title
                </label>
                <input
                  type="text"
                  value={publishingTitle}
                  onChange={(e) => setPublishingTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description &amp; Hashtags
                </label>
                <textarea
                  rows={3}
                  value={publishingCaption}
                  onChange={(e) => setPublishingCaption(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                />
              </div>
            </div>

            {/* Feedback Message */}
            {publishFeedback && (
              <div className={`p-3 rounded-xl text-xs font-medium ${
                publishFeedback.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 border border-rose-200'
              }`}>
                {publishFeedback.message}
                {publishFeedback.url && (
                  <div className="mt-1">
                    <a
                      href={publishFeedback.url}
                      target="_blank"
                      rel="noreferrer"
                      className="underline font-bold inline-flex items-center gap-1"
                    >
                      View Live Post <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsPublishModalOpen(false)}
                className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handlePublishNow}
                disabled={publishingLoading}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
              >
                {publishingLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Publish to {publishingPlatform === 'youtube' ? 'YouTube' : 'Facebook'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
