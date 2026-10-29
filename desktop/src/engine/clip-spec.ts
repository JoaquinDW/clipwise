/**
 * What an agent hands us to cut a clip.
 *
 * Built from the same schemas the cloud pipeline asked GPT to fill, so an agent
 * that follows the guide produces exactly what the renderer already understands.
 * Everything beyond the time range is optional: a model that only returns
 * "start, end, title" still gets a sensible face-tracked clip.
 */
import { z } from 'zod';
import { CropStrategySchema, LayoutRegionSchema, LayoutTypeSchema } from '@/lib/ai/highlight-schema';

export const CAPTION_STYLE_IDS = ['classic', 'bold', 'minimal', 'viral', 'podcast'] as const;

export const CaptionOptionsShape = {
  captionStyle: z.enum(CAPTION_STYLE_IDS).optional().describe('Caption look. Defaults to the style chosen in the app.'),
  captionPosition: z.enum(['top', 'center', 'bottom']).optional(),
  captionSize: z.enum(['small', 'medium', 'large']).optional(),
  burnCaptions: z.boolean().optional().describe('Burn captions into the video (default true). False gives a clean clip.'),
};

export const ClipSpecSchema = z.object({
  title: z.string().min(1).max(120).describe('Catchy title in the language of the video'),
  startTime: z.number().min(0).describe('Start in seconds from the start of the source video, at the beginning of a sentence'),
  endTime: z.number().positive().describe('End in seconds, at the end of a sentence'),
  description: z.string().max(500).optional().describe('Why this moment works'),
  hookText: z.string().max(200).optional().describe('The phrase that stops the scroll'),
  score: z.number().min(0).max(100).optional().describe('Virality score 0-100'),
  tags: z.array(z.string()).max(10).optional(),
  cropStrategy: CropStrategySchema.partial().optional().describe(
    'How to reframe to 9:16. method: track_speaker (one person talking), track_action (one person moving), ' +
      'blur_sides (2+ people or full-width visuals), wide_shot (static center crop).'
  ),
  layoutType: LayoutTypeSchema.optional(),
  layoutRegions: z.array(LayoutRegionSchema).optional().describe('Only for interview_split, gameplay_cam and tutorial_pip'),
});

export type ClipSpec = z.infer<typeof ClipSpecSchema>;

/** Hard bounds for a short-form clip. Outside them the platforms reject or bury it. */
export const MIN_CLIP_SECONDS = 5;
export const MAX_CLIP_SECONDS = 180;

/** Returns a reason the clip can't be cut, or null. */
export function validateClipRange(spec: { startTime: number; endTime: number }, videoDuration?: number): string | null {
  const length = spec.endTime - spec.startTime;
  if (length < MIN_CLIP_SECONDS) return `is ${length.toFixed(1)}s long; clips need at least ${MIN_CLIP_SECONDS}s`;
  if (length > MAX_CLIP_SECONDS) return `is ${length.toFixed(1)}s long; clips can be at most ${MAX_CLIP_SECONDS}s`;
  if (videoDuration && spec.endTime > videoDuration + 0.5) {
    return `ends at ${spec.endTime.toFixed(1)}s but the video is ${videoDuration.toFixed(1)}s long`;
  }
  return null;
}
