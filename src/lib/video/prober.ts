import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execFileAsync = promisify(execFile);

function getFfprobePath(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ffprobe = require('@ffprobe-installer/ffprobe');
    if (ffprobe?.path && fs.existsSync(ffprobe.path)) {
      return ffprobe.path;
    }
  } catch {
    // Fall back to system PATH
  }
  return 'ffprobe';
}

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

export interface VideoMetadata {
  durationSeconds: number;
  width: number;
  height: number;
  aspectRatio: string;
  hasVideo: boolean;
  hasAudio: boolean;
  videoCodec?: string;
  audioCodec?: string;
  fileSizeBytes?: number;
  bitrate?: number;
  fps?: number;
  isDecodedSuccessfully: boolean;
  errors?: string[];
}

/**
 * Extracts real duration, resolution, audio/video streams, and encoding metadata from a video file using ffprobe.
 */
export async function probeVideoFile(filePath: string): Promise<VideoMetadata> {
  const ffprobePath = getFfprobePath();

  try {
    const { stdout } = await execFileAsync(
      ffprobePath,
      [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        filePath,
      ],
      { timeout: 30000 }
    );

    const data = JSON.parse(stdout);
    const videoStream = data.streams?.find((s: any) => s.codec_type === 'video');
    const audioStream = data.streams?.find((s: any) => s.codec_type === 'audio');

    const width = Number(videoStream?.width || 0);
    const height = Number(videoStream?.height || 0);
    const duration =
      parseFloat(videoStream?.duration || data.format?.duration || audioStream?.duration || '0');

    let fps = 30;
    if (videoStream?.r_frame_rate) {
      const parts = videoStream.r_frame_rate.split('/');
      if (parts.length === 2 && Number(parts[1]) > 0) {
        fps = Math.round(Number(parts[0]) / Number(parts[1]));
      }
    }

    let aspectRatio = '16:9';
    if (width > 0 && height > 0) {
      const ratio = width / height;
      if (Math.abs(ratio - 9 / 16) < 0.05) {
        aspectRatio = '9:16';
      } else if (Math.abs(ratio - 1) < 0.05) {
        aspectRatio = '1:1';
      } else if (Math.abs(ratio - 4 / 5) < 0.05) {
        aspectRatio = '4:5';
      }
    }

    const hasVideo = Boolean(videoStream && width > 0 && height > 0);
    const hasAudio = Boolean(audioStream && Number(audioStream.channels || 1) > 0);

    return {
      durationSeconds: Math.round(duration * 100) / 100,
      width,
      height,
      aspectRatio,
      hasVideo,
      hasAudio,
      videoCodec: videoStream?.codec_name,
      audioCodec: audioStream?.codec_name,
      fileSizeBytes: data.format?.size ? parseInt(data.format.size, 10) : undefined,
      bitrate: data.format?.bit_rate ? parseInt(data.format.bit_rate, 10) : undefined,
      fps,
      isDecodedSuccessfully: hasVideo,
    };
  } catch (err: any) {
    // If ffprobe fails on non-existent file or corrupted header
    return {
      durationSeconds: 0,
      width: 0,
      height: 0,
      aspectRatio: 'unknown',
      hasVideo: false,
      hasAudio: false,
      isDecodedSuccessfully: false,
      errors: [err.message || 'Failed to probe video file with ffprobe'],
    };
  }
}

/**
 * Performs a complete decode test of the video and audio streams using ffmpeg to ensure no stream corruption.
 */
export async function verifyVideoDecodable(filePath: string): Promise<{
  decodable: boolean;
  error?: string;
}> {
  const ffmpegPath = getFfmpegPath();

  try {
    await execFileAsync(
      ffmpegPath,
      [
        '-v', 'error',
        '-i', filePath,
        '-f', 'null',
        '-',
      ],
      { timeout: 45000 }
    );

    return { decodable: true };
  } catch (err: any) {
    return {
      decodable: false,
      error: err.stderr || err.message || 'FFmpeg decoding test failed',
    };
  }
}
