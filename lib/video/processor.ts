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
import { CaptionsResult, captionsToASS } from '../ai/captions';
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
      .videoCodec('libx264')
      .audioCodec('aac')
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
    position?: 'center' | 'top' | 'bottom'; // Default: center
  }
): Promise<void> {
  const { width = 1080, height = 1920, position = 'center' } = options || {};

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

      // Calculate crop position
      let cropX = 0;
      let cropY = 0;

      // Calculate target dimensions maintaining 9:16 aspect ratio
      const targetAspect = 9 / 16;
      const sourceAspect = sourceWidth / sourceHeight;

      if (sourceAspect > targetAspect) {
        // Source is wider - crop horizontally
        const cropWidth = Math.floor(sourceHeight * targetAspect);
        cropX = Math.floor((sourceWidth - cropWidth) / 2);
        cropY = 0;

        ffmpeg(inputPath)
          .videoFilters([
            {
              filter: 'crop',
              options: {
                w: cropWidth,
                h: sourceHeight,
                x: cropX,
                y: cropY,
              },
            },
            {
              filter: 'scale',
              options: {
                w: width,
                h: height,
              },
            },
          ])
          .output(outputPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(new Error(`FFmpeg error: ${err.message}`)))
          .run();
      } else {
        // Source is taller - crop vertically
        const cropHeight = Math.floor(sourceWidth / targetAspect);

        // Position crop based on option
        if (position === 'top') {
          cropY = 0;
        } else if (position === 'bottom') {
          cropY = sourceHeight - cropHeight;
        } else {
          cropY = Math.floor((sourceHeight - cropHeight) / 2);
        }

        cropX = 0;

        ffmpeg(inputPath)
          .videoFilters([
            {
              filter: 'crop',
              options: {
                w: sourceWidth,
                h: cropHeight,
                x: cropX,
                y: cropY,
              },
            },
            {
              filter: 'scale',
              options: {
                w: width,
                h: height,
              },
            },
          ])
          .output(outputPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(new Error(`FFmpeg error: ${err.message}`)))
          .run();
      }
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

export interface SmartCropOptions {
  method: CropMethod;
  subjectPosition: SubjectPosition;
  width?: number; // Default: 1080
  height?: number; // Default: 1920
  compositeLayout?: CompositeLayoutOptions;
}

/**
 * Smart crop video to vertical 9:16 format with AI-driven strategies
 *
 * V2 Engine with multiple crop methods:
 * - track_speaker: Smooth tracking for talking heads (zoompan filter)
 * - track_action: Dynamic tracking for movement (zoompan with motion)
 * - wide_shot: Static center crop (fallback to cropToVertical)
 * - blur_sides: Blurred letterbox for groups (split + blur + overlay)
 */
export async function cropToVerticalSmart(
  inputPath: string,
  outputPath: string,
  options: SmartCropOptions
): Promise<void> {
  const { method, subjectPosition, width = 1080, height = 1920 } = options;

  console.log(`🎬 Smart Crop: Using "${method}" strategy with subject at "${subjectPosition}"`);

  // For wide_shot, use existing cropToVertical function
  if (method === 'wide_shot') {
    return cropToVertical(inputPath, outputPath, { width, height, position: 'center' });
  }

  return new Promise((resolve, reject) => {
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

      // Composite layout takes priority over single-region crop strategies
      if (options.compositeLayout && options.compositeLayout.layoutType !== 'standard') {
        return cropToVerticalComposite(inputPath, outputPath, options.compositeLayout, sourceWidth, sourceHeight)
          .then(resolve)
          .catch(reject);
      }

      try {
        let filterComplex: string;

        switch (method) {
          case 'blur_sides':
            filterComplex = buildBlurSidesFilter(sourceWidth, sourceHeight, width, height);
            break;

          case 'track_speaker':
            filterComplex = buildTrackSpeakerFilter(sourceWidth, sourceHeight, width, height, subjectPosition);
            break;

          case 'track_action':
            filterComplex = buildTrackActionFilter(sourceWidth, sourceHeight, width, height, subjectPosition);
            break;

          default:
            // Fallback to simple center crop
            return cropToVertical(inputPath, outputPath, { width, height, position: 'center' })
              .then(resolve)
              .catch(reject);
        }

        console.log(`📐 Applying filter: ${filterComplex.substring(0, 100)}...`);

        ffmpeg(inputPath)
          .complexFilter(filterComplex)
          .output(outputPath)
          .outputOptions(['-map', '[out]'])
          .videoCodec('libx264')
          .audioCodec('copy')
          .on('end', () => {
            console.log(`✅ Smart crop completed: ${method}`);
            resolve();
          })
          .on('error', (err) => {
            console.warn(`⚠️  Smart crop (${method}) failed, falling back to wide_shot: ${err.message}`);
            cropToVertical(inputPath, outputPath, { width, height, position: 'center' })
              .then(resolve)
              .catch(reject);
          })
          .run();
      } catch (error) {
        reject(error);
      }
    });
  });
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
 * Build track_speaker filter for talking heads
 * Uses smooth panning zoompan filter to follow the speaker
 */
function buildTrackSpeakerFilter(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  position: SubjectPosition
): string {
  const targetAspect = 9 / 16;
  const cropWidth = Math.floor(sourceHeight * targetAspect);

  // Calculate initial X position based on subject position
  let initialX: number;
  if (position === 'left') {
    initialX = Math.floor(sourceWidth * 0.2); // 20% from left
  } else if (position === 'right') {
    initialX = Math.floor(sourceWidth * 0.8 - cropWidth); // 80% from left
  } else {
    initialX = Math.floor((sourceWidth - cropWidth) / 2); // center
  }

  // Normalize to CFR first — zoompan requires constant frame rate (VFR from yt-dlp causes "Error reinitializing filters")
  return `
    [0:v]fps=30[cfr];
    [cfr]zoompan=
      z='1':
      x='${initialX}+sin(t/5)*20':
      y='0':
      d=1:
      s=${targetWidth}x${targetHeight}:
      fps=30
    [out]
  `.trim().replace(/\n\s+/g, '');
}

/**
 * Build track_action filter for dynamic movement
 * Similar to track_speaker but with more responsive tracking
 */
function buildTrackActionFilter(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  position: SubjectPosition
): string {
  const targetAspect = 9 / 16;
  const cropWidth = Math.floor(sourceHeight * targetAspect);

  // Calculate initial X position based on subject position
  let initialX: number;
  if (position === 'left') {
    initialX = Math.floor(sourceWidth * 0.2);
  } else if (position === 'right') {
    initialX = Math.floor(sourceWidth * 0.8 - cropWidth);
  } else {
    initialX = Math.floor((sourceWidth - cropWidth) / 2);
  }

  // Normalize to CFR first — zoompan requires constant frame rate (VFR from yt-dlp causes "Error reinitializing filters")
  return `
    [0:v]fps=30[cfr];
    [cfr]zoompan=
      z='1':
      x='${initialX}+sin(t/3)*40':
      y='0':
      d=1:
      s=${targetWidth}x${targetHeight}:
      fps=30
    [out]
  `.trim().replace(/\n\s+/g, '');
}

/**
 * Burn captions into video with word-by-word karaoke highlighting
 *
 * Uses ASS (Advanced SubStation Alpha) format for precise word-level highlighting
 * Position is at 3/4 screen height (MarginV=200) as specified
 */
export async function burnCaptions(
  inputPath: string,
  captionsResult: CaptionsResult,
  outputPath: string,
  stylePreset?: string
): Promise<void> {
  // Create ASS file for captions with word-by-word highlighting
  const assPath = path.join(os.tmpdir(), `captions-${Date.now()}.ass`);
  const assContent = captionsToASS(captionsResult, stylePreset as any);
  await fs.writeFile(assPath, assContent, 'utf-8');

  // Log ASS content for debugging
  console.log('Generated ASS captions:', assContent);

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        `-vf ass=${assPath}`,
      ])
      .output(outputPath)
      .on('end', async () => {
        // Clean up temp ASS file
        try {
          await fs.unlink(assPath);
        } catch (e) {
          // Ignore cleanup errors
        }
        resolve();
      })
      .on('error', async (err) => {
        // Clean up temp ASS file
        try {
          await fs.unlink(assPath);
        } catch (e) {
          // Ignore cleanup errors
        }
        reject(new Error(`FFmpeg error: ${err.message}`));
      })
      .run();
  });
}

/**
 * Generate thumbnail from video
 */
export async function generateThumbnail(
  inputPath: string,
  outputPath: string,
  timestamp: number = 1 // seconds
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .screenshots({
        timestamps: [timestamp],
        filename: path.basename(outputPath),
        folder: path.dirname(outputPath),
        size: '1080x1920',
      })
      .on('end', () => resolve())
      .on('error', (err) => reject(new Error(`FFmpeg error: ${err.message}`)))
      .run();
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
  sourceHeight: number
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

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .complexFilter(filterComplex)
      .output(outputPath)
      .outputOptions(['-map', '[out]'])
      .videoCodec('libx264')
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
  }
): Promise<void> {
  const { cropStrategy, burnCaptions: shouldBurnCaptions = true, stylePreset } = options;

  const tempDir = os.tmpdir();
  const timestamp = Date.now();

  try {
    // Step 1: Extract clip
    console.log(`  📹 Extracting clip segment (${startTime}s - ${endTime}s)...`);
    const extractedPath = path.join(tempDir, `clip-${timestamp}-extracted.mp4`);
    await extractClip(inputVideoPath, startTime, endTime, extractedPath);

    // Step 2: Smart crop to vertical with AI strategy
    console.log(`  ✂️  Applying smart crop: ${cropStrategy.method}...`);
    const croppedPath = path.join(tempDir, `clip-${timestamp}-cropped.mp4`);
    await cropToVerticalSmart(extractedPath, croppedPath, cropStrategy);
    await fs.unlink(extractedPath); // Clean up

    // Step 3: Burn captions with word-by-word highlighting (optional)
    if (shouldBurnCaptions && captionsResult) {
      console.log(`  💬 Burning captions with word-level timing...`);
      await burnCaptions(croppedPath, captionsResult, outputPath, stylePreset);
      await fs.unlink(croppedPath); // Clean up
    } else {
      // Just move the file to output
      await fs.rename(croppedPath, outputPath);
    }

    console.log(`  ✅ Clip created successfully with ${cropStrategy.method} strategy`);
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
