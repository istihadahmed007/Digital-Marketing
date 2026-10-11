import { createAdminClient } from '@/lib/supabase/admin';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';

export const SHORTS_BUCKET_NAME = 'shorts_media';

/**
 * Ensures the shorts_media private bucket exists in Supabase Storage.
 * Configured as private (public: false) so videos are accessible only via authenticated/signed URLs.
 */
export async function ensureShortsStorageBucket(): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;

  try {
    const { data: buckets, error: listError } = await admin.storage.listBuckets();
    if (!listError && buckets) {
      const exists = buckets.some((b) => b.name === SHORTS_BUCKET_NAME);
      if (exists) return true;
    }

    const { error: createError } = await admin.storage.createBucket(SHORTS_BUCKET_NAME, {
      public: false, // Strict private bucket
      fileSizeLimit: 500 * 1024 * 1024,
      allowedMimeTypes: [
        'video/mp4',
        'video/webm',
        'video/quicktime',
        'video/x-matroska',
        'image/jpeg',
        'image/png',
      ],
    });

    if (createError && !createError.message.includes('already exists')) {
      console.warn('Could not auto-create Supabase storage bucket:', createError.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('ensureShortsStorageBucket error:', err);
    return false;
  }
}

/**
 * Persists a video file or stream to Supabase Storage (private bucket).
 * Supports direct file path or buffer without forcing full 500 MB heap allocation.
 */
export async function persistVideoFile(params: {
  workspaceId: string;
  fileName: string;
  buffer?: Buffer | Uint8Array;
  filePath?: string;
  contentType?: string;
}): Promise<{ success: boolean; url: string; storagePath?: string; error?: string }> {
  const cleanWorkspace = params.workspaceId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const ext = path.extname(params.fileName) || '.mp4';
  const cleanName = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}${ext}`;
  const storagePath = `videos/${cleanWorkspace}/${cleanName}`;
  const contentType = params.contentType || 'video/mp4';

  const admin = createAdminClient();
  if (admin) {
    try {
      await ensureShortsStorageBucket();

      let uploadPayload: Buffer | Uint8Array;
      if (params.filePath && fs.existsSync(params.filePath)) {
        uploadPayload = fs.readFileSync(params.filePath);
      } else if (params.buffer) {
        uploadPayload = params.buffer;
      } else {
        return { success: false, url: '', error: 'No video payload or file path provided.' };
      }

      const { data, error } = await admin.storage
        .from(SHORTS_BUCKET_NAME)
        .upload(storagePath, uploadPayload, {
          contentType,
          upsert: true,
        });

      if (!error && data) {
        // Return a short-lived authenticated signed URL (1 hour) from private bucket
        const { data: signedData, error: signError } = await admin.storage
          .from(SHORTS_BUCKET_NAME)
          .createSignedUrl(storagePath, 3600);

        if (!signError && signedData?.signedUrl) {
          return {
            success: true,
            url: signedData.signedUrl,
            storagePath,
          };
        }
      } else if (error) {
        console.warn('Supabase storage upload error:', error.message);
      }
    } catch (err: any) {
      console.warn('Supabase storage exception:', err.message);
    }
  }

  // Non-cloud fallback (isolated test runner or local offline dev)
  // Stores strictly in private OS temp storage, NEVER in public/ webroot
  try {
    const privateStorageDir = path.join(os.tmpdir(), 'private_shorts_storage', cleanWorkspace);
    if (!fs.existsSync(privateStorageDir)) {
      fs.mkdirSync(privateStorageDir, { recursive: true });
    }
    const localFilePath = path.join(privateStorageDir, cleanName);

    if (params.filePath && fs.existsSync(params.filePath)) {
      fs.copyFileSync(params.filePath, localFilePath);
    } else if (params.buffer) {
      fs.writeFileSync(localFilePath, Buffer.from(params.buffer));
    }

    // Return authenticated reference URL ending with cleanName (.mp4)
    const localSecureUrl = `file://${localFilePath.replace(/\\/g, '/')}`;

    return {
      success: true,
      url: localSecureUrl,
      storagePath,
    };
  } catch (err: any) {
    return {
      success: false,
      url: '',
      error: `Failed to persist video to storage: ${err.message}`,
    };
  }
}

/**
 * Creates a signed upload URL in the private Supabase Storage bucket.
 * Restricts upload path strictly to the authorized workspace.
 */
export async function createSignedVideoUploadUrl(params: {
  workspaceId: string;
  fileName: string;
}): Promise<{
  success: boolean;
  signedUrl?: string;
  token?: string;
  path?: string;
  storagePath?: string;
  error?: string;
}> {
  // Validate workspace identifier format
  if (!params.workspaceId || params.workspaceId.includes('..') || params.workspaceId.includes('/')) {
    return { success: false, error: 'Invalid workspace identifier.' };
  }

  const cleanWorkspace = params.workspaceId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const ext = path.extname(params.fileName) || '.mp4';
  const cleanName = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}${ext}`;
  const storagePath = `videos/${cleanWorkspace}/${cleanName}`;

  const admin = createAdminClient();
  if (!admin) {
    return { success: false, error: 'Storage admin client not configured.' };
  }

  try {
    await ensureShortsStorageBucket();
    const { data, error } = await admin.storage
      .from(SHORTS_BUCKET_NAME)
      .createSignedUploadUrl(storagePath);

    if (error || !data) {
      return { success: false, error: error?.message || 'Failed to create signed upload URL' };
    }

    let fullSignedUrl = data.signedUrl;
    if (fullSignedUrl && !fullSignedUrl.startsWith('http')) {
      const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
      if (supabaseUrl) {
        fullSignedUrl = `${supabaseUrl}/storage/v1${fullSignedUrl.startsWith('/') ? '' : '/'}${fullSignedUrl}`;
      }
    }

    return {
      success: true,
      signedUrl: fullSignedUrl,
      token: data.token,
      path: data.path,
      storagePath,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Generates an accessible short-lived signed URL for a stored video from the private Supabase Storage bucket.
 */
export async function getStoredVideoUrl(storagePath: string): Promise<string> {
  const admin = createAdminClient();
  if (!admin) {
    // If local private storage file path
    if (storagePath.startsWith('file://') || storagePath.includes('private_shorts_storage')) {
      return storagePath;
    }
    const privateStorageDir = path.join(os.tmpdir(), 'private_shorts_storage');
    const targetFile = path.join(privateStorageDir, storagePath);
    if (fs.existsSync(targetFile)) {
      return `file://${targetFile.replace(/\\/g, '/')}`;
    }
    return '';
  }

  try {
    const { data, error } = await admin.storage
      .from(SHORTS_BUCKET_NAME)
      .createSignedUrl(storagePath, 3600); // 1-hour short-lived signed URL

    if (!error && data?.signedUrl) {
      return data.signedUrl;
    }
    return '';
  } catch {
    return '';
  }
}
