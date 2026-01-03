/**
 * Video Port (Repository Interface)
 * Defines the contract for video data access
 */

import { Video } from './video.entity';
import { VideoStatus } from '@prisma/client';

export interface IVideoRepository {
  create(video: Partial<Video>): Promise<Video>;
  findById(id: string): Promise<Video | null>;
  findByCompanyId(companyId: string): Promise<Video[]>;
  findByStatus(status: VideoStatus): Promise<Video[]>;
  update(id: string, data: Partial<Video>): Promise<Video>;
  delete(id: string): Promise<void>;
  updateStatus(id: string, status: VideoStatus, errorMessage?: string): Promise<Video>;
}
