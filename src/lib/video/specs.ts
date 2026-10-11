import { CropMode } from '@/lib/types/shorts';

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
    requiresBlur = sourceAspect > targetAspect; // Standard landscape needs blur padding on top/bottom
    scaleFactor = targetW / params.sourceWidth;
  } else if (params.cropMode === 'center_crop' || params.cropMode === 'smart_crop') {
    // 9:16 Center Crop: Cut off side margins to fill vertical frame
    cropWidth = Math.round(params.sourceHeight * targetAspect);
    cropHeight = params.sourceHeight;
    cropX = Math.round((params.sourceWidth - cropWidth) / 2);
    cropY = 0;
  } else {
    // Fit with black bars
    scaleFactor = Math.min(targetW / params.sourceWidth, targetH / params.sourceHeight);
  }

  const safeMarginTop = Math.round(targetH * (SHORTS_SPECS.SUBTITLE_SAFE_TOP_PERCENT / 100));
  const safeMarginBottom = Math.round(targetH * (SHORTS_SPECS.SUBTITLE_SAFE_BOTTOM_PERCENT / 100));
  const subtitleSafeY = Math.round(targetH * (SHORTS_SPECS.DEFAULT_SUBTITLE_Y_PERCENT / 100));

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
      blurRadius: requiresBlur ? 24 : 0,
    },
    subtitleSafeY,
  };
}
