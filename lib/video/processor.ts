/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, @typescript-eslint/no-require-imports, no-multi-spaces, indent */
/**
 * Video Processing with FFmpeg
 *
 * This module handles video manipulation using FFmpeg:
 * - Extract clips from video
 * - Crop to vertical (9:16) format
 * - Burn captions into video
 * - Generate thumbnails
 */

import ffmpeg from 'fluent-ffmpeg';
import { CaptionsResult } from '../ai/captions';
import { buildFaceTrajectory, TRACKING_PROFILES } from './face-track';
import { ensureCaptionFonts } from '../captions/fonts.node';
import { prepareCaptions, type PreparedCaptions } from '../captions/render.node';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

// Try to set FFmpeg path from @ffmpeg-installer/ffmpeg, fallback to system FFmpeg
try {
  const { path: ffmpegPath } = require('@ffmpeg-installer/ffmpeg');
  if (ffmpegPath) {
    ffmpeg.setFfmpegPath(ffmpegPath);
  }
} catch (error) {
  // If @ffmpeg-installer/ffmpeg fails, use system FFmpeg
  // Make sure FFmpeg is installed: brew install ffmpeg (macOS) or apt-get install ffmpeg (Linux)
  console.warn('Using system FFmpeg. If FFmpeg is not installed, please install it.');
}

/**
 * Publish-quality x264 settings for the final clip.
 *
 * Explicit on purpose: ffmpeg's defaults (crf 23, preset medium, no pix_fmt)
 * visibly soften faces and burned-in captions, and this file is the deliverable
 * the user posts to TikTok/Reels.
 */
const PUBLISH_VIDEO_OPTIONS = [
  '-c:v', 'libx264',
  '-crf', '18',
  '-preset', 'slow',
  '-profile:v', 'high',
  '-pix_fmt', 'yuv420p',
  '-movflags', '+faststart',
];

/**
 * Near-transparent settings for intermediate files that get re-encoded again.
 * Speed matters more than size here; quality must not be the bottleneck.
 */
const INTERMEDIATE_VIDEO_OPTIONS = [
  '-c:v', 'libx264',
  '-crf', '16',
  '-preset', 'veryfast',
  '-pix_fmt', 'yuv420p',
];

/** Reports 0-1 of an encode. Callers throttle; this fires several times a second. */
export type ProgressCallback = (fraction: number) => void;

/** "00:01:23.45" -> 83.45 seconds. Returns null for ffmpeg's "N/A" placeholder. */
function parseTimemark(timemark: string | undefined): number | null {
  if (!timemark) return null;
  const parts = timemark.split(':');
  if (parts.length !== 3) return null;
  const [h, m, s] = parts.map(parseFloat);
  if (![h, m, s].every(Number.isFinite)) return null;
  return h * 3600 + m * 60 + s;
}

/**
 * Attach a progress handler to an ffmpeg command.
 *
 * Deliberately ignores fluent-ffmpeg's own `progress.percent`: it is derived
 * from the probed input duration, which is wrong for every path in this file —
 * `complexFilter` graphs, `-ss` seeks and multi-input caption overlays all
 * leave it either absent or wildly off. The output timemark against the known
 * clip duration is the only reliable signal.
 */
function attachProgress(
  command: ffmpeg.FfmpegCommand,
  durationSeconds: number | undefined,
  onProgress?: ProgressCallback
): ffmpeg.FfmpegCommand {
  if (!onProgress || !durationSeconds || durationSeconds <= 0) return command;

  return command.on('progress', (progress) => {
    const seconds = parseTimemark(progress.timemark);
    if (seconds === null) return;
    onProgress(Math.max(0, Math.min(1, seconds / durationSeconds)));
  });
}

/**
 * Extract the audio track as AAC, reporting encode progress.
 *
 * Lives here rather than as a raw `ffmpeg` exec in the ingest worker so it can
 * share the timemark-based progress handling with the render paths.
 */
export async function extractAudio(
  inputPath: string,
  outputPath: string,
  options: { durationSeconds?: number; onProgress?: ProgressCallback } = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    attachProgress(ffmpeg(inputPath), options.durationSeconds, options.onProgress)
      .noVideo()
      .audioCodec('aac')
      .audioBitrate('128k')
      .output(outputPath)
      .outputOptions(['-y'])
      .on('end', () => resolve())
      .on('error', (err) => reject(new Error(`FFmpeg error: ${err.message}`)))
      .run();
  });
}

/**
 * Escape a filesystem path for use as a value inside a filtergraph.
 * Unescaped colons and backslashes are read as filter syntax.
 */
function escapeFilterPath(p: string): string {
  return p.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'");
}

/**
 * Options for the `ass` filter, pinning the font directory.
 *
 * `fontsdir` is not optional here. The bundled @ffmpeg-installer binary is built
 * with `--enable-libass` but *without* `--enable-fontconfig`, so libass uses its
 * directory provider: it only ever sees fonts in the directory it is handed.
 * Without this it resolves nothing and renders in a default face or not at all —
 * which is what has been happening in the worker container, where no font is
 * installed in the first place.
 */
function assFilterOptions(assPath: string): string {
  return `filename=${escapeFilterPath(assPath)}:fontsdir=${escapeFilterPath(ensureCaptionFonts())}`;
}

/**
 * Index of the caption overlay input. It is always added second, right after
 * the video, so the filtergraph can name it without threading a count around.
 */
const OVERLAY_INPUT = 1;

/**
 * Attach the overlay track as a second input, when the preset needs one.
 *
 * `-safe 0` is not required — the playlist references its images by bare
 * filename — but the demuxer's safe mode has changed defaults across versions,
 * and being explicit costs nothing.
 */
function attachCaptionInput(
  command: ReturnType<typeof ffmpeg>,
  burn?: PreparedCaptions | null
): ReturnType<typeof ffmpeg> {
  if (!burn?.overlayConcatPath) return command;
  return command.input(burn.overlayConcatPath).inputOptions(['-f', 'concat', '-safe', '0']);
}

/**
 * Tail every filtergraph ends with: square pixels, then captions.
 *
 * setsar=1 is not optional: scale inside these graphs rewrites SAR to preserve
 * the source display aspect, which leaves 1080x1920 output playing back
 * stretched. Captions ride along on the same graph — a separate ffmpeg run
 * would re-encode the whole clip for nothing.
 */
function buildOutputTail(
  inLabel: string,
  outLabel: string,
  burn?: PreparedCaptions | null,
  output?: { width: number; height: number }
): string {
  const filters = ['setsar=1'];
  if (burn?.assPath) filters.push(`ass=${assFilterOptions(burn.assPath)}`);

  const chain = filters.join(',');
  if (!burn?.overlayConcatPath) return `[${inLabel}]${chain}[${outLabel}]`;

  if (!output) {
    throw new Error('An overlay caption burn needs the output size to place its plate');
  }

  // The plate covers only the caption band of the 1080x1920 composition, and the
  // output is not always that size either — fitOutputToSource drops narrow
  // sources to 720x1280. Both are resolved here, in absolute pixels.
  //
  // Deliberately not scale2ref: in ffmpeg 4.4 its `main_*` variables resolve to
  // the input being scaled rather than the reference, so `h=main_h*0.13` sized
  // the plate off its own height and collapsed it to a sliver. Every caller
  // already knows the real output size, so no expression is needed.
  const plateWidth = Math.round(output.width);
  const plateHeight = Math.max(2, Math.round(output.height * (burn.overlayBandHeight ?? 1)));
  const plateY = Math.round(output.height * (burn.overlayBandY ?? 0));

  // format=auto keeps the alpha channel; without it ffmpeg picks a format that
  // drops it and the caption plates render as opaque black boxes.
  return (
    `[${inLabel}]${chain}[cap_base];` +
    `[${OVERLAY_INPUT}:v]scale=${plateWidth}:${plateHeight}:flags=lanczos[cap_plate];` +
    `[cap_base][cap_plate]overlay=x=0:y=${plateY}:format=auto:eof_action=pass[${outLabel}]`
  );
}

/**
 * Below this much real width in the cropped region, rendering at 1080x1920 is
 * upscaling for its own sake: it adds weight and softness without adding
 * detail. 720x1280 still clears the TikTok/Reels minimum.
 */
const MIN_WIDTH_FOR_1080 = 720;
const REDUCED_OUTPUT = { width: 720, height: 1280 };

/**
 * Pick an output size the source can actually fill.
 * Only ever reduces — an explicit non-default request is left alone.
 */
function fitOutputToSource(
  cropWidth: number,
  requestedWidth: number,
  requestedHeight: number
): { width: number; height: number } {
  if (requestedWidth !== 1080 || requestedHeight !== 1920) {
    return { width: requestedWidth, height: requestedHeight };
  }
  if (cropWidth >= MIN_WIDTH_FOR_1080) {
    return { width: requestedWidth, height: requestedHeight };
  }
  console.log(`📉 Source only has ${cropWidth}px across the crop — rendering 720x1280 instead of upscaling`);
  return REDUCED_OUTPUT;
}

/** Where the crop window's centre sits, as a fraction of source width. */
const SUBJECT_POSITION_CENTERS: Record<SubjectPosition, number> = {
  left: 0.3,
  center: 0.5,
  right: 0.7,
};

/**
 * Left edge of a static crop window that puts the subject in frame.
 * Without this the AI's subjectPosition is decided and then thrown away.
 */
function staticCropX(sourceWidth: number, cropWidth: number, position: SubjectPosition): number {
  const center = sourceWidth * SUBJECT_POSITION_CENTERS[position];
  const maxX = Math.max(0, sourceWidth - cropWidth);
  return Math.floor(Math.min(maxX, Math.max(0, center - cropWidth / 2)));
}

/**
 * Extract a clip from a video
 */
export async function extractClip(
  inputPath: string,
  startTime: number,
  endTime: number,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const duration = endTime - startTime;

    ffmpeg(inputPath)
      .setStartTime(startTime)
      .setDuration(duration)
      .output(outputPath)
      .outputOptions(INTERMEDIATE_VIDEO_OPTIONS)
      .audioCodec('aac')
      .audioBitrate('192k')
      .on('end', () => resolve())
      .on('error', (err) => reject(new Error(`FFmpeg error: ${err.message}`)))
      .run();
  });
}

/**
 * Crop video to vertical 9:16 format (1080x1920)
 */
export async function cropToVertical(
  inputPath: string,
  outputPath: string,
  options?: {
    width?: number; // Default: 1080
    height?: number; // Default: 1920
    position?: 'center' | 'top' | 'bottom'; // Default: center — vertical axis only
    horizontalPosition?: SubjectPosition; // Where the subject sits in a wide source
    captions?: PreparedCaptions | null; // Burn these in the same pass as the crop
    durationSeconds?: number;
    onProgress?: ProgressCallback;
  }
): Promise<void> {
  let { width = 1080, height = 1920 } = options || {};
  const { position = 'center', horizontalPosition = 'center', captions, durationSeconds, onProgress } = options || {};

  return new Promise((resolve, reject) => {
    // Get video info first to determine crop position
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) {
        return reject(new Error(`FFprobe error: ${err.message}`));
      }

      const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
      if (!videoStream || !videoStream.width || !videoStream.height) {
        return reject(new Error('Could not determine video dimensions'));
      }

      const sourceWidth = videoStream.width;
      const sourceHeight = videoStream.height;
      const targetAspect = 9 / 16;

      // Crop the axis the source has to spare, then scale to the target.
      let cropWidth = sourceWidth;
      let cropHeight = sourceHeight;
      let cropX = 0;
      let cropY = 0;

      if (sourceWidth / sourceHeight > targetAspect) {
        cropWidth = Math.floor(sourceHeight * targetAspect);
        cropX = staticCropX(sourceWidth, cropWidth, horizontalPosition);
        ({ width, height } = fitOutputToSource(cropWidth, width, height));
      } else {
        cropHeight = Math.floor(sourceWidth / targetAspect);
        if (position === 'top') {
          cropY = 0;
        } else if (position === 'bottom') {
          cropY = sourceHeight - cropHeight;
        } else {
          cropY = Math.floor((sourceHeight - cropHeight) / 2);
        }
      }

      const filterComplex =
        `[0:v]crop=w=${cropWidth}:h=${cropHeight}:x=${cropX}:y=${cropY},` +
        `scale=${width}:${height}:flags=lanczos[out];` +
        buildOutputTail('out', 'final', captions, { width, height });

      attachProgress(
        attachCaptionInput(ffmpeg(inputPath), captions),
        durationSeconds,
        onProgress
      )
        .complexFilter(filterComplex)
        .outputOptions(['-map', '[final]', '-map', '0:a?', ...PUBLISH_VIDEO_OPTIONS])
        .output(outputPath)
        .audioCodec('aac')
        .audioBitrate('192k')
        .on('end', () => resolve())
        .on('error', (e) => reject(new Error(`FFmpeg error: ${e.message}`)))
        .run();
    });
  });
}

/**
 * Smart crop strategy type definitions
 */
export type CropMethod = 'track_speaker' | 'track_action' | 'wide_shot' | 'blur_sides';
export type SubjectPosition = 'left' | 'center' | 'right';

export type LayoutType = 'talking_head' | 'interview_split' | 'gameplay_cam' | 'tutorial_pip' | 'standard';

export interface LayoutRegion {
  regionId: string;
  sourceX: number; // fraction of source width (0.0–1.0)
  sourceY: number;
  sourceW: number;
  sourceH: number;
  destY: number;   // fraction of output height 1920 (0.0–1.0)
  destH: number;
}

export interface CompositeLayoutOptions {
  layoutType: LayoutType;
  layoutRegions?: LayoutRegion[];
  width?: number;  // default 1080
  height?: number; // default 1920
}

/**
 * Reported whenever a render did not use the strategy that was asked for.
 * A type alias rather than an interface so it stays assignable to Prisma's Json input.
 */
export type RenderFallback = {
  from: CropMethod;
  to: string;
  reason: string;
};

export interface SmartCropOptions {
  method: CropMethod;
  subjectPosition: SubjectPosition;
  width?: number; // Default: 1080
  height?: number; // Default: 1920
  compositeLayout?: CompositeLayoutOptions;
  captions?: PreparedCaptions | null; // Burn these in the same pass as the crop
  /** Called when the requested strategy could not be used. */
  onFallback?: (info: RenderFallback) => void;
  /** Length of the segment being rendered — required for progress to mean anything. */
  durationSeconds?: number;
  /** Called with 0-1 of the encode. */
  onProgress?: ProgressCallback;
}

/**
 * Smart crop video to vertical 9:16 format with AI-driven strategies
 *
 * V2 Engine with multiple crop methods:
 * - track_speaker: Face tracking for talking heads (sendcmd-driven crop)
 * - track_action: Face tracking tuned to follow movement faster
 * - wide_shot: Static crop placed by subjectPosition
 * - blur_sides: Blurred letterbox for groups (split + blur + overlay)
 */
export async function cropToVerticalSmart(
  inputPath: string,
  outputPath: string,
  options: SmartCropOptions
): Promise<void> {
  let { width = 1080, height = 1920 } = options;
  const { method, subjectPosition, captions, onFallback, durationSeconds, onProgress } = options;

  console.log(`🎬 Smart Crop: Using "${method}" strategy with subject at "${subjectPosition}"`);

  const staticCrop = (reason?: string) => {
    if (reason) {
      console.warn(`⚠️  "${method}" downgraded to a static crop: ${reason}`);
      onFallback?.({ from: method, to: 'static_crop', reason });
    }
    return cropToVertical(inputPath, outputPath, {
      width,
      height,
      position: 'center',
      horizontalPosition: subjectPosition,
      captions,
      durationSeconds,
      onProgress,
    });
  };

  if (method === 'wide_shot') return staticCrop();

  const metadata = await new Promise<any>((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, data) => (err ? reject(new Error(`FFprobe error: ${err.message}`)) : resolve(data)));
  });

  const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video');
  if (!videoStream?.width || !videoStream?.height) {
    throw new Error('Could not determine video dimensions');
  }

  const sourceWidth: number = videoStream.width;
  const sourceHeight: number = videoStream.height;

  // Composite layout takes priority over single-region crop strategies
  if (options.compositeLayout && options.compositeLayout.layoutType !== 'standard') {
    return cropToVerticalComposite(inputPath, outputPath, options.compositeLayout, sourceWidth, sourceHeight, captions, {
      durationSeconds,
      onProgress,
    });
  }

  let filterComplex: string;
  let cmdFilePath: string | undefined;

  if (method === 'blur_sides') {
    filterComplex = buildBlurSidesFilter(sourceWidth, sourceHeight, width, height);
  } else if (method === 'track_speaker' || method === 'track_action') {
    const cropWidth = Math.floor(sourceHeight * (9 / 16));
    if (cropWidth >= sourceWidth) {
      // Source is already at or narrower than 9:16 — there is nothing to pan across
      return staticCrop('source is not wider than 9:16');
    }

    ({ width, height } = fitOutputToSource(cropWidth, width, height));

    const profile = TRACKING_PROFILES[method === 'track_speaker' ? 'speaker' : 'action'];
    let trajectory;
    try {
      trajectory = await buildFaceTrajectory(inputPath, sourceWidth, cropWidth, profile);
    } catch (err) {
      // Detection is best-effort; a broken detector must not fail the clip
      const reason = err instanceof Error ? err.message : String(err);
      console.error(`❌ Face tracking failed for ${method}: ${reason}`);
      return staticCrop(`face tracking failed: ${reason}`);
    }

    if (trajectory.kind === 'static') return staticCrop(trajectory.reason);

    cmdFilePath = trajectory.cmdFilePath;
    filterComplex = buildTrackingFilter(cropWidth, width, height, trajectory.startX, cmdFilePath);
  } else {
    return staticCrop();
  }

  // setsar=1 is not optional: scale inside these graphs rewrites SAR to
  // preserve the source display aspect, which leaves 1080x1920 output
  // playing back stretched. Captions ride along on the same graph — a
  // separate ffmpeg run would re-encode the whole clip for nothing.
  filterComplex = `${filterComplex};${buildOutputTail('out', 'final', captions, { width, height })}`;

  console.log(`📐 Applying filter: ${filterComplex.substring(0, 100)}...`);

  try {
    await new Promise<void>((resolve, reject) => {
      attachProgress(
        attachCaptionInput(ffmpeg(inputPath), captions),
        durationSeconds,
        onProgress
      )
        .complexFilter(filterComplex)
        // '0:a?' — an explicit -map drops every other stream, and the '?'
        // keeps silent sources from failing outright
        .outputOptions(['-map', '[final]', '-map', '0:a?', ...PUBLISH_VIDEO_OPTIONS])
        .output(outputPath)
        .audioCodec('copy')
        .on('end', () => {
          console.log(`✅ Smart crop completed: ${method}`);
          resolve();
        })
        .on('error', (err) => reject(new Error(err.message)))
        .run();
    });
  } catch (err) {
    // Loud on purpose: a silent downgrade here hid a completely broken
    // track_speaker filter for the entire life of the feature
    const reason = err instanceof Error ? err.message : String(err);
    console.error(`❌ Smart crop (${method}) failed, falling back to a static crop: ${reason}`);
    return staticCrop(`render failed: ${reason}`);
  } finally {
    if (cmdFilePath) await fs.unlink(cmdFilePath).catch(() => {});
  }
}

/**
 * Build blur_sides filter for group shots
 * Creates a cinematic letterbox effect with blurred background
 */
function buildBlurSidesFilter(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number
): string {
  // Strategy:
  // 1. Create blurred background scaled to 9:16
  // 2. Overlay the original video (scaled to fit) on top
  // 3. Result: Full-width content with blurred sides filling vertical space

  return `
    [0:v]scale=${targetWidth}:${targetHeight},boxblur=20:5[blurred];
    [0:v]scale=${targetWidth}:-1[scaled];
    [blurred][scaled]overlay=(W-w)/2:(H-h)/2[out]
  `.trim().replace(/\n\s+/g, '');
}

/**
 * Build the filter that follows a tracked subject across the frame.
 *
 * The crop window is labelled `crop@dyn` so the sendcmd script produced by
 * buildFaceTrajectory can steer its `x` as the clip plays.
 *
 * This replaces an earlier zoompan approach that could never have worked: it
 * asked for a 1080x1920 window out of a 1920x1080 frame at zoom 1, so ffmpeg
 * aborted with "Error reinitializing filters" on every single clip and the
 * error handler quietly downgraded the render to a centre crop.
 */
function buildTrackingFilter(
  cropWidth: number,
  targetWidth: number,
  targetHeight: number,
  startX: number,
  cmdFilePath: string
): string {
  return (
    `[0:v]sendcmd=f=${escapeFilterPath(cmdFilePath)},` +
    `crop@dyn=w=${cropWidth}:h=ih:x=${startX}:y=0,` +
    `scale=${targetWidth}:${targetHeight}:flags=lanczos[out]`
  );
}

/**
 * Burn captions into video with word-by-word highlighting.
 *
 * Font size, position and colours all come from the preset via the shared
 * renderer — never from `captionsResult.style`, which holds a snapshot of
 * whatever preset the captions were first generated under. An edit reuses the
 * parent's stored captions, so reading that field would leave someone who picks
 * Viral with Classic's styling.
 */
export async function burnCaptions(
  inputPath: string,
  captionsResult: CaptionsResult,
  outputPath: string,
  stylePreset?: string,
  opts?: {
    captionPosition?: 'top' | 'center' | 'bottom';
    captionSize?: 'small' | 'medium' | 'large';
    /** Clip length. The raster renderer needs it to size the overlay track. */
    duration?: number;
    /** Called with 0-1 of the encode. */
    onProgress?: ProgressCallback;
  }
): Promise<void> {
  const source = await probeVideo(inputPath);
  const duration = opts?.duration ?? source.duration;

  const captions = await prepareCaptions(
    captionsResult,
    {
      captionStyle: stylePreset,
      captionSize: opts?.captionSize,
      captionPosition: opts?.captionPosition,
    },
    { duration }
  );

  // A clip can legitimately hold no words — a musical intro, or a trim dragged
  // into a silent stretch. That is an uncaptioned clip, not a failure, and
  // createClipSmart treats it the same way; throwing here would mark the clip
  // FAILED and leave Download permanently broken for it.
  if (!captions) {
    console.warn('[captions] No caption words in range — rendering without captions');
  }

  try {
    await new Promise<void>((resolve, reject) => {
      attachProgress(attachCaptionInput(ffmpeg(inputPath), captions), duration, opts?.onProgress)
        .complexFilter(buildOutputTail('0:v', 'final', captions, source))
        .outputOptions(['-map', '[final]', '-map', '0:a?', ...PUBLISH_VIDEO_OPTIONS])
        .output(outputPath)
        .audioCodec('copy')
        .on('end', () => resolve())
        .on('error', (err) => reject(new Error(`FFmpeg error: ${err.message}`)))
        .run();
    });
  } finally {
    await captions?.cleanup();
  }
}

/**
 * Duration and frame size, for callers that did not already know them.
 *
 * burnCaptions runs on pixels somebody else already cropped, so unlike the crop
 * paths it has no output size of its own — it inherits the input's, and an
 * overlay plate has to be placed against that.
 */
async function probeVideo(
  inputPath: string
): Promise<{ duration: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) return reject(new Error(`FFprobe error: ${err.message}`));
      const stream = metadata.streams.find((s) => s.codec_type === 'video');
      if (!stream?.width || !stream?.height) {
        return reject(new Error('Could not determine video dimensions'));
      }
      resolve({
        duration: metadata.format?.duration ?? 0,
        width: stream.width,
        height: stream.height,
      });
    });
  });
}

/**
 * Generate thumbnail from video
 *
 * `size` uses the `?xHEIGHT` form so the frame keeps the source aspect ratio —
 * pinning both dimensions squashes anything that is not already that shape.
 */
export async function generateThumbnail(
  inputPath: string,
  outputPath: string,
  opts: { timestamp?: number; size?: string } = {}
): Promise<void> {
  const { timestamp = 1, size = '?x720' } = opts;

  return new Promise((resolve, reject) => {
    // No .run() here: screenshots() spawns ffmpeg itself, and a trailing .run()
    // has no output configured, so it throws "No output specified" every time.
    ffmpeg(inputPath)
      .screenshots({
        timestamps: [timestamp],
        filename: path.basename(outputPath),
        folder: path.dirname(outputPath),
        size,
      })
      .on('end', () => resolve())
      .on('error', (err) => reject(new Error(`FFmpeg error: ${err.message}`)));
  });
}

/**
 * Get video metadata (duration, dimensions, etc.)
 */
export async function getVideoMetadata(inputPath: string): Promise<{
  duration: number;
  width: number;
  height: number;
  format: string;
  bitrate: number;
}> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) {
        return reject(new Error(`FFprobe error: ${err.message}`));
      }

      const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
      if (!videoStream) {
        return reject(new Error('No video stream found'));
      }

      resolve({
        duration: metadata.format.duration || 0,
        width: videoStream.width || 0,
        height: videoStream.height || 0,
        format: metadata.format.format_name || 'unknown',
        bitrate: metadata.format.bit_rate || 0,
      });
    });
  });
}


/**
 * Build interview_split filter: two side-by-side people stacked vertically
 */
function buildInterviewSplitFilter(
  regions: LayoutRegion[],
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number
): string {
  if (regions.length < 2) {
    throw new Error('interview_split requires exactly 2 layout regions');
  }
  const [a, b] = regions;
  const aX = Math.round(a.sourceX * sourceWidth);
  const aY = Math.round(a.sourceY * sourceHeight);
  const aW = Math.round(a.sourceW * sourceWidth);
  const aH = Math.round(a.sourceH * sourceHeight);
  const aDestH = Math.round(a.destH * targetHeight);

  const bX = Math.round(b.sourceX * sourceWidth);
  const bY = Math.round(b.sourceY * sourceHeight);
  const bW = Math.round(b.sourceW * sourceWidth);
  const bH = Math.round(b.sourceH * sourceHeight);
  const bDestH = Math.round(b.destH * targetHeight);

  return `[0:v]crop=${aW}:${aH}:${aX}:${aY},scale=${targetWidth}:${aDestH}[top];[0:v]crop=${bW}:${bH}:${bX}:${bY},scale=${targetWidth}:${bDestH}[bottom];[top][bottom]vstack=inputs=2[out]`;
}

/**
 * Build gameplay_cam filter: face cam top 30% + gameplay bottom 70%
 */
function buildGameplayCamFilter(
  regions: LayoutRegion[],
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number
): string {
  if (regions.length < 2) {
    throw new Error('gameplay_cam requires exactly 2 layout regions (face + gameplay)');
  }
  const face = regions.find(r => r.regionId === 'face') ?? regions[0];
  const gameplay = regions.find(r => r.regionId === 'gameplay') ?? regions[1];

  const fX = Math.round(face.sourceX * sourceWidth);
  const fY = Math.round(face.sourceY * sourceHeight);
  const fW = Math.round(face.sourceW * sourceWidth);
  const fH = Math.round(face.sourceH * sourceHeight);
  const fDestH = Math.round(face.destH * targetHeight);

  const gX = Math.round(gameplay.sourceX * sourceWidth);
  const gY = Math.round(gameplay.sourceY * sourceHeight);
  const gW = Math.round(gameplay.sourceW * sourceWidth);
  const gH = Math.round(gameplay.sourceH * sourceHeight);
  const gDestH = Math.round(gameplay.destH * targetHeight);

  return `[0:v]crop=${fW}:${fH}:${fX}:${fY},scale=${targetWidth}:${fDestH}[face];[0:v]crop=${gW}:${gH}:${gX}:${gY},scale=${targetWidth}:${gDestH}[gameplay];[face][gameplay]vstack=inputs=2[out]`;
}

/**
 * Build tutorial_pip filter: full screen content with blurred sides + small face PiP overlay
 */
function buildTutorialPipFilter(
  regions: LayoutRegion[],
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number
): string {
  const pipRegion = regions.find(r => r.regionId === 'face_pip');

  // Base: blur_sides style fill for the main screen content
  const baseFilter = `[0:v]scale=${targetWidth}:${targetHeight},boxblur=20:5[bg];[0:v]scale=${targetWidth}:-1[main];[bg][main]overlay=(W-w)/2:(H-h)/2[base]`;

  if (!pipRegion) {
    // No face PiP region — just return blur_sides style
    return `${baseFilter};[base]copy[out]`;
  }

  const pX = Math.round(pipRegion.sourceX * sourceWidth);
  const pY = Math.round(pipRegion.sourceY * sourceHeight);
  const pW = Math.round(pipRegion.sourceW * sourceWidth);
  const pH = Math.round(pipRegion.sourceH * sourceHeight);
  const pipSize = Math.round(pipRegion.destH * targetHeight);
  const pipDestY = Math.round(pipRegion.destY * targetHeight);
  const pipDestX = targetWidth - pipSize - 20;

  return `${baseFilter};[0:v]crop=${pW}:${pH}:${pX}:${pY},scale=${pipSize}:${pipSize}[pip];[base][pip]overlay=${pipDestX}:${pipDestY}[out]`;
}

/**
 * Crop video to vertical using a composite multi-region layout
 */
export async function cropToVerticalComposite(
  inputPath: string,
  outputPath: string,
  layout: CompositeLayoutOptions,
  sourceWidth: number,
  sourceHeight: number,
  captions?: PreparedCaptions | null,
  progress?: { durationSeconds?: number; onProgress?: ProgressCallback }
): Promise<void> {
  const { layoutType, layoutRegions = [], width = 1080, height = 1920 } = layout;

  console.log(`🖼️  Composite Layout: "${layoutType}" with ${layoutRegions.length} region(s)`);

  let filterComplex: string;

  switch (layoutType) {
    case 'interview_split':
      filterComplex = buildInterviewSplitFilter(layoutRegions, sourceWidth, sourceHeight, width, height);
      break;
    case 'gameplay_cam':
      filterComplex = buildGameplayCamFilter(layoutRegions, sourceWidth, sourceHeight, width, height);
      break;
    case 'tutorial_pip':
      filterComplex = buildTutorialPipFilter(layoutRegions, sourceWidth, sourceHeight, width, height);
      break;
    default:
      // talking_head and standard fall back to blur_sides (safe default)
      filterComplex = buildBlurSidesFilter(sourceWidth, sourceHeight, width, height);
  }

  // Square pixels + captions on the same graph — see cropToVerticalSmart
  filterComplex = `${filterComplex};${buildOutputTail('out', 'final', captions, { width, height })}`;

  return new Promise((resolve, reject) => {
    attachProgress(
      attachCaptionInput(ffmpeg(inputPath), captions),
      progress?.durationSeconds,
      progress?.onProgress
    )
      .complexFilter(filterComplex)
      .outputOptions(['-map', '[final]', '-map', '0:a?', ...PUBLISH_VIDEO_OPTIONS])
      .output(outputPath)
      .audioCodec('copy')
      .on('end', () => {
        console.log(`✅ Composite layout completed: ${layoutType}`);
        resolve();
      })
      .on('error', (err) => {
        console.error(`❌ Composite layout failed: ${err.message}`);
        reject(new Error(`FFmpeg composite layout error: ${err.message}`));
      })
      .run();
  });
}

/**
 * Create a complete clip with all processing steps
 * This is the main entry point for clip generation with word-by-word captions
 */
export async function createClip(
  inputVideoPath: string,
  startTime: number,
  endTime: number,
  captionsResult: CaptionsResult | null,
  outputPath: string,
  options?: {
    cropToVertical?: boolean;
    burnCaptions?: boolean;
  }
): Promise<void> {
  const {
    cropToVertical: shouldCrop = true,
    burnCaptions: shouldBurnCaptions = true,
  } = options || {};

  const tempDir = os.tmpdir();
  const timestamp = Date.now();

  try {
    // Step 1: Extract clip
    const extractedPath = path.join(tempDir, `clip-${timestamp}-extracted.mp4`);
    await extractClip(inputVideoPath, startTime, endTime, extractedPath);

    // Step 2: Crop to vertical (optional)
    let processedPath = extractedPath;
    if (shouldCrop) {
      const croppedPath = path.join(tempDir, `clip-${timestamp}-cropped.mp4`);
      await cropToVertical(extractedPath, croppedPath);
      await fs.unlink(extractedPath); // Clean up
      processedPath = croppedPath;
    }

    // Step 3: Burn captions with word-by-word highlighting (optional)
    if (shouldBurnCaptions && captionsResult) {
      await burnCaptions(processedPath, captionsResult, outputPath);
      await fs.unlink(processedPath); // Clean up
    } else {
      // Just move the file to output
      await fs.rename(processedPath, outputPath);
    }
  } catch (error) {
    // Clean up temp files on error
    const tempFiles = [
      path.join(tempDir, `clip-${timestamp}-extracted.mp4`),
      path.join(tempDir, `clip-${timestamp}-cropped.mp4`),
    ];

    for (const file of tempFiles) {
      try {
        await fs.unlink(file);
      } catch (e) {
        // Ignore cleanup errors
      }
    }

    throw error;
  }
}

/**
 * Create a complete clip with SMART AI-driven cropping and word-by-word captions
 * V2 Engine with intelligent crop strategy selection
 */
export async function createClipSmart(
  inputVideoPath: string,
  startTime: number,
  endTime: number,
  captionsResult: CaptionsResult | null,
  outputPath: string,
  options: {
    cropStrategy: SmartCropOptions;
    burnCaptions?: boolean;
    stylePreset?: string;
    captionPosition?: 'top' | 'center' | 'bottom';
    captionSize?: 'small' | 'medium' | 'large';
    /**
     * Called with 0-1 of the crop/encode pass — the only pass that runs when
     * the caller already cut the segment (`startTime === 0`), which is how the
     * clip worker always calls this.
     */
    onProgress?: ProgressCallback;
  }
): Promise<void> {
  const { cropStrategy, burnCaptions: shouldBurnCaptions = true, stylePreset, captionPosition, captionSize, onProgress } = options;
  const clipDuration = endTime - startTime;

  const tempDir = os.tmpdir();
  const timestamp = Date.now();
  const extractedPath = path.join(tempDir, `clip-${timestamp}-extracted.mp4`);

  // Every step below that touches pixels is a generation of quality loss, so
  // the clip is encoded exactly once: crop and captions share one filtergraph —
  // whether the captions arrive as a subtitle track or an overlay input — and
  // extraction is skipped when the caller already cut the segment.
  const needsExtraction = startTime > 0.01;
  const willBurnCaptions = shouldBurnCaptions && !!captionsResult;
  let captions: PreparedCaptions | null = null;

  try {
    let cropInput = inputVideoPath;

    if (needsExtraction) {
      console.log(`  📹 Extracting clip segment (${startTime}s - ${endTime}s)...`);
      await extractClip(inputVideoPath, startTime, endTime, extractedPath);
      cropInput = extractedPath;
    }

    if (willBurnCaptions) {
      console.log(`  💬 Preparing captions with word-level timing...`);
      captions = await prepareCaptions(
        captionsResult!,
        { captionStyle: stylePreset, captionSize, captionPosition },
        { duration: clipDuration, tempDir }
      );
    }

    console.log(`  ✂️  Applying smart crop: ${cropStrategy.method}...`);
    await cropToVerticalSmart(cropInput, outputPath, {
      ...cropStrategy,
      captions,
      durationSeconds: clipDuration,
      onProgress,
    });

    console.log(`  ✅ Clip created successfully with ${cropStrategy.method} strategy`);
  } finally {
    // inputVideoPath belongs to the caller — only our own temp files go here
    if (needsExtraction) await fs.unlink(extractedPath).catch(() => {});
    await captions?.cleanup();
  }
}

/**
 * Generate a lightweight proxy video for fast editor loading
 * 720x1280, veryfast preset — not intended for publishing
 *
 * The proxy is what the editor actually plays, so it has to look like the clip:
 * the previous 854x480 was landscape (anamorphic once the player restored the
 * 9:16 display aspect) and crf 32 blocked up faces badly.
 */
export async function generateProxy(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoFilters('scale=720:1280:flags=lanczos,setsar=1')
      .videoCodec('libx264')
      .addOption('-crf', '24')
      .addOption('-preset', 'veryfast')
      .addOption('-pix_fmt', 'yuv420p')
      .addOption('-movflags', '+faststart')
      .audioCodec('aac')
      .audioBitrate('128k')
      .output(outputPath)
      .on('end', () => {
        console.log(`  📦 Proxy generated: ${outputPath}`);
        resolve();
      })
      .on('error', (err) => reject(new Error(`Proxy generation failed: ${err.message}`)))
      .run();
  });
}
