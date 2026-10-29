/** Shapes shared by the main process, the preload bridge and the UI. */
import type { EngineStatus } from '../engine/engine';
import type { Settings } from '../engine/settings';
import type { ClipRecord, VideoRecord } from '../engine/types';
import type { LicenseState } from '../license/license';

export interface AppState {
  version: string;
  platform: NodeJS.Platform;
  license: LicenseState;
  engine: EngineStatus;
  settings: Settings;
  videos: VideoRecord[];
  clips: ClipRecord[];
  libraryDir: string;
  mcp: {
    url: string;
    running: boolean;
    error: string | null;
    claudeCodeCommand: string;
    installed: Record<'claude-desktop' | 'codex' | 'cursor', boolean>;
  };
}

export type ClipPatch = Partial<
  Pick<ClipRecord, 'title' | 'startTime' | 'endTime' | 'captionStyle' | 'captionPosition' | 'captionSize' | 'burnCaptions'>
> & { cropStrategy?: Partial<ClipRecord['cropStrategy']> };

/** What the preload script exposes as `window.momentreel`. */
export interface MomentreelApi {
  getState(): Promise<AppState>;
  onState(listener: (state: AppState) => void): () => void;
  activateLicense(key: string): Promise<LicenseState>;
  deactivateLicense(): Promise<void>;
  importVideo(source: string): Promise<VideoRecord>;
  pickVideoFile(): Promise<string | null>;
  deleteVideo(id: string): Promise<void>;
  revealVideo(id: string): Promise<void>;
  updateClip(id: string, patch: ClipPatch): Promise<ClipRecord>;
  deleteClip(id: string): Promise<void>;
  revealClip(id: string): Promise<void>;
  downloadModel(id: string): Promise<void>;
  updateSettings(patch: Partial<Settings>): Promise<Settings>;
  installAgent(agent: 'claude-desktop' | 'codex' | 'cursor'): Promise<string>;
  copyClaudeCodeCommand(): Promise<void>;
  openExternal(url: string): Promise<void>;
}
