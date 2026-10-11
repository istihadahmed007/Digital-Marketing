import { ClipValidationResult } from '@/lib/types/shorts';
import { probeVideoFile } from './prober';
import { validateVideoClip } from './validator';

/**
 * Inspects a real rendered video file on disk with ffprobe, volumedetect, and frame luminance analysis.
 * Verifies that the actual rendered file is non-empty, audible, visible, properly formatted, and decodable.
 */
export async function inspectAndValidateVideoFile(filePath: string): Promise<ClipValidationResult> {
  const metadata = await probeVideoFile(filePath);
  return validateVideoClip({
    durationSeconds: metadata.durationSeconds,
    width: metadata.width,
    height: metadata.height,
    hasAudio: metadata.hasAudio,
    hasVideo: metadata.hasVideo,
    audioRmsLevel: metadata.audioRmsLevel,
    luminanceVariance: metadata.luminanceVariance,
    isDecoded: metadata.isDecodedSuccessfully,
    fileSizeBytes: metadata.fileSizeBytes,
  });
}
