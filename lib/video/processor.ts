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
 * Burn captions into video with word-by-word karaoke highlighting
 *
 * Uses ASS (Advanced SubStation Alpha) format for precise word-level highlighting
 * Position is at 3/4 screen height (MarginV=200) as specified
 */
export async function burnCaptions(
  inputPath: string,
  captionsResult: CaptionsResult,
  outputPath: string
): Promise<void> {
  // Create ASS file for captions with word-by-word highlighting
  const assPath = path.join(os.tmpdir(), `captions-${Date.now()}.ass`);
  const assContent = captionsToASS(captionsResult);
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
