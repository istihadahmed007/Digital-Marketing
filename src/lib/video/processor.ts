import {
  TranscriptSegment,
  ShortsClip,
  CropMode,
  SubtitlesStyle,
  ClipValidationResult,
} from '@/lib/types/shorts';
import { validateVideoClip } from './validator';
import { safeFetch } from '@/lib/security/ssrf';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execFileAsync = promisify(execFile);

function getFfmpegPath(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ffmpeg = require('@ffmpeg-installer/ffmpeg');
    if (ffmpeg?.path && fs.existsSync(ffmpeg.path)) {
      return ffmpeg.path;
    }
  } catch {
    // Fall back to system PATH
  }
  return 'ffmpeg';
}

/**
 * 9:16 Vertical Video Constraints & Specifications
 */
export const SHORTS_SPECS = {
  TARGET_WIDTH: 1080,
  TARGET_HEIGHT: 1920,
  ASPECT_RATIO: '9:16',
  MIN_DURATION: 15.0,
  MAX_DURATION: 60.0,
  RECOMMENDED_MIN_DURATION: 30.0,
  SUBTITLE_SAFE_TOP_PERCENT: 12,
  SUBTITLE_SAFE_BOTTOM_PERCENT: 80,
  DEFAULT_SUBTITLE_Y_PERCENT: 72,
};

export interface VideoProcessingProgress {
  stage: 'uploading' | 'extracting_audio' | 'transcribing' | 'detecting_moments' | 'rendering' | 'completed' | 'failed';
  percent: number;
  message: string;
}

/**
 * Transcribes audio from source video or speech track into timestamped segments.
 * Uses OpenAI Whisper when OPENAI_API_KEY is configured.
 * If credentials are not configured, returns an empty transcript and informs caller to use manual trimming.
 * Test mocks only exist in isolated unit test environments (NODE_ENV === 'test').
 */
export async function transcribeVideoAudio(params: {
  videoUrl: string;
  durationSeconds: number;
  titleHint?: string;
}): Promise<TranscriptSegment[]> {
  const openAiKey = process.env.OPENAI_API_KEY;

  // 1. Production Whisper API transcription if OPENAI_API_KEY is configured
  if (openAiKey) {
    try {
      const ffmpegPath = getFfmpegPath();
      const tempAudioDir = path.join(process.cwd(), 'public', 'uploads', 'temp_audio');
      if (!fs.existsSync(tempAudioDir)) {
        fs.mkdirSync(tempAudioDir, { recursive: true });
      }

      const tempAudioPath = path.join(tempAudioDir, `whisper_${Date.now()}.mp3`);

      // Extract compressed MP3 speech audio from video (up to 25MB limit for Whisper)
      await execFileAsync(
        ffmpegPath,
        [
          '-y',
          '-i', params.videoUrl,
          '-vn',
          '-acodec', 'libmp3lame',
          '-q:a', '5',
          '-ar', '16000',
          tempAudioPath,
        ],
        { timeout: 60000 }
      );

      if (fs.existsSync(tempAudioPath)) {
        const audioBuffer = fs.readFileSync(tempAudioPath);
        const form = new FormData();
        form.append('file', new Blob([audioBuffer], { type: 'audio/mp3' }), 'speech.mp3');
        form.append('model', 'whisper-1');
        form.append('response_format', 'verbose_json');
        form.append('temperature', '0.2');

        const whisperRes = await safeFetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openAiKey}`,
          },
          body: form,
          timeoutMs: 90000,
        });

        // Clean up temporary audio file
        try {
          fs.unlinkSync(tempAudioPath);
        } catch {}

        if (whisperRes.ok) {
          const result = await whisperRes.json();
          if (Array.isArray(result.segments) && result.segments.length > 0) {
            return result.segments.map((seg: any, idx: number) => ({
              id: `seg-${idx + 1}`,
              start: Math.round(seg.start * 10) / 10,
              end: Math.round(seg.end * 10) / 10,
              text: (seg.text || '').trim(),
              words: Array.isArray(seg.words)
                ? seg.words.map((w: any) => ({
                    word: w.word,
                    start: w.start,
                    end: w.end,
                  }))
                : undefined,
            }));
          }
        }
      }
    } catch (err) {
      console.warn('OpenAI Whisper transcription attempt encountered an error:', err);
    }
  }

  // 2. Isolated test environment fixture (only for tests when OPENAI_API_KEY is not set)
  if (process.env.NODE_ENV === 'test') {
    const duration = Math.max(30, Number(params.durationSeconds || 120));
    const hint = params.titleHint || 'Marketing & Growth Masterclass';

    return [
      {
        id: 'seg-1',
        start: 0.0,
        end: 14.8,
        text: `Welcome in! In this session, we are breaking down the exact system behind ${hint}.`,
        words: [
          { word: 'Welcome', start: 0.0, end: 1.2 },
          { word: 'in!', start: 1.3, end: 2.0 },
          { word: 'Today', start: 2.5, end: 3.5 },
          { word: hint, start: 4.0, end: 14.8 },
        ],
      },
      {
        id: 'seg-2',
        start: 15.2,
        end: 38.6,
        text: 'Most creators fail because they lose seventy percent of their audience in the first three seconds. You need a contrarian hook immediately.',
        words: [
          { word: 'Most', start: 15.2, end: 16.0 },
          { word: 'creators', start: 16.1, end: 17.5 },
          { word: 'fail', start: 17.6, end: 19.0 },
          { word: 'hooks', start: 19.1, end: 38.6 },
        ],
      },
      {
        id: 'seg-3',
        start: 39.0,
        end: 68.4,
        text: 'Instead of complex fifteen-step sales funnels, focus on speed to lead. Responding within sixty seconds multiplies inbound conversion.',
        words: [
          { word: 'Instead', start: 39.0, end: 40.5 },
          { word: 'of', start: 40.6, end: 41.5 },
          { word: 'funnels', start: 41.6, end: 68.4 },
        ],
      },
      {
        id: 'seg-4',
        start: 69.0,
        end: Math.min(duration, 108.0),
        text: 'When you take a long-form interview and extract the single most actionable revelation into a vertical Short, the algorithm rewards organic reach.',
        words: [
          { word: 'Repurposing', start: 69.0, end: 72.0 },
          { word: 'into', start: 72.5, end: 75.0 },
          { word: 'Shorts', start: 75.5, end: 108.0 },
        ],
      },
    ];
  }

  // 3. In production with no transcription credentials:
  // Return empty array so caller provides manual timeline trimming without inventing fake transcripts.
  return [];
}

/**
 * Identifies coherent 30–60 second moments from timestamped transcript or actual video duration.
 * Uses real speech boundaries and keywords when transcript is present.
 * Uses real video duration time slicing when in manual mode.
 */
export function suggestCoherentMoments(
  transcript: TranscriptSegment[],
  totalDurationSeconds: number,
  videoTitle?: string
): Partial<ShortsClip>[] {
  const suggestions: Partial<ShortsClip>[] = [];
  const maxDuration = Math.max(15, totalDurationSeconds || 60);

  // Case A: Real Transcript Available
  if (transcript && transcript.length > 0) {
    let currentChunk: TranscriptSegment[] = [];
    let chunkStart = transcript[0].start;

    for (let i = 0; i < transcript.length; i++) {
      const seg = transcript[i];
      currentChunk.push(seg);
      const currentDuration = seg.end - chunkStart;

      // When a coherent group reaches between 30s and 60s
      if (currentDuration >= 30.0 || i === transcript.length - 1) {
        const start = Math.max(0, chunkStart);
        let end = Math.min(maxDuration, seg.end);
        let dur = end - start;

        // Ensure duration is between 15s and 60s
        if (dur < 15.0 && maxDuration >= 30.0) {
          end = Math.min(maxDuration, start + 30.0);
          dur = end - start;
        } else if (dur > 60.0) {
          end = start + 58.0;
          dur = 58.0;
        }

        const fullText = currentChunk.map((c) => c.text).join(' ').trim();
        const firstSentence = fullText.split(/[.?!]/)[0].trim();
        const titleCandidate =
          firstSentence.length > 55
            ? `${firstSentence.slice(0, 52)}...`
            : firstSentence || `${videoTitle || 'Key Moment'} Part ${suggestions.length + 1}`;

        // Calculate dynamic virality score based on engagement keywords
        let score = 82;
        if (/secret|mistake|why|how to|top|3x|growth|roi|never/i.test(fullText)) score += 8;
        if (/\?|\!|\d+%/i.test(fullText)) score += 5;
        score = Math.min(98, score);

        suggestions.push({
          title: titleCandidate,
          caption: `${fullText.slice(0, 120)}... #Shorts #Viral`,
          start_time: Math.round(start * 10) / 10,
          end_time: Math.round(end * 10) / 10,
          duration_seconds: Math.round(dur * 10) / 10,
          virality_score: score,
          hook_summary: firstSentence || 'High-impact conversational opener',
          crop_mode: 'blur_padding',
          subtitles_enabled: true,
          subtitles_style: {
            fontSize: 38,
            color: '#FFFFFF',
            background: 'rgba(0,0,0,0.75)',
            fontFamily: 'Inter',
            positionY: SHORTS_SPECS.DEFAULT_SUBTITLE_Y_PERCENT,
          },
          render_status: 'draft',
          render_progress: 0,
          validation_status: 'unverified',
        });

        // Reset for next chunk
        currentChunk = [];
        if (i + 1 < transcript.length) {
          chunkStart = transcript[i + 1].start;
        }
      }
    }
  }

  // Case B: No Transcript (Manual Trimming Mode)
  // Generate clean time slices across the real video duration
  if (suggestions.length === 0) {
    const sliceDuration = Math.min(45, Math.max(20, Math.floor(maxDuration / 3)));
    let currentStart = 0;
    let partNum = 1;

    while (currentStart + 15 <= maxDuration && suggestions.length < 3) {
      const end = Math.min(maxDuration, currentStart + sliceDuration);
      const dur = end - currentStart;

      const formatTime = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
      };

      suggestions.push({
        title: `${videoTitle || 'Video Clip'} (${formatTime(currentStart)} - ${formatTime(end)})`,
        caption: `Highlight from ${videoTitle || 'full video'}. Watch full breakdown. #Shorts #Viral`,
        start_time: Math.round(currentStart * 10) / 10,
        end_time: Math.round(end * 10) / 10,
        duration_seconds: Math.round(dur * 10) / 10,
        virality_score: 85,
        hook_summary: `Segment from ${formatTime(currentStart)} to ${formatTime(end)}`,
        crop_mode: 'blur_padding',
        subtitles_enabled: true,
        subtitles_style: {
          fontSize: 38,
          color: '#FFFFFF',
          background: 'rgba(0,0,0,0.75)',
          fontFamily: 'Inter',
          positionY: SHORTS_SPECS.DEFAULT_SUBTITLE_Y_PERCENT,
        },
        render_status: 'draft',
        render_progress: 0,
        validation_status: 'unverified',
      });

      currentStart = end;
      partNum++;
    }
  }

  return suggestions;
}

/**
 * Computes Framing and Subtitle safe margins for 1080x1920 vertical canvas.
 */
export function computeVerticalFraming(params: {
  sourceWidth: number;
  sourceHeight: number;
  cropMode: CropMode;
  targetWidth?: number;
  targetHeight?: number;
}): {
  targetWidth: number;
  targetHeight: number;
  scaleFactor: number;
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
  requiresBlurPadding: boolean;
  safeMarginTop: number;
  safeMarginBottom: number;
  background: {
    enabled: boolean;
    blurRadius: number;
  };
  subtitleSafeY: number;
} {
  const targetW = params.targetWidth || SHORTS_SPECS.TARGET_WIDTH;
  const targetH = params.targetHeight || SHORTS_SPECS.TARGET_HEIGHT;

  const sourceAspect = params.sourceWidth / params.sourceHeight;
  const targetAspect = targetW / targetH; // 9 / 16 = 0.5625

  let requiresBlur = false;
  let scaleFactor = 1;
  let cropX = 0;
  let cropY = 0;
  let cropWidth = params.sourceWidth;
  let cropHeight = params.sourceHeight;

  if (params.cropMode === 'blur_padding') {
    requiresBlur = sourceAspect > targetAspect; // e.g. 16:9 source in 9:16 canvas
    scaleFactor = targetW / params.sourceWidth;
  } else if (params.cropMode === 'smart_crop') {
    // Center crop 9:16 from source
    requiresBlur = false;
    cropWidth = Math.min(params.sourceWidth, Math.round(params.sourceHeight * targetAspect));
    cropHeight = params.sourceHeight;
    cropX = Math.round((params.sourceWidth - cropWidth) / 2);
    cropY = 0;
  } else {
    // Fit / letterbox
    requiresBlur = false;
    scaleFactor = Math.min(targetW / params.sourceWidth, targetH / params.sourceHeight);
  }

  const safeMarginTop = Math.round(targetH * (SHORTS_SPECS.SUBTITLE_SAFE_TOP_PERCENT / 100));
  const safeMarginBottom = Math.round(targetH * (SHORTS_SPECS.SUBTITLE_SAFE_BOTTOM_PERCENT / 100));

  return {
    targetWidth: targetW,
    targetHeight: targetH,
    scaleFactor,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    requiresBlurPadding: requiresBlur,
    safeMarginTop,
    safeMarginBottom,
    background: {
      enabled: requiresBlur,
      blurRadius: 24,
    },
    subtitleSafeY: Math.round(targetH * (SHORTS_SPECS.DEFAULT_SUBTITLE_Y_PERCENT / 100)),
  };
}
