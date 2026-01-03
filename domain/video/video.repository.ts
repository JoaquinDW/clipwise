/**
 * Video Repository Implementation
 * Handles data persistence for videos using Prisma
 */

import { prismaClientGlobal } from '@/infra/prisma';
import { Video, VideoProps } from './video.entity';
import { IVideoRepository } from './video.port';
import { VideoStatus } from '@prisma/client';

export class VideoRepository implements IVideoRepository {
  async create(data: Partial<VideoProps>): Promise<Video> {
    const video = await prismaClientGlobal.video.create({
      data: {
        companyId: data.companyId!,
        title: data.title!,
        description: data.description,
        source: data.source || 'UPLOAD',
        sourceUrl: data.sourceUrl,
        storageUrl: data.storageUrl,
        thumbnailUrl: data.thumbnailUrl,
        duration: data.duration,
        status: data.status || 'UPLOADING',
        metadata: data.metadata,
      },
    });

    return new Video(video as VideoProps);
  }

  async findById(id: string): Promise<Video | null> {
    const video = await prismaClientGlobal.video.findUnique({
      where: { id },
      include: {
        transcription: true,
        clips: true,
      },
    });

    if (!video) return null;
    return new Video(video as VideoProps);
  }

  async findByCompanyId(companyId: string): Promise<Video[]> {
    const videos = await prismaClientGlobal.video.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      include: {
        transcription: true,
        clips: true,
      },
    });

    return videos.map((v) => new Video(v as VideoProps));
  }

  async findByStatus(status: VideoStatus): Promise<Video[]> {
    const videos = await prismaClientGlobal.video.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
    });

    return videos.map((v) => new Video(v as VideoProps));
  }

  async update(id: string, data: Partial<VideoProps>): Promise<Video> {
    const video = await prismaClientGlobal.video.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        sourceUrl: data.sourceUrl,
        storageUrl: data.storageUrl,
        thumbnailUrl: data.thumbnailUrl,
        duration: data.duration,
        status: data.status,
        errorMessage: data.errorMessage,
        metadata: data.metadata,
      },
    });

    return new Video(video as VideoProps);
  }

  async delete(id: string): Promise<void> {
    await prismaClientGlobal.video.delete({
      where: { id },
    });
  }

  async updateStatus(
    id: string,
    status: VideoStatus,
    errorMessage?: string
  ): Promise<Video> {
    const video = await prismaClientGlobal.video.update({
      where: { id },
      data: {
        status,
        errorMessage,
      },
    });

    return new Video(video as VideoProps);
  }
}
