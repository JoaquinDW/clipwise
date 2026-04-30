import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Shared Redis connection for workers (maxRetriesPerRequest must be null for BullMQ)
export function createRedisConnection() {
  return new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
  });
}

export const QUEUE_NAME = 'video-pipeline';

export type JobName = 'ingest' | 'transcribe' | 'transcribe-chunk' | 'analyze' | 'clip';

export interface IngestJobData {
  videoId: string;
  sourceUrl: string;
  source: 'YOUTUBE' | 'UPLOAD' | 'TWITCH' | 'KICK';
}

export interface TranscribeJobData {
  videoId: string;
}

export interface TranscribeChunkJobData {
  videoId: string;
  chunkId: string;
  chunkIndex: number;
  totalChunks: number;
}

export interface AnalyzeJobData {
  videoId: string;
}

export interface ClipJobData {
  videoId: string;
  clipId: string;
}

export type JobData = IngestJobData | TranscribeJobData | TranscribeChunkJobData | AnalyzeJobData | ClipJobData;

let pipelineQueue: Queue | null = null;

export function getPipelineQueue(): Queue {
  if (!pipelineQueue) {
    pipelineQueue = new Queue(QUEUE_NAME, { connection: createRedisConnection() });
  }
  return pipelineQueue;
}

export async function enqueueIngest(data: IngestJobData) {
  return getPipelineQueue().add('ingest', data, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } });
}

export async function enqueueTranscribe(data: TranscribeJobData) {
  return getPipelineQueue().add('transcribe', data, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } });
}

export async function enqueueAnalyze(data: AnalyzeJobData) {
  return getPipelineQueue().add('analyze', data, { attempts: 2, backoff: { type: 'fixed', delay: 3000 } });
}

export async function enqueueTranscribeChunk(data: TranscribeChunkJobData) {
  return getPipelineQueue().add('transcribe-chunk', data, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } });
}

export async function enqueueClip(data: ClipJobData) {
  return getPipelineQueue().add('clip', data, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } });
}
