/**
 * Highlight schemas, free of any AI SDK import.
 *
 * The cloud pipeline asks GPT for objects of this shape; the desktop app gets
 * the same shape from the user's own agent over MCP. Keeping the schemas here
 * means both paths validate against one definition.
 */

import { z } from 'zod';

/**
 * Composite layout type for multi-region 9:16 compositions
 */
export const LayoutTypeSchema = z.enum([
  'talking_head',
  'interview_split',
  'gameplay_cam',
  'tutorial_pip',
  'standard',
]).describe(
  'talking_head = single person centered; ' +
  'interview_split = two people side-by-side stacked 50/50; ' +
  'gameplay_cam = face cam top 30% + gameplay bottom 70%; ' +
  'tutorial_pip = full screen content + small face overlay corner; ' +
  'standard = use cropStrategy only (fallback)'
);

/**
 * A source/destination region for composite layouts (all values are fractions 0.0–1.0)
 */
export const LayoutRegionSchema = z.object({
  regionId: z.string().describe('Identifier e.g. "face", "gameplay", "person_a"'),
  sourceX: z.number().min(0).max(1).describe('Left edge of region in source video (fraction of source width)'),
  sourceY: z.number().min(0).max(1).describe('Top edge of region in source video (fraction of source height)'),
  sourceW: z.number().min(0).max(1).describe('Width of region in source video (fraction of source width)'),
  sourceH: z.number().min(0).max(1).describe('Height of region in source video (fraction of source height)'),
  destY: z.number().min(0).max(1).describe('Top edge of region in 1080x1920 output (fraction of 1920)'),
  destH: z.number().min(0).max(1).describe('Height of region in 1080x1920 output (fraction of 1920)'),
});

/**
 * Crop strategy for vertical video formatting
 */
export const CropStrategySchema = z.object({
  method: z.enum(['track_speaker', 'track_action', 'wide_shot', 'blur_sides'])
    .describe('Crop method: track_speaker (follow person speaking), track_action (follow movement), wide_shot (static center), blur_sides (blurred letterbox for groups OR educational_visual content)'),
  subjectPosition: z.enum(['left', 'center', 'right'])
    .describe('Expected position of main subject in frame'),
  sceneType: z.enum(['single_person', 'multiple_people', 'group', 'landscape', 'screen_recording', 'educational_visual'])
    .describe('Scene composition type'),
  reasoning: z.string().describe('Brief explanation of why this crop strategy was chosen'),
});

/**
 * Schema for a single highlight
 */
export const HighlightSchema = z.object({
  title: z.string().describe('Catchy title for this clip (max 100 chars)'),
  description: z.string().describe('Brief description of why this moment is engaging'),
  startTime: z.number().describe('Start time in seconds'),
  endTime: z.number().describe('End time in seconds'),
  hookText: z.string().describe('The hook or key phrase that makes this viral'),
  score: z.number().min(0).max(100).describe('Virality score (0-100)'),
  tags: z.array(z.string()).describe('Relevant tags (e.g., "funny", "emotional", "educational")'),
  cropStrategy: CropStrategySchema.describe('Intelligent crop strategy for converting to vertical 9:16 format'),
  layoutType: LayoutTypeSchema
    .describe('Composite layout type for the 9:16 output. Use "standard" to fall back to cropStrategy.'),
  layoutRegions: z.array(LayoutRegionSchema)
    .describe(
      'Only for interview_split, gameplay_cam, tutorial_pip. ' +
      'Defines source crop regions and their destination positions in the 1080x1920 output. ' +
      'For standard/talking_head use an empty array.'
    ),
});

export type CropStrategy = z.infer<typeof CropStrategySchema>;
export type LayoutType = z.infer<typeof LayoutTypeSchema>;
export type LayoutRegion = z.infer<typeof LayoutRegionSchema>;
export type Highlight = z.infer<typeof HighlightSchema>;
