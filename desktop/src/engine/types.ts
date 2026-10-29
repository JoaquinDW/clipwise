import type { CropStrategy, LayoutRegion, LayoutType } from '@/lib/ai/highlight-schema';
import type { CaptionPosition, CaptionSize, CaptionStyleName } from '@/lib/captions/presets';
import type { RenderFallback } from '@/lib/video/processor';

export type VideoSource = 'youtube' | 'url' | 'file';

export type VideoStatus = 'queued' | 'downloading' | 'transcribing' | 'ready' | 'failed';

export interface VideoRecord {
  id: string;
  title: string;
  source: VideoSource;
  /** Link the video was imported from, for URL sources. */
  sourceUrl?: string;
  /** The file every render reads. Downloads land in the video's folder; local files stay where they are. */
  sourcePath?: string;
  /** Folder that holds everything the engine wrote for this video. */
  dir: string;
  status: VideoStatus;
  /** 0-100 within the current status. */
  progress: number;
  detail?: string;
  duration?: number;
  width?: number;
  height?: number;
  language?: string;
  thumbnailPath?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export type ClipStatus = 'queued' | 'rendering' | 'ready' | 'failed';

export interface ClipRecord {
  id: string;
  videoId: string;
  title: string;
  description?: string;
  hookText?: string;
  score?: number;
  tags: string[];
  startTime: number;
  endTime: number;
  cropStrategy: CropStrategy;
  layoutType: LayoutType;
  layoutRegions: LayoutRegion[];
  captionStyle: CaptionStyleName;
  captionPosition?: CaptionPosition;
  captionSize?: CaptionSize;
  burnCaptions: boolean;
  status: ClipStatus;
  progress: number;
  filePath?: string;
  thumbnailPath?: string;
  renderFallback?: RenderFallback;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LibraryData {
  version: 1;
  videos: VideoRecord[];
  clips: ClipRecord[];
}
