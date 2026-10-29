/**
 * Locating the external tools the engine drives.
 *
 * Every tool resolves through the same ladder, first hit wins:
 *   1. an explicit environment override (dev machines, CI, support)
 *   2. a copy in the data dir — yt-dlp updates itself there, because the copy
 *      inside a signed app bundle is read-only and YouTube breaks old builds
 *   3. the copy bundled in the app's resources, per platform and arch
 *   4. the npm installer packages (ffmpeg / ffprobe only)
 *   5. whatever is on PATH
 */
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export type ToolName = 'ffmpeg' | 'ffprobe' | 'yt-dlp' | 'whisper-cli';

export interface ResolvedTool {
  path: string;
  source: 'env' | 'data' | 'bundled' | 'npm' | 'path';
}

const ENV_OVERRIDES: Record<ToolName, string> = {
  ffmpeg: 'FFMPEG_PATH',
  ffprobe: 'FFPROBE_PATH',
  'yt-dlp': 'YTDLP_PATH',
  'whisper-cli': 'WHISPER_CLI_PATH',
};

/** `darwin-arm64`, `win32-x64`, … — the folder name under `resources/bin`. */
export function platformKey(): string {
  return `${process.platform}-${process.arch}`;
}

export function executableName(tool: ToolName): string {
  return process.platform === 'win32' ? `${tool}.exe` : tool;
}

function isExecutable(file: string): boolean {
  try {
    fs.accessSync(file, fs.constants.X_OK);
    return fs.statSync(file).isFile();
  } catch {
    return false;
  }
}

function fromNpmInstaller(tool: ToolName): string | null {
  try {
    if (tool === 'ffmpeg') return require('@ffmpeg-installer/ffmpeg').path;
    if (tool === 'ffprobe') return require('@ffprobe-installer/ffprobe').path;
  } catch {
    // Installer has no binary for this platform
  }
  return null;
}

function fromPath(tool: ToolName): string | null {
  try {
    const finder = process.platform === 'win32' ? 'where' : 'which';
    const out = execFileSync(finder, [tool], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const first = out.split(/\r?\n/).find(Boolean);
    return first?.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Packaged apps keep node_modules inside `app.asar`, which child processes can
 * not exec from. electron-builder unpacks the installer binaries next to it.
 */
function unpacked(file: string): string {
  return file.replace(`app.asar${path.sep}`, `app.asar.unpacked${path.sep}`);
}

export function resolveTool(
  tool: ToolName,
  dirs: { dataDir: string; resourcesDir: string }
): ResolvedTool | null {
  const override = process.env[ENV_OVERRIDES[tool]];
  if (override && isExecutable(override)) return { path: override, source: 'env' };

  const name = executableName(tool);
  const dataCopy = path.join(dirs.dataDir, 'bin', name);
  if (isExecutable(dataCopy)) return { path: dataCopy, source: 'data' };

  const bundled = path.join(dirs.resourcesDir, 'bin', platformKey(), name);
  if (isExecutable(bundled)) return { path: bundled, source: 'bundled' };

  const npm = fromNpmInstaller(tool);
  if (npm && isExecutable(unpacked(npm))) return { path: unpacked(npm), source: 'npm' };

  const onPath = fromPath(tool);
  if (onPath) return { path: onPath, source: 'path' };

  return null;
}
