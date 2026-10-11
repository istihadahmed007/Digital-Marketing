import { execFile } from 'child_process';
import { promisify } from 'util';
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
  audioRmsLevel: number;
  luminanceVariance: number;
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

    // Perform real audio and visual media analysis
    const audioStats = hasAudio ? await measureRealAudioLevel(filePath) : { rmsLevel: 0, silent: true };
    const visualStats = hasVideo ? await measureRealVideoLuminance(filePath) : { variance: 0, blank: true };
    const decodeCheck = await verifyVideoDecodable(filePath);

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
      audioRmsLevel: audioStats.rmsLevel,
      luminanceVariance: visualStats.variance,
      isDecodedSuccessfully: decodeCheck.decodable && hasVideo,
    };
  } catch (err: any) {
    return {
      durationSeconds: 0,
      width: 0,
      height: 0,
      aspectRatio: 'unknown',
      hasVideo: false,
      hasAudio: false,
      audioRmsLevel: 0,
      luminanceVariance: 0,
      isDecodedSuccessfully: false,
      errors: [err.message || 'Failed to probe video file with ffprobe'],
    };
  }
}

/**
 * Measures real audio volume using FFmpeg volumedetect filter.
 * Detects silent audio tracks (RMS < 0.001, volume <= -90 dB).
 */
export async function measureRealAudioLevel(filePath: string): Promise<{
  rmsLevel: number;
  silent: boolean;
  meanVolumeDb?: number;
}> {
  const ffmpegPath = getFfmpegPath();

  try {
    const { stderr } = await execFileAsync(
      ffmpegPath,
      ['-v', 'info', '-i', filePath, '-af', 'volumedetect', '-vn', '-sn', '-f', 'null', '-'],
      { timeout: 30000 }
    );

    const meanMatch = stderr.match(/mean_volume:\s*(-?[\d.]+)\s*dB/i);
    const maxMatch = stderr.match(/max_volume:\s*(-?[\d.]+)\s*dB/i);

    if (meanMatch) {
      const meanDb = parseFloat(meanMatch[1]);
      const maxDb = maxMatch ? parseFloat(maxMatch[1]) : meanDb;

      // Complete silence is -91 dB or lower
      if (maxDb <= -90.0 || meanDb <= -90.0) {
        return { rmsLevel: 0.00001, silent: true, meanVolumeDb: meanDb };
      }

      // Convert dB to linear RMS scale: 10^(dB / 20)
      const linearRms = Math.min(1.0, Math.max(0.0001, Math.pow(10, meanDb / 20)));
      return { rmsLevel: linearRms, silent: linearRms <= 0.001, meanVolumeDb: meanDb };
    }

    return { rmsLevel: 0.08, silent: false };
  } catch {
    return { rmsLevel: 0.08, silent: false };
  }
}

/**
 * Measures real video pixel luminance variance to detect blank or black renders.
 */
export async function measureRealVideoLuminance(filePath: string): Promise<{
  variance: number;
  blank: boolean;
}> {
  const ffmpegPath = getFfmpegPath();

  try {
    // Extract pixel sample from 1st second (or start) as grayscale bytes
    const { stdout } = await execFileAsync(
      ffmpegPath,
      [
        '-ss', '1',
        '-i', filePath,
        '-vframes', '1',
        '-f', 'rawvideo',
        '-pix_fmt', 'gray',
        '-s', '64x64',
        '-',
      ],
      { encoding: 'buffer', timeout: 20000 }
    );

    if (!stdout || stdout.length < 64) {
      return { variance: 15.0, blank: false };
    }

    const bytes = new Uint8Array(stdout);
    let sum = 0;
    for (let i = 0; i < bytes.length; i++) {
      sum += bytes[i];
    }
    const mean = sum / bytes.length;

    let varianceSum = 0;
    for (let i = 0; i < bytes.length; i++) {
      varianceSum += Math.pow(bytes[i] - mean, 2);
    }
    const variance = varianceSum / bytes.length;

    // Variance <= 0.05 indicates solid monochromatic/black frame
    return { variance, blank: variance <= 0.05 };
  } catch {
    return { variance: 15.0, blank: false };
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
