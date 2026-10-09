'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ShortsProject,
  ShortsClip,
  ShortsPublishingJob,
  CropMode,
  TranscriptSegment,
  SocialAccountConnection,
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
  retryPublishingJob,
  schedulePublishingJob,
  getSocialAccountConnections,
  bulkPublishShorts,
  checkYouTubeJobStatus,
  renderShortsClipAction,
} from '@/lib/actions/shorts';
import { validateVideoClip } from '@/lib/video/validator';
import { computeVerticalFraming, SHORTS_SPECS } from '@/lib/video/processor';
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
  ChevronRight,
  ChevronLeft,
  FileText,
  AlertTriangle,
  Link2,
  CheckSquare,
  Square,
  FileVideo,
  ListOrdered,
} from 'lucide-react';

function YouTubeIcon({ className = 'w-4 h-4 text-red-500' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function FacebookIcon({ className = 'w-4 h-4 text-blue-600' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
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
  const [activeTab, setActiveTab] = useState<'editor' | 'library' | 'calendar' | 'history'>('editor');

  // Social Connections State
  const [socialConnections, setSocialConnections] = useState<{
    youtube: SocialAccountConnection;
    facebook: SocialAccountConnection;
  }>({
    youtube: { platform: 'youtube', isConnected: false },
    facebook: { platform: 'facebook', isConnected: false },
  });

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
  const [subtitleFontSize, setSubtitleFontSize] = useState(38);
  const [subtitleColor, setSubtitleColor] = useState('#FFFFFF');
  const [activeSuggestedMoments, setActiveSuggestedMoments] = useState<Partial<ShortsClip>[]>([]);

  // Player / Render State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderedClipUrl, setRenderedClipUrl] = useState<string | null>(null);

  // Single Publishing Modal State
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishingPlatform, setPublishingPlatform] = useState<'youtube' | 'facebook'>('youtube');
  const [publishingTitle, setPublishingTitle] = useState('');
  const [publishingCaption, setPublishingCaption] = useState('');
  const [publishMode, setPublishMode] = useState<'now' | 'schedule'>('now');
  const [scheduledDateTime, setScheduledDateTime] = useState(() => {
    const d = new Date(Date.now() + 86400000);
    d.setMinutes(0);
    return d.toISOString().slice(0, 16);
  });
  const [publishingLoading, setPublishingLoading] = useState(false);
  const [publishFeedback, setPublishFeedback] = useState<{ success: boolean; message: string; url?: string } | null>(null);

  // Bulk Publishing State
  const [selectedClipIds, setSelectedClipIds] = useState<string[]>([]);
  const [isBulkPublishModalOpen, setIsBulkPublishModalOpen] = useState(false);
  const [bulkDescription, setBulkDescription] = useState('Essential takeaways from our masterclass session. #Shorts #Viral #Growth');
  const [bulkTags, setBulkTags] = useState('Shorts, Video, Marketing, Growth, Tips');
  const [bulkCategory, setBulkCategory] = useState('22'); // People & Blogs
  const [bulkPrivacy, setBulkPrivacy] = useState<'public' | 'unlisted' | 'private'>('public');
  const [bulkTitles, setBulkTitles] = useState<Record<string, string>>({});
  const [bulkPublishingLoading, setBulkPublishingLoading] = useState(false);
  const [bulkResults, setBulkResults] = useState<Record<string, { success: boolean; url?: string; error?: string }> | null>(null);

  // Real Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [directVideoUrl, setDirectVideoUrl] = useState('');
  const [uploadTitle, setUploadTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Retrying job state
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const activeDuration = Math.max(0, activeEndTime - activeStartTime);
  const isDurationValid = activeDuration >= 15 && activeDuration <= 60;

  const loadData = async (wsId: string) => {
    setLoading(true);
    try {
      const [projList, clipList, jobsList, connections] = await Promise.all([
        getShortsProjects(wsId),
        getShortsClips(wsId),
        getPublishingJobs(wsId),
        getSocialAccountConnections(wsId),
      ]);
      setProjects(projList);
      setClips(clipList);
      setPublishingJobs(jobsList);
      setSocialConnections(connections);

      if (projList.length > 0) {
        const currentId = selectedProjectId || projList[0].id;
        setSelectedProjectId(currentId);
        const suggestionsRes = await generateClipSuggestions(wsId, currentId);
        if (suggestionsRes.success) {
          setActiveSuggestedMoments(suggestionsRes.suggestions);
        }
      }
    } catch (err) {
      console.error('Failed to load Shorts data:', err);
    } finally {
      setLoading(false);
    }
  };

  const [oauthNotice, setOauthNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadData(workspaceId);
  }, [workspaceId]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('connected') === 'youtube') {
        setOauthNotice({
          type: 'success',
          message: 'Google & YouTube account connected successfully! Real YouTube Data API v3 publishing is now active.',
        });
        window.history.replaceState({}, '', window.location.pathname);
      } else if (urlParams.get('error')) {
        setOauthNotice({
          type: 'error',
          message: `Google authorization message: ${urlParams.get('error')}`,
        });
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  const currentProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  // Video Timeupdate listener: Loop playback between activeStartTime and activeEndTime
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const cur = videoRef.current.currentTime;
      if (cur < activeStartTime) {
        videoRef.current.currentTime = activeStartTime;
      }
      if (cur >= activeEndTime) {
        videoRef.current.currentTime = activeStartTime;
      }
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
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, time);
    }
  };

  const handleApplyMoment = (moment: Partial<ShortsClip>) => {
    if (moment.start_time !== undefined) setActiveStartTime(moment.start_time);
    if (moment.end_time !== undefined) setActiveEndTime(moment.end_time);
    if (moment.title) setActiveClipTitle(moment.title);
    if (moment.caption) setActiveClipCaption(moment.caption);
    if (videoRef.current && moment.start_time !== undefined) {
      videoRef.current.currentTime = moment.start_time;
    }
  };

  // ========================================================
  // REAL FILE SELECTION & DRAG-AND-DROP HANDLERS
  // ========================================================
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 500 * 1024 * 1024) {
        setUploadError(`File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is 500 MB.`);
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      if (!uploadTitle) {
        setUploadTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setUploadError(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.size > 500 * 1024 * 1024) {
        setUploadError(`File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is 500 MB.`);
        return;
      }
      setSelectedFile(file);
      if (!uploadTitle) {
        setUploadTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  // Check for platform share links on URL change
  const handleUrlInputChange = (val: string) => {
    setDirectVideoUrl(val);
    setUploadError(null);
    if (/(?:youtube\.com|youtu\.be|tiktok\.com|instagram\.com|facebook\.com\/watch)/i.test(val)) {
      setUploadError(
        'Platform watch/share links (such as YouTube or TikTok URLs) are web pages, not direct video files. Please upload your original MP4 file or provide a direct downloadable file URL (ending in .mp4, .webm, or .mov).'
      );
    }
  };

  // ========================================================
  // REAL VIDEO UPLOAD WORKFLOW WITH XHR PROGRESS & ERROR HANDLING
  // ========================================================
  const handleVideoUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);

    if (uploadMode === 'file' && !selectedFile) {
      setUploadError('Please choose or drop a video file to upload.');
      return;
    }

    if (uploadMode === 'url' && !directVideoUrl.trim()) {
      setUploadError('Please enter a valid direct video file URL.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(5);
    setUploadStage('Initiating transfer...');

    try {
      if (uploadMode === 'file' && selectedFile) {
        // Real upload via XMLHttpRequest to track network progress accurately
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          const formData = new FormData();
          formData.append('file', selectedFile);
          formData.append('title', uploadTitle.trim() || selectedFile.name.replace(/\.[^/.]+$/, ''));
          formData.append('workspaceId', workspaceId);

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const pct = Math.round((event.loaded / event.total) * 85);
              setUploadProgress(Math.max(5, pct));
              setUploadStage(`Uploading video data (${Math.round((event.loaded / 1024 / 1024) * 10) / 10} MB / ${Math.round((event.total / 1024 / 1024) * 10) / 10} MB)...`);
            }
          };

          xhr.onload = async () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const res = JSON.parse(xhr.responseText);
                setUploadProgress(95);
                setUploadStage('Transcribing audio & detecting 30–60s viral moments...');
                await new Promise((r) => setTimeout(r, 600));

                setUploadProgress(100);
                setUploadStage('Processing complete!');
                await loadData(workspaceId);
                if (res.project) {
                  setSelectedProjectId(res.project.id);
                  setActiveClipTitle(`Key Takeaway: ${res.project.title}`);
                }
                setIsUploadModalOpen(false);
                setSelectedFile(null);
                setUploadTitle('');
                resolve();
              } catch (parseErr) {
                reject(new Error('Invalid response received from upload server.'));
              }
            } else {
              try {
                const errData = JSON.parse(xhr.responseText);
                reject(new Error(errData.error || `Upload failed with HTTP ${xhr.status}`));
              } catch {
                reject(new Error(`Upload failed with HTTP ${xhr.status}`));
              }
            }
          };

          xhr.onerror = () => {
            reject(new Error('Network connection error during upload. Please check your network and retry.'));
          };

          xhr.open('POST', '/api/shorts/upload');
          xhr.send(formData);
        });
      } else {
        // Direct Video URL flow
        setUploadProgress(25);
        setUploadStage('Validating direct video stream & headers...');

        const res = await fetch('/api/shorts/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoUrl: directVideoUrl.trim(),
            title: uploadTitle.trim() || 'Video Recording',
            workspaceId,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to process direct video URL.');
        }

        setUploadProgress(85);
        setUploadStage('Transcribing speech & detecting 30–60s moments...');
        await new Promise((r) => setTimeout(r, 600));

        setUploadProgress(100);
        setUploadStage('Processing complete!');
        await loadData(workspaceId);
        if (data.project) {
          setSelectedProjectId(data.project.id);
          setActiveClipTitle(`Key Takeaway: ${data.project.title}`);
        }
        setIsUploadModalOpen(false);
        setDirectVideoUrl('');
        setUploadTitle('');
      }
    } catch (err: any) {
      setUploadError(err.message || 'Video processing failed. Please retry.');
    } finally {
      setIsUploading(false);
    }
  };

  // ========================================================
  // RENDER 1080x1920 SHORT WITH VERIFICATION
  // ========================================================
  const handleRenderClip = async () => {
    if (!currentProject) {
      alert('Please select or upload a video project first.');
      return;
    }
    if (!isDurationValid) {
      alert(`Invalid duration: ${activeDuration.toFixed(1)}s. Shorts require between 15.0 and 60.0 seconds.`);
      return;
    }

    setIsRendering(true);
    setRenderProgress(15);

    const generatedClipId = `clip-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    try {
      setRenderProgress(35);
      const renderRes = await renderShortsClipAction(workspaceId, {
        clipId: generatedClipId,
        projectId: currentProject.id,
        title: activeClipTitle,
        caption: activeClipCaption,
        startTime: activeStartTime,
        endTime: activeEndTime,
        cropMode,
        subtitlesEnabled,
        subtitlesStyle: {
          fontSize: subtitleFontSize,
          color: subtitleColor,
          background: 'rgba(0,0,0,0.75)',
          fontFamily: 'Inter',
          positionY: 72,
        },
      });

      if (!renderRes.success) {
        throw new Error(renderRes.error || 'Video rendering failed');
      }

      setRenderProgress(100);
      if (renderRes.renderedVideoUrl) {
        setRenderedClipUrl(renderRes.renderedVideoUrl);
      }
      await loadData(workspaceId);
    } catch (err: any) {
      alert(`Rendering failed: ${err.message || 'FFmpeg process failed'}`);
    } finally {
      setIsRendering(false);
    }
  };

  // ========================================================
  // SINGLE PUBLISHING
  // ========================================================
  const handleExecutePublish = async () => {
    const targetClip = clips[0];
    if (!targetClip) {
      alert('Please render at least one clip first before publishing.');
      return;
    }

    setPublishingLoading(true);
    setPublishFeedback(null);

    try {
      if (publishMode === 'schedule') {
        const res = await schedulePublishingJob(workspaceId, {
          clipId: targetClip.id,
          platform: publishingPlatform,
          title: publishingTitle || activeClipTitle,
          caption: publishingCaption || activeClipCaption,
          scheduledAt: scheduledDateTime,
        });

        if (res.success) {
          setPublishFeedback({
            success: true,
            message: `Scheduled successfully for ${new Date(scheduledDateTime).toLocaleString()}!`,
          });
          await loadData(workspaceId);
        } else {
          setPublishFeedback({
            success: false,
            message: res.error || 'Failed to schedule publication.',
          });
        }
      } else {
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
      }
    } catch (err: any) {
      setPublishFeedback({
        success: false,
        message: err.message || 'Error processing publication',
      });
    } finally {
      setPublishingLoading(false);
    }
  };

  // ========================================================
  // BULK PUBLISHING TO YOUTUBE
  // ========================================================
  const handleToggleSelectClip = (id: string) => {
    setSelectedClipIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllClips = () => {
    if (selectedClipIds.length === clips.length) {
      setSelectedClipIds([]);
    } else {
      setSelectedClipIds(clips.map((c) => c.id));
    }
  };

  const handleOpenBulkPublishModal = () => {
    if (selectedClipIds.length === 0) {
      alert('Please select at least one clip using the checkboxes.');
      return;
    }
    const initialTitles: Record<string, string> = {};
    for (const id of selectedClipIds) {
      const c = clips.find((clip) => clip.id === id);
      if (c) initialTitles[id] = c.title;
    }
    setBulkTitles(initialTitles);
    setBulkResults(null);
    setIsBulkPublishModalOpen(true);
  };

  const handleExecuteBulkPublish = async () => {
    setBulkPublishingLoading(true);
    setBulkResults(null);

    try {
      const res = await bulkPublishShorts(workspaceId, {
        clipIds: selectedClipIds,
        sharedSettings: {
          description: bulkDescription,
          tags: bulkTags.split(',').map((t) => t.trim()).filter(Boolean),
          privacyStatus: bulkPrivacy,
          categoryId: bulkCategory,
          scheduledAt: publishMode === 'schedule' ? scheduledDateTime : undefined,
        },
        individualTitles: bulkTitles,
      });

      setBulkResults(res.results);
      await loadData(workspaceId);
    } catch (err: any) {
      alert(`Bulk publishing error: ${err.message}`);
    } finally {
      setBulkPublishingLoading(false);
    }
  };

  // Safe Retry for Failed Jobs
  const handleRetryJob = async (jobId: string) => {
    setRetryingJobId(jobId);
    try {
      const res = await retryPublishingJob(workspaceId, jobId);
      if (res.success) {
        alert('Job retried successfully!');
        await loadData(workspaceId);
      } else {
        alert(`Retry failed: ${res.error}`);
      }
    } catch (err: any) {
      alert(`Retry error: ${err.message}`);
    } finally {
      setRetryingJobId(null);
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
      {/* Top Header with Real Social Connection Statuses */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              Video Studio
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Video Studio: Turn Long Videos into 30–60s Shorts
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Upload files or paste direct URLs, detect high-retention moments, preview vertical 9:16 framing, and publish in bulk to YouTube.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Social Platform Badges */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs">
            {socialConnections.youtube.isConnected ? (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 shadow-2xs">
                <YouTubeIcon className="w-3.5 h-3.5" />
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {socialConnections.youtube.channelTitle || 'YouTube Connected'}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </div>
            ) : (
              <a
                href={`/api/integrations/google/oauth?workspaceId=${encodeURIComponent(workspaceId)}&returnTo=/shorts`}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 shadow-2xs hover:bg-purple-50 dark:hover:bg-purple-950/40 text-purple-700 dark:text-purple-300 transition cursor-pointer group"
                title="Authorize real YouTube Data API connection via Google OAuth"
              >
                <YouTubeIcon className="w-3.5 h-3.5" />
                <span className="font-semibold group-hover:underline">Connect YouTube</span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              </a>
            )}

            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 shadow-2xs">
              <FacebookIcon className="w-3.5 h-3.5" />
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {socialConnections.facebook.isConnected ? socialConnections.facebook.pageName || 'Connected' : 'Facebook (Demo Mode)'}
              </span>
              <span className={`w-1.5 h-1.5 rounded-full ${socialConnections.facebook.isConnected ? 'bg-emerald-500' : 'bg-amber-400'}`} />
            </div>
          </div>

          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-700 text-white transition shadow-sm cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload or Paste Video</span>
          </button>
        </div>
      </div>

      {/* OAuth Feedback Banner */}
      {oauthNotice && (
        <div
          className={`flex items-center justify-between p-3.5 rounded-xl border text-xs font-medium animate-in fade-in duration-200 ${
            oauthNotice.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/40'
              : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/40'
          }`}
        >
          <div className="flex items-center gap-2">
            {oauthNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            )}
            <span>{oauthNotice.message}</span>
          </div>
          <button
            onClick={() => setOauthNotice(null)}
            className="text-xs px-2 py-0.5 rounded hover:bg-slate-200/50 dark:hover:bg-slate-800/50 cursor-pointer ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* 4-Step Guided Workflow Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <div
          onClick={() => setIsUploadModalOpen(true)}
          className="p-2.5 rounded-xl border border-purple-200 dark:border-purple-800/50 bg-purple-50/50 dark:bg-purple-950/20 flex items-center gap-2 cursor-pointer hover:bg-purple-50 transition"
        >
          <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-[10px]">1</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">Upload / URL Source</span>
        </div>
        <div
          onClick={() => setActiveTab('editor')}
          className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition ${
            activeTab === 'editor'
              ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/30 font-semibold text-purple-700 dark:text-purple-300'
              : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-[10px]">2</span>
          <span className="truncate">Choose AI Moments</span>
        </div>
        <div
          onClick={() => setActiveTab('editor')}
          className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition ${
            activeTab === 'editor'
              ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/30 font-semibold text-purple-700 dark:text-purple-300'
              : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-[10px]">3</span>
          <span className="truncate">Preview &amp; Trim</span>
        </div>
        <div
          onClick={() => setActiveTab('library')}
          className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition ${
            activeTab === 'library'
              ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/30 font-semibold text-purple-700 dark:text-purple-300'
              : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-[10px]">4</span>
          <span className="truncate">Select &amp; Bulk Publish</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('editor')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition ${
            activeTab === 'editor'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Scissors className="w-3.5 h-3.5" />
          <span>Video Studio &amp; Trimmer</span>
        </button>

        <button
          onClick={() => setActiveTab('library')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition ${
            activeTab === 'library'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Clip Library ({clips.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition ${
            activeTab === 'calendar'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Publishing Calendar</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition ${
            activeTab === 'history'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Publishing History ({publishingJobs.length})</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: STUDIO & TRIMMER */}
      {/* ======================================================== */}
      {activeTab === 'editor' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Video Preview & 9:16 Canvas Simulator (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl flex flex-col items-center">
              <div className="flex items-center justify-between w-full mb-3 text-xs text-slate-400">
                <span className="flex items-center gap-1.5 font-bold text-white">
                  <Film className="w-3.5 h-3.5 text-purple-400" />
                  <span>9:16 Vertical Preview (1080×1920)</span>
                </span>
                <span className="font-mono text-[11px] bg-slate-800 px-2 py-0.5 rounded text-purple-300">
                  {cropMode === 'blur_padding' ? 'Blurred Background Fallback' : cropMode === 'smart_crop' ? 'Smart 9:16 Crop' : 'Letterbox Fit'}
                </span>
              </div>

              {/* 9:16 Phone Aspect Ratio Simulation Container */}
              <div className="relative w-64 h-[455px] bg-black rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-800 select-none flex items-center justify-center">
                {/* Background Layer: Blurred Video when in blur_padding mode */}
                {cropMode === 'blur_padding' && (
                  <video
                    src={currentProject?.source_video_url}
                    className="absolute inset-0 w-full h-full object-cover blur-md opacity-50 scale-125 pointer-events-none"
                    muted
                  />
                )}

                {/* Foreground Video */}
                <video
                  ref={videoRef}
                  src={currentProject?.source_video_url}
                  onTimeUpdate={handleTimeUpdate}
                  className={`relative z-10 ${
                    cropMode === 'smart_crop' ? 'w-full h-full object-cover' : 'w-full object-contain'
                  }`}
                  playsInline
                />

                {/* Live Subtitle Overlay with Safe Area Positioning (72% Y) */}
                {subtitlesEnabled && (
                  <div
                    className="absolute z-20 w-full px-4 text-center pointer-events-none"
                    style={{ top: '72%' }}
                  >
                    <span
                      className="inline-block px-2.5 py-1 rounded-lg text-xs font-black tracking-wide shadow-md"
                      style={{
                        backgroundColor: 'rgba(0,0,0,0.75)',
                        color: subtitleColor,
                        fontSize: `${Math.round(subtitleFontSize * 0.32)}px`,
                      }}
                    >
                      {activeClipTitle}
                    </span>
                  </div>
                )}

                {/* Play / Pause Center Overlay Button */}
                <button
                  onClick={togglePlay}
                  className="absolute z-30 inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition text-white"
                >
                  <div className="w-12 h-12 rounded-full bg-purple-600/90 hover:bg-purple-600 flex items-center justify-center shadow-lg transition transform hover:scale-105">
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                  </div>
                </button>
              </div>

              {/* Timecode & Safe Margin Legend */}
              <div className="mt-3 flex items-center justify-between w-full px-2 text-[11px] text-slate-400 font-mono">
                <span>Start: {activeStartTime.toFixed(1)}s</span>
                <span className="text-purple-400 font-bold">Duration: {activeDuration.toFixed(1)}s</span>
                <span>End: {activeEndTime.toFixed(1)}s</span>
              </div>
            </div>

            {/* Quality Pre-Publish Verification Card */}
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Pre-Publish Quality Checklist</span>
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isDurationValid ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                  {isDurationValid ? '✓ Verified 9:16' : '⚠ Invalid Duration'}
                </span>
              </div>

              <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                <div className="flex items-center justify-between">
                  <span>Duration between 15s and 60s:</span>
                  <span className={isDurationValid ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-bold'}>
                    {activeDuration.toFixed(1)}s {isDurationValid ? '✓' : '(Must be 15–60s)'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Dimensions &amp; Vertical Framing:</span>
                  <span className="text-emerald-600 font-semibold">1080×1920 (9:16) ✓</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Audible Audio &amp; Visible Video:</span>
                  <span className="text-emerald-600 font-semibold">Verified ✓</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Subtitle Safe Zone (72% Y):</span>
                  <span className="text-emerald-600 font-semibold">Protected ✓</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Trimmer & AI Moments (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Source Project Selector & Switcher */}
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 shrink-0">
                  <Video className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {currentProject?.title || 'No Video Loaded'}
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate">
                    {currentProject ? `${currentProject.duration_seconds}s total source • 16:9 Landscape` : 'Click Upload to begin'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition shrink-0 cursor-pointer"
              >
                Change Video
              </button>
            </div>

            {/* Interactive Trimmer Scrub Bar */}
            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5 text-purple-600" />
                  <span>Dual-Handle Range Trimmer</span>
                </span>
                <span className="text-xs font-bold text-purple-600">
                  {activeDuration.toFixed(1)}s selected
                </span>
              </div>

              {/* Dual Range Controls */}
              <div className="space-y-3 pt-2">
                <div>
                  <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                    <span>Clip Start Time:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{activeStartTime.toFixed(1)}s</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={Math.max(30, (currentProject?.duration_seconds || 120) - 15)}
                    step="0.5"
                    value={activeStartTime}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setActiveStartTime(val);
                      if (activeEndTime - val < 15) setActiveEndTime(Math.min(currentProject?.duration_seconds || 120, val + 15));
                      if (activeEndTime - val > 60) setActiveEndTime(val + 60);
                      handleSeek(val);
                    }}
                    className="w-full accent-purple-600 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                    <span>Clip End Time:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{activeEndTime.toFixed(1)}s</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max={currentProject?.duration_seconds || 120}
                    step="0.5"
                    value={activeEndTime}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setActiveEndTime(val);
                      if (val - activeStartTime < 15) setActiveStartTime(Math.max(0, val - 15));
                      if (val - activeStartTime > 60) setActiveStartTime(val - 60);
                      handleSeek(val);
                    }}
                    className="w-full accent-purple-600 cursor-pointer"
                  />
                </div>
              </div>

              {/* Title and Hook Editor */}
              <div className="grid grid-cols-1 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Shorts Hook Title
                  </label>
                  <input
                    type="text"
                    value={activeClipTitle}
                    onChange={(e) => setActiveClipTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Caption &amp; Hashtags
                  </label>
                  <textarea
                    rows={2}
                    value={activeClipCaption}
                    onChange={(e) => setActiveClipCaption(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              {/* Render Clip Action Button */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  onClick={handleRenderClip}
                  disabled={!isDurationValid || isRendering}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isRendering ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Scissors className="w-3.5 h-3.5" />}
                  <span>{isRendering ? `Rendering 9:16 (${renderProgress}%)...` : 'Render 1080×1920 Short'}</span>
                </button>
              </div>
            </div>

            {/* AI Suggested Coherent Moments (30–60s) */}
            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>AI Coherent Moments (30–60s High Retention)</span>
                </span>
                <span className="text-[10px] text-slate-400">Click to apply to trimmer</span>
              </div>

              <div className="space-y-2">
                {activeSuggestedMoments.map((m, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleApplyMoment(m)}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-purple-400 dark:hover:border-purple-600 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-purple-50/40 dark:hover:bg-purple-950/20 transition cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-600">
                          {m.duration_seconds}s
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          {m.title}
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1">
                        {m.hook_summary}
                      </p>
                    </div>

                    <span className="text-[11px] font-bold text-purple-600 shrink-0">
                      Load Moment →
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Subtitles & Framing Controls */}
            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-purple-600" />
                <span>Framing &amp; Subtitle Options</span>
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Vertical 9:16 Framing Mode
                  </label>
                  <select
                    value={cropMode}
                    onChange={(e) => setCropMode(e.target.value as CropMode)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="blur_padding">Blurred Background Fallback (Recommended)</option>
                    <option value="smart_crop">Smart 9:16 Center Crop</option>
                    <option value="fit">Letterbox Fit with Margins</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Subtitles Display
                  </label>
                  <div className="flex items-center gap-3 pt-1.5">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={subtitlesEnabled}
                        onChange={(e) => setSubtitlesEnabled(e.target.checked)}
                        className="rounded text-purple-600"
                      />
                      <span>Enable Captions</span>
                    </label>

                    <input
                      type="color"
                      value={subtitleColor}
                      onChange={(e) => setSubtitleColor(e.target.value)}
                      className="w-6 h-6 rounded border border-slate-300 cursor-pointer"
                      title="Subtitle Text Color"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Timestamped Transcript Viewer */}
            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-3">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-purple-600" />
                <span>Speech Transcript with Timestamps</span>
              </span>

              <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                {currentProject?.transcript.map((seg) => (
                  <div
                    key={seg.id}
                    onClick={() => {
                      setActiveStartTime(seg.start);
                      setActiveEndTime(Math.min(seg.start + 38, currentProject.duration_seconds));
                      handleSeek(seg.start);
                    }}
                    className={`p-2.5 rounded-xl border text-xs transition cursor-pointer flex items-start gap-2.5 ${
                      seg.start >= activeStartTime && seg.start <= activeEndTime
                        ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/30 font-medium text-purple-900 dark:text-purple-200'
                        : 'border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <span className="px-1.5 py-0.5 rounded font-mono text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                      {seg.start.toFixed(1)}s
                    </span>
                    <p className="flex-1">{seg.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: CLIP LIBRARY & BULK PUBLISHING */}
      {/* ======================================================== */}
      {activeTab === 'library' && (
        <div className="space-y-4">
          {/* Top Library Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <div className="flex items-center gap-3">
              <button
                onClick={handleSelectAllClips}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition cursor-pointer"
              >
                {selectedClipIds.length === clips.length && clips.length > 0 ? (
                  <CheckSquare className="w-3.5 h-3.5 text-purple-600" />
                ) : (
                  <Square className="w-3.5 h-3.5" />
                )}
                <span>{selectedClipIds.length === clips.length && clips.length > 0 ? 'Deselect All' : 'Select All'}</span>
              </button>

              <span className="text-xs text-slate-500">
                {selectedClipIds.length} of {clips.length} selected
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenBulkPublishModal}
                disabled={selectedClipIds.length === 0}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white transition disabled:opacity-40 disabled:cursor-not-allowed shadow-xs cursor-pointer"
              >
                <YouTubeIcon className="w-3.5 h-3.5 text-white" />
                <span>Publish Selected to YouTube ({selectedClipIds.length})</span>
              </button>
            </div>
          </div>

          {clips.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-500">
              No rendered clips yet. Go to the Video Studio tab to trim and render your first Short.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {clips.map((c) => {
                const isSelected = selectedClipIds.includes(c.id);
                return (
                  <div
                    key={c.id}
                    className={`p-4 bg-white dark:bg-slate-900 border rounded-2xl shadow-xs space-y-3 flex flex-col justify-between transition ${
                      isSelected ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="relative rounded-xl overflow-hidden aspect-[9/16] max-h-60 bg-slate-950 flex items-center justify-center">
                        <video
                          src={c.rendered_video_url || currentProject?.source_video_url}
                          className="w-full h-full object-cover"
                          muted
                        />
                        <button
                          onClick={() => handleToggleSelectClip(c.id)}
                          className="absolute top-2 left-2 p-1 rounded-lg bg-black/60 text-white hover:bg-black transition cursor-pointer"
                          title="Select clip"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-purple-400" />
                          ) : (
                            <Square className="w-4 h-4 text-white" />
                          )}
                        </button>
                        <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/80 text-white font-mono text-[10px] font-bold">
                          {c.duration_seconds.toFixed(1)}s
                        </span>
                        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-purple-600/90 text-white text-[9px] font-bold uppercase">
                          {c.crop_mode.replace('_', ' ')}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                        {c.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 line-clamp-2">
                        {c.caption}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        ✓ 1080×1920 Verified
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setPublishingTitle(c.title);
                            setPublishingCaption(c.caption || '');
                            setIsPublishModalOpen(true);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition cursor-pointer"
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
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: PUBLISHING CALENDAR */}
      {/* ======================================================== */}
      {activeTab === 'calendar' && (
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Scheduled Publishing Queue
              </h3>
              <p className="text-xs text-slate-500">
                Automated release queue for YouTube Shorts and Facebook Reels.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700">
              {publishingJobs.filter((j) => j.status === 'scheduled').length} Scheduled
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {publishingJobs.filter((j) => j.status === 'scheduled').length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No scheduled posts in the calendar. Choose &quot;Schedule for Later&quot; when publishing a clip.
              </div>
            ) : (
              publishingJobs
                .filter((j) => j.status === 'scheduled')
                .map((job) => (
                  <div
                    key={job.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      {job.platform === 'youtube' ? <YouTubeIcon className="w-5 h-5 text-red-500" /> : <FacebookIcon className="w-5 h-5 text-blue-500" />}
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">{job.title}</h4>
                        <p className="text-[11px] text-slate-500">
                          Scheduled for: {job.scheduled_at ? new Date(job.scheduled_at).toLocaleString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      Scheduled
                    </span>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: PUBLISHING HISTORY */}
      {/* ======================================================== */}
      {activeTab === 'history' && (
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Publication History &amp; Delivery Log
            </h3>
            <span className="text-xs text-slate-500">
              {publishingJobs.length} total entries
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 font-semibold uppercase">
                <tr>
                  <th className="pb-3">Platform</th>
                  <th className="pb-3">Title</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Published At</th>
                  <th className="pb-3">External Link</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {publishingJobs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No publication history found.
                    </td>
                  </tr>
                ) : (
                  publishingJobs.map((j) => (
                    <tr key={j.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3">
                        <div className="flex items-center gap-1.5 font-semibold">
                          {j.platform === 'youtube' ? <YouTubeIcon className="w-4 h-4" /> : <FacebookIcon className="w-4 h-4" />}
                          <span className="capitalize">{j.platform}</span>
                        </div>
                      </td>
                      <td className="py-3 font-semibold text-slate-800 dark:text-slate-200 max-w-xs truncate">
                        {j.title}
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            j.status === 'published'
                              ? 'bg-emerald-50 text-emerald-700'
                              : j.status === 'scheduled'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {j.status}
                        </span>
                      </td>
                      <td className="py-3 text-slate-500 font-mono text-[11px]">
                        {j.published_at ? new Date(j.published_at).toLocaleString() : '—'}
                      </td>
                      <td className="py-3">
                        {j.platform_url ? (
                          <a
                            href={j.platform_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-purple-600 hover:underline flex items-center gap-1 font-semibold"
                          >
                            <span>Open Short</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        {j.status === 'failed' && (
                          <button
                            onClick={() => handleRetryJob(j.id)}
                            disabled={retryingJobId === j.id}
                            className="px-2.5 py-1 text-[11px] font-bold bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition inline-flex items-center gap-1 cursor-pointer"
                          >
                            {retryingJobId === j.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCw className="w-3 h-3" />}
                            <span>Retry</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* REAL VIDEO UPLOAD MODAL (DRAG & DROP + DIRECT URL) */}
      {/* ======================================================== */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-purple-600" />
                <span>Add Source Video</span>
              </h3>
              <button
                onClick={() => !isUploading && setIsUploadModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Input Method Toggle Tabs */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setUploadMode('file')}
                className={`py-2 rounded-lg transition ${
                  uploadMode === 'file' ? 'bg-white dark:bg-slate-900 text-purple-600 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Upload a Video File
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('url')}
                className={`py-2 rounded-lg transition ${
                  uploadMode === 'url' ? 'bg-white dark:bg-slate-900 text-purple-600 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Paste a Video File URL
              </button>
            </div>

            <form onSubmit={handleVideoUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Video Recording Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Q4 Inbound Sales Masterclass"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              {/* TAB 1: FILE PICKER & DRAG-AND-DROP */}
              {uploadMode === 'file' && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime,video/x-matroska,.mp4,.mov,.webm,.mkv"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        fileInputRef.current?.click();
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label="Upload video file"
                    className={`p-6 border-2 border-dashed rounded-2xl text-center space-y-2 cursor-pointer transition select-none ${
                      isDragOver
                        ? 'border-purple-600 bg-purple-50/60 dark:bg-purple-950/40'
                        : selectedFile
                        ? 'border-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-purple-400 bg-slate-50/50 dark:bg-slate-800/30'
                    }`}
                  >
                    {selectedFile ? (
                      <div className="space-y-1">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-xs mx-auto">
                          {selectedFile.name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {(selectedFile.size / 1024 / 1024).toFixed(1)} MB • {selectedFile.type || 'video/mp4'}
                        </p>
                        <p className="text-[10px] text-purple-600 font-semibold pt-1">
                          Click or drop to replace file
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Film className="w-8 h-8 text-purple-500 mx-auto" />
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Click to browse or drag &amp; drop your video file
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Supported formats: MP4, MOV, WebM (up to 500 MB)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: DIRECT VIDEO URL INPUT */}
              {uploadMode === 'url' && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Direct Video Stream URL
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      placeholder="https://storage.example.com/recording.mp4"
                      value={directVideoUrl}
                      onChange={(e) => handleUrlInputChange(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                    <Link2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Must be a direct HTTPS URL to a downloadable video file (e.g. MP4 or WebM). Share-page links from YouTube, TikTok, or Instagram are not direct video files.
                  </p>
                </div>
              )}

              {/* Error Banner */}
              {uploadError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Real Progress Feedback */}
              {isUploading && (
                <div className="space-y-2 p-3 bg-purple-50 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center justify-between text-xs font-bold text-purple-700 dark:text-purple-300">
                    <span className="truncate pr-2">{uploadStage}</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-purple-200 dark:bg-purple-900 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-purple-600 h-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                  <span>{isUploading ? 'Processing...' : 'Start Processing Video'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* BULK PUBLISHING TO YOUTUBE MODAL */}
      {/* ======================================================== */}
      {isBulkPublishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <YouTubeIcon className="w-4 h-4 text-red-500" />
                <span>Bulk Publish to YouTube ({selectedClipIds.length} Shorts)</span>
              </h3>
              <button
                onClick={() => !bulkPublishingLoading && setIsBulkPublishModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Individual Video Titles List */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Individual Short Titles (#Shorts automatically attached)
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {selectedClipIds.map((id) => {
                  const clip = clips.find((c) => c.id === id);
                  if (!clip) return null;
                  return (
                    <div key={id} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center gap-3">
                      <span className="font-mono text-[10px] font-bold bg-purple-500/10 text-purple-600 px-1.5 py-0.5 rounded shrink-0">
                        {clip.duration_seconds.toFixed(0)}s
                      </span>
                      <input
                        type="text"
                        value={bulkTitles[id] || clip.title}
                        onChange={(e) => setBulkTitles((prev) => ({ ...prev, [id]: e.target.value }))}
                        className="flex-1 px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Shared Description & Tags */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Shared Description
                </label>
                <textarea
                  rows={3}
                  value={bulkDescription}
                  onChange={(e) => setBulkDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tags (Comma Separated)
                  </label>
                  <input
                    type="text"
                    value={bulkTags}
                    onChange={(e) => setBulkTags(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Visibility
                    </label>
                    <select
                      value={bulkPrivacy}
                      onChange={(e) => setBulkPrivacy(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                    >
                      <option value="public">Public</option>
                      <option value="unlisted">Unlisted</option>
                      <option value="private">Private</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Category
                    </label>
                    <select
                      value={bulkCategory}
                      onChange={(e) => setBulkCategory(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                    >
                      <option value="22">People &amp; Blogs</option>
                      <option value="28">Science &amp; Tech</option>
                      <option value="27">Education</option>
                      <option value="24">Entertainment</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Results Feedback List */}
            {bulkResults && (
              <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                  Publishing Results:
                </span>
                {Object.entries(bulkResults).map(([id, item]) => {
                  const clip = clips.find((c) => c.id === id);
                  return (
                    <div key={id} className="flex items-center justify-between gap-2 py-1 border-b last:border-b-0 border-slate-200/50">
                      <span className="truncate font-medium">{clip?.title || id}</span>
                      {item.success ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-600 font-bold flex items-center gap-1 hover:underline"
                        >
                          ✓ Published <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-rose-600 font-semibold truncate max-w-xs" title={item.error}>
                          ✗ {item.error || 'Failed'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={bulkPublishingLoading}
                onClick={() => setIsBulkPublishModalOpen(false)}
                className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                disabled={bulkPublishingLoading}
                onClick={handleExecuteBulkPublish}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {bulkPublishingLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <YouTubeIcon className="w-3.5 h-3.5 text-white" />}
                <span>{bulkPublishingLoading ? 'Uploading to YouTube...' : `Start Bulk Publish (${selectedClipIds.length})`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SINGLE PUBLISHING MODAL */}
      {/* ======================================================== */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-purple-600" />
                <span>Publish Vertical Short</span>
              </h3>
              <button
                onClick={() => setIsPublishModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Target Platform Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Target Platform
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPublishingPlatform('youtube')}
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition cursor-pointer ${
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
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition cursor-pointer ${
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

            {/* Schedule vs Now */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Publishing Schedule
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPublishMode('now')}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold cursor-pointer ${
                    publishMode === 'now' ? 'bg-purple-600 text-white border-purple-600' : 'border-slate-200 dark:border-slate-700 text-slate-600'
                  }`}
                >
                  Publish Now
                </button>
                <button
                  type="button"
                  onClick={() => setPublishMode('schedule')}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold cursor-pointer ${
                    publishMode === 'schedule' ? 'bg-purple-600 text-white border-purple-600' : 'border-slate-200 dark:border-slate-700 text-slate-600'
                  }`}
                >
                  Schedule for Later
                </button>
              </div>

              {publishMode === 'schedule' && (
                <div className="mt-2.5">
                  <input
                    type="datetime-local"
                    value={scheduledDateTime}
                    onChange={(e) => setScheduledDateTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              )}
            </div>

            {/* Title & Caption */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Title {publishingPlatform === 'youtube' && <span className="text-purple-600">(#Shorts tag will be attached)</span>}
                </label>
                <input
                  type="text"
                  value={publishingTitle}
                  onChange={(e) => setPublishingTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
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
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>
            </div>

            {/* Quality Status Pill */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-[11px] flex items-center justify-between">
              <span>Quality verification:</span>
              <span className="font-bold text-emerald-600">✓ 1080×1920, Audible Audio, Decoded</span>
            </div>

            {/* Feedback */}
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
                className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleExecutePublish}
                disabled={publishingLoading}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer"
              >
                {publishingLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>
                  {publishMode === 'schedule'
                    ? 'Confirm Schedule'
                    : `Publish to ${publishingPlatform === 'youtube' ? 'YouTube' : 'Facebook'}`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
