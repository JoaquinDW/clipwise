/**
 * Video Storage Service
 *
 * This module handles video upload/download to cloud storage.
 * Supports Supabase Storage (recommended) and AWS S3.
 */

import { createClient } from '@supabase/supabase-js';

/**
 * Storage provider type
 */
export type StorageProvider = 'supabase' | 's3';

/**
 * Upload result
 */
export interface UploadResult {
  url: string; // Public URL to access the file
  path: string; // Storage path/key
  size: number; // File size in bytes
}

/**
 * Storage configuration
 */
interface StorageConfig {
  provider: StorageProvider;
  supabase?: {
    url: string;
    key: string;
  };
  s3?: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    bucket: string;
  };
}

/**
 * Get storage configuration from environment
 */
function getStorageConfig(): StorageConfig {
  // Default to Supabase if available
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return {
      provider: 'supabase',
      supabase: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        key: process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
    };
  }

  // Fallback to S3 if configured
  if (
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_REGION &&
    process.env.AWS_S3_BUCKET
  ) {
    return {
      provider: 's3',
      s3: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION,
        bucket: process.env.AWS_S3_BUCKET,
      },
    };
  }

  throw new Error(
    'No storage provider configured. Please set up Supabase or AWS S3 credentials in .env'
  );
}

/**
 * Supabase Storage Client
 */
class SupabaseStorage {
  private client;
  private buckets = {
    videos: 'videos',
    clips: 'clips',
    thumbnails: 'thumbnails',
  };

  constructor(config: { url: string; key: string }) {
    this.client = createClient(config.url, config.key);
  }

  async uploadVideo(
    file: File | Blob,
    companyId: string,
    videoId: string
  ): Promise<UploadResult> {
    const fileName = `${companyId}/${videoId}/original.mp4`;
    const { data, error } = await this.client.storage
      .from(this.buckets.videos)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      throw new Error(`Failed to upload video: ${error.message}`);
    }

    const {
      data: { publicUrl },
    } = this.client.storage.from(this.buckets.videos).getPublicUrl(fileName);

    return {
      url: publicUrl,
      path: data.path,
      size: file.size,
    };
  }

  async uploadClip(
    file: File | Blob,
    companyId: string,
    videoId: string,
    clipId: string
  ): Promise<UploadResult> {
    const fileName = `${companyId}/${videoId}/${clipId}.mp4`;
    const { data, error } = await this.client.storage
      .from(this.buckets.clips)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      throw new Error(`Failed to upload clip: ${error.message}`);
    }

    const {
      data: { publicUrl },
    } = this.client.storage.from(this.buckets.clips).getPublicUrl(fileName);

    return {
      url: publicUrl,
      path: data.path,
      size: file.size,
    };
  }

  async uploadThumbnail(
    file: File | Blob,
    companyId: string,
    videoId: string,
    clipId?: string
  ): Promise<UploadResult> {
    const fileName = clipId
      ? `${companyId}/${videoId}/${clipId}.jpg`
      : `${companyId}/${videoId}/thumbnail.jpg`;

    const { data, error } = await this.client.storage
      .from(this.buckets.thumbnails)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      throw new Error(`Failed to upload thumbnail: ${error.message}`);
    }

    const {
      data: { publicUrl },
    } = this.client.storage.from(this.buckets.thumbnails).getPublicUrl(fileName);

    return {
      url: publicUrl,
      path: data.path,
      size: file.size,
    };
  }

  async downloadVideo(path: string): Promise<Blob> {
    const { data, error } = await this.client.storage
      .from(this.buckets.videos)
      .download(path);

    if (error) {
      throw new Error(`Failed to download video: ${error.message}`);
    }

    return data;
  }

  async deleteVideo(path: string): Promise<void> {
    const { error } = await this.client.storage
      .from(this.buckets.videos)
      .remove([path]);

    if (error) {
      throw new Error(`Failed to delete video: ${error.message}`);
    }
  }

  async deleteClip(path: string): Promise<void> {
    const { error } = await this.client.storage
      .from(this.buckets.clips)
      .remove([path]);

    if (error) {
      throw new Error(`Failed to delete clip: ${error.message}`);
    }
  }
}

/**
 * S3 Storage Client (placeholder for future implementation)
 */
class S3Storage {
  constructor(config: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    bucket: string;
  }) {
    // TODO: Implement S3 client using AWS SDK
    throw new Error('S3 storage not yet implemented. Use Supabase Storage.');
  }

  async uploadVideo(
    file: File | Blob,
    companyId: string,
    videoId: string
  ): Promise<UploadResult> {
    throw new Error('S3 storage not yet implemented');
  }

  async uploadClip(
    file: File | Blob,
    companyId: string,
    videoId: string,
    clipId: string
  ): Promise<UploadResult> {
    throw new Error('S3 storage not yet implemented');
  }

  async uploadThumbnail(
    file: File | Blob,
    companyId: string,
    videoId: string,
    clipId?: string
  ): Promise<UploadResult> {
    throw new Error('S3 storage not yet implemented');
  }
}

/**
 * Get storage client based on configuration
 */
export function getStorageClient() {
  const config = getStorageConfig();

  if (config.provider === 'supabase' && config.supabase) {
    return new SupabaseStorage(config.supabase);
  }

  if (config.provider === 's3' && config.s3) {
    return new S3Storage(config.s3);
  }

  throw new Error('Invalid storage configuration');
}

/**
 * Validate video file
 */
export function validateVideoFile(file: File): {
  valid: boolean;
  error?: string;
} {
  const maxSizeMB = parseInt(process.env.MAX_VIDEO_SIZE_MB || '500', 10);
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File size exceeds ${maxSizeMB}MB limit`,
    };
  }

  const allowedTypes = [
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska',
  ];

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: MP4, MOV, AVI, MKV`,
    };
  }

  return { valid: true };
}
