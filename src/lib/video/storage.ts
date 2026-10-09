import { createAdminClient } from '@/lib/supabase/admin';
import path from 'path';
import fs from 'fs';

export const SHORTS_BUCKET_NAME = 'shorts_media';

/**
 * Ensures the shorts_media bucket exists in Supabase Storage.
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
      public: true,
      fileSizeLimit: 500 * 1024 * 1024,
      allowedMimeTypes: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska', 'image/jpeg', 'image/png'],
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
 * Uploads a video file or binary buffer to Supabase Storage (with local public/ fallback).
 */
export async function persistVideoFile(params: {
  workspaceId: string;
  fileName: string;
  buffer: Buffer | Uint8Array;
  contentType?: string;
}): Promise<{ success: boolean; url: string; storagePath?: string; error?: string }> {
  const cleanWorkspace = params.workspaceId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const ext = path.extname(params.fileName) || '.mp4';
  const cleanName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
  const storagePath = `videos/${cleanWorkspace}/${cleanName}`;
  const contentType = params.contentType || 'video/mp4';

  const admin = createAdminClient();
  if (admin) {
    try {
      await ensureShortsStorageBucket();

      const { data, error } = await admin.storage
        .from(SHORTS_BUCKET_NAME)
        .upload(storagePath, params.buffer, {
          contentType,
          upsert: true,
        });

      if (!error && data) {
        // Retrieve public URL
        const { data: pubData } = admin.storage
          .from(SHORTS_BUCKET_NAME)
          .getPublicUrl(storagePath);

        if (pubData?.publicUrl) {
          return {
            success: true,
            url: pubData.publicUrl,
            storagePath,
          };
        }
      } else if (error) {
        console.warn('Supabase storage upload returned error, falling back to local:', error.message);
      }
    } catch (err: any) {
      console.warn('Supabase storage exception, falling back to local disk:', err.message);
    }
  }

  // Fallback: Store locally in public/uploads/videos/
  try {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'videos');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const localFilePath = path.join(uploadDir, cleanName);
    fs.writeFileSync(localFilePath, Buffer.from(params.buffer));

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') || '';
    const localUrl = `${siteUrl}/uploads/videos/${cleanName}`;

    return {
      success: true,
      url: localUrl,
      storagePath: cleanName,
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
 * Creates a signed upload URL in Supabase Storage so large video files (up to 500 MB)
 * can be uploaded directly from the browser without buffering through Next.js server memory.
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
  const cleanWorkspace = params.workspaceId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const ext = path.extname(params.fileName) || '.mp4';
  const cleanName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
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

    return {
      success: true,
      signedUrl: data.signedUrl,
      token: data.token,
      path: data.path,
      storagePath,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Generates an accessible URL for a stored video in Supabase Storage.
 */
export async function getStoredVideoUrl(storagePath: string): Promise<string> {
  const admin = createAdminClient();
  if (!admin) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') || '';
    return `${siteUrl}/uploads/videos/${storagePath}`;
  }

  try {
    const { data } = admin.storage.from(SHORTS_BUCKET_NAME).getPublicUrl(storagePath);
    if (data?.publicUrl) {
      return data.publicUrl;
    }

    const { data: signed } = await admin.storage
      .from(SHORTS_BUCKET_NAME)
      .createSignedUrl(storagePath, 86400);
    return signed?.signedUrl || '';
  } catch {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') || '';
    return `${siteUrl}/uploads/videos/${storagePath}`;
  }
}

