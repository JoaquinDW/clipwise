/**
 * Video Entity
 * Domain model for video objects
 */

import { VideoSource, VideoStatus } from '@prisma/client';

export interface VideoProps {
  id: string;
  companyId: string;
  title: string;
  description?: string;
  source: VideoSource;
  sourceUrl?: string;
  storageUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  status: VideoStatus;
  errorMessage?: string;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export class Video {
  constructor(private props: VideoProps) {}

  get id() {
    return this.props.id;
  }

  get companyId() {
    return this.props.companyId;
  }

  get title() {
    return this.props.title;
  }

  get description() {
    return this.props.description;
  }

  get source() {
    return this.props.source;
  }

  get sourceUrl() {
    return this.props.sourceUrl;
  }

  get storageUrl() {
    return this.props.storageUrl;
  }

  get thumbnailUrl() {
    return this.props.thumbnailUrl;
  }

  get duration() {
    return this.props.duration;
  }

  get status() {
    return this.props.status;
  }

  get errorMessage() {
    return this.props.errorMessage;
  }

  get metadata() {
    return this.props.metadata;
  }

  get createdAt() {
    return this.props.createdAt;
  }

  get updatedAt() {
    return this.props.updatedAt;
  }

  // Business logic methods
  isReady(): boolean {
    return this.props.status === 'READY';
  }

  isFailed(): boolean {
    return this.props.status === 'FAILED';
  }

  isProcessing(): boolean {
    return (
      this.props.status === 'TRANSCRIBING' || this.props.status === 'PROCESSING'
    );
  }

  canGenerateClips(): boolean {
    return this.props.status === 'TRANSCRIBED' || this.props.status === 'READY';
  }
}
