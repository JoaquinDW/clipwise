/**
 * Video Use Cases
 * Business logic for video operations
 */

import { VideoRepository } from './video.repository';
import { Video } from './video.entity';
import { VideoSource, VideoStatus } from '@prisma/client';

/**
 * Create a new video record
 */
export class CreateVideo {
  private repository = new VideoRepository();

  async execute(params: {
    companyId: string;
    title: string;
    description?: string;
    source: VideoSource;
    sourceUrl?: string;
  }): Promise<Video> {
    return await this.repository.create({
      companyId: params.companyId,
      title: params.title,
      description: params.description,
      source: params.source,
      sourceUrl: params.sourceUrl,
      status: 'UPLOADING',
    });
  }
}

/**
 * Get video by ID
 */
export class GetVideo {
  private repository = new VideoRepository();

  async execute(videoId: string): Promise<Video | null> {
    return await this.repository.findById(videoId);
  }
}

/**
 * Get all videos for a company
 */
export class GetCompanyVideos {
  private repository = new VideoRepository();

  async execute(companyId: string): Promise<Video[]> {
    return await this.repository.findByCompanyId(companyId);
  }
}

/**
 * Update video status
 */
export class UpdateVideoStatus {
  private repository = new VideoRepository();

  async execute(
    videoId: string,
    status: VideoStatus,
    errorMessage?: string
  ): Promise<Video> {
    return await this.repository.updateStatus(videoId, status, errorMessage);
  }
}

/**
 * Update video metadata after upload
 */
export class UpdateVideoMetadata {
  private repository = new VideoRepository();

  async execute(params: {
    videoId: string;
    storageUrl: string;
    duration: number;
    thumbnailUrl?: string;
  }): Promise<Video> {
    return await this.repository.update(params.videoId, {
      storageUrl: params.storageUrl,
      duration: params.duration,
      thumbnailUrl: params.thumbnailUrl,
      status: 'UPLOADED',
    });
  }
}

/**
 * Delete a video
 */
export class DeleteVideo {
  private repository = new VideoRepository();

  async execute(videoId: string): Promise<void> {
    // TODO: Also delete from storage (Supabase/S3)
    // TODO: Delete associated clips, transcriptions, jobs
    await this.repository.delete(videoId);
  }
}

/**
 * Get videos ready for processing
 */
export class GetVideosForProcessing {
  private repository = new VideoRepository();

  async execute(): Promise<Video[]> {
    return await this.repository.findByStatus('UPLOADED');
  }
}

/**
 * Regenerate clips for a video that already has transcription
 * This will delete existing clips and regenerate new ones
 */
export class RegenerateClips {
  private repository = new VideoRepository();

  async execute(videoId: string): Promise<Video> {
    // Get video with transcription and clips
    const video = await this.repository.findById(videoId);

    if (!video) {
      throw new Error('Video not found');
    }

    // Validate video status - can only regenerate from these states
    const allowedStatuses: VideoStatus[] = ['READY', 'FAILED', 'TRANSCRIBED'];
    if (!allowedStatuses.includes(video.props.status)) {
      throw new Error(
        `Cannot regenerate clips from status ${video.props.status}. Video must be READY, FAILED, or TRANSCRIBED.`
      );
    }

    // For READY and TRANSCRIBED videos, ensure transcription exists
    if (video.props.status !== 'FAILED' && !video.props.transcription) {
      throw new Error('Cannot regenerate clips: transcription not found. Use retry instead.');
    }

    // Delete existing clips (Prisma cascade will handle this)
    const { prismaClientGlobal } = await import('@/infra/prisma');
    await prismaClientGlobal.clip.deleteMany({
      where: { videoId },
    });

    // Reset video status to TRANSCRIBED and clear error
    return await this.repository.updateStatus(videoId, 'TRANSCRIBED', null);
  }
}

/**
 * Retry video processing from scratch
 * This will delete transcription and clips, then restart the full pipeline
 */
export class RetryVideoProcessing {
  private repository = new VideoRepository();

  async execute(videoId: string): Promise<Video> {
    // Get video
    const video = await this.repository.findById(videoId);

    if (!video) {
      throw new Error('Video not found');
    }

    // This is primarily for FAILED videos, but allow any status
    // User might want to completely restart processing

    // Delete existing data
    const { prismaClientGlobal } = await import('@/infra/prisma');

    // Delete transcription (cascade will delete segments)
    if (video.props.transcription) {
      await prismaClientGlobal.transcription.delete({
        where: { videoId },
      });
    }

    // Delete clips
    await prismaClientGlobal.clip.deleteMany({
      where: { videoId },
    });

    // Reset video status to UPLOADED and clear error
    return await this.repository.updateStatus(videoId, 'UPLOADED', null);
  }
}
