/**
 * Caption schemas, free of any AI SDK import.
 *
 * The stored caption JSON has this shape whether GPT produced it (cloud) or the
 * desktop engine built it from Whisper's word timings, so the renderer and the
 * desktop app import the types from here rather than from the GPT module.
 */

import { z } from 'zod';

/**
 * Schema for a single word in a caption with highlight timing
 */
const CaptionWordSchema = z.object({
  word: z.string().describe('Individual word'),
  startTime: z.number().describe('Word start time in seconds'),
  endTime: z.number().describe('Word end time in seconds'),
  emphasis: z.boolean().describe('Whether to emphasize this word'),
});

/**
 * Schema for a single caption segment (group of 2-4 words)
 */
const CaptionSegmentSchema = z.object({
  startTime: z.number().describe('Start time in seconds'),
  endTime: z.number().describe('End time in seconds'),
  words: z.array(CaptionWordSchema).describe('Words in this caption segment with individual timings'),
  position: z.enum(['top', 'center', 'bottom']).describe('Position on screen'),
});

/**
 * Schema for the complete caption result
 */
export const CaptionsResultSchema = z.object({
  captions: z.array(CaptionSegmentSchema).describe('Optimized caption segments (2-4 words each)'),
  style: z.object({
    fontSize: z.number().describe('Font size in pixels (recommended: 36)'),
    color: z.string().describe('Text color (hex, default: white)'),
    highlightColor: z.string().describe('Highlight background color for active word (hex, e.g., yellow)'),
  }),
  hook: z.string().describe('Opening hook text to overlay (first 2-3 seconds)'),
});

export type CaptionWord = z.infer<typeof CaptionWordSchema>;
export type CaptionSegment = z.infer<typeof CaptionSegmentSchema>;
export type CaptionsResult = z.infer<typeof CaptionsResultSchema>;
