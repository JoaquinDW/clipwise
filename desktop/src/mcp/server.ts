/**
 * The MCP surface: what the user's agent (Claude, Codex, Cursor…) can call.
 *
 * Each tool is a thin wrapper over the engine. The agent supplies judgment —
 * which moments, what title, how to frame — and pays for it with its own
 * subscription; the engine supplies the media work on the user's machine.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import type { Engine } from '../engine/engine';
import { CaptionOptionsShape, ClipSpecSchema } from '../engine/clip-spec';
import type { ClipRecord, VideoRecord } from '../engine/types';
import { CLIPPING_GUIDE } from './guide';

export interface LicenseGate {
  /** null when the engine may be used, otherwise why not, for the agent to relay. */
  denialReason(): string | null;
}

import { SERVER_NAME } from './constants';

type ToolResult = { content: Array<{ type: 'text'; text: string }>; isError?: boolean };

function ok(value: unknown): ToolResult {
  return { content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 1) }] };
}

function fail(message: string): ToolResult {
  return { content: [{ type: 'text', text: message }], isError: true };
}

/** Engine errors become tool errors the agent can read and react to, not protocol failures. */
async function guarded(fn: () => Promise<ToolResult> | ToolResult): Promise<ToolResult> {
  try {
    return await fn();
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }
}

function videoView(v: VideoRecord) {
  return {
    video_id: v.id,
    title: v.title,
    status: v.status,
    progress: v.progress,
    detail: v.detail,
    duration_seconds: v.duration ? Math.round(v.duration) : undefined,
    language: v.language,
    error: v.error,
  };
}

function clipView(c: ClipRecord) {
  return {
    clip_id: c.id,
    video_id: c.videoId,
    title: c.title,
    status: c.status,
    progress: c.progress,
    start: c.startTime,
    end: c.endTime,
    score: c.score,
    caption_style: c.captionStyle,
    crop: c.cropStrategy.method,
    file: c.filePath,
    fallback: c.renderFallback ? `${c.renderFallback.from} → ${c.renderFallback.to}: ${c.renderFallback.reason}` : undefined,
    error: c.error,
  };
}

const waitSeconds = z
  .number()
  .min(0)
  .max(50)
  .optional()
  .describe('Block up to this many seconds until the video is ready or failed (max 50). Saves polling.');

export function createMcpServer(engine: Engine, license: LicenseGate, version: string): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, title: 'Momentreel', version },
    {
      instructions:
        'Momentreel turns long videos into vertical short clips on the user\'s computer. ' +
        'You pick the moments; Momentreel downloads, transcribes, reframes and captions them. ' +
        'Read the momentreel://guide resource (or the clip_video prompt) before the first create_clips.',
    }
  );

  /**
   * registerTool, typed against our own zod only. The SDK's signature is generic
   * over zod 3 *and* 4 shapes, and inferring nested clip schemas through it runs
   * tsc out of memory; the runtime call is identical.
   */
  const tool = <S extends z.ZodRawShape = Record<string, never>>(
    name: string,
    config: { title: string; description: string; inputSchema?: S; annotations?: ToolAnnotations },
    handler: (args: z.infer<z.ZodObject<S>>) => Promise<ToolResult> | ToolResult
  ): void => {
    (server.registerTool as unknown as (n: string, c: typeof config, h: typeof handler) => void)(name, config, handler);
  };

  /** Wraps tools that do work, so an unlicensed install says why instead of failing oddly. */
  const licensed = (fn: () => Promise<ToolResult> | ToolResult) =>
    guarded(() => {
      const reason = license.denialReason();
      return reason ? fail(reason) : fn();
    });

  server.registerResource(
    'guide',
    'momentreel://guide',
    { title: 'Clipping guide', description: 'How to pick, bound and frame clips', mimeType: 'text/markdown' },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: 'text/markdown', text: CLIPPING_GUIDE }] })
  );

  // Same reason as `tool` above: the SDK's zod-3-or-4 generics, not ours
  const registerPrompt = server.registerPrompt.bind(server) as unknown as (
    name: string,
    config: { title: string; description: string; argsSchema: z.ZodRawShape },
    cb: (args: { source: string; count?: string }) => {
      messages: Array<{ role: 'user'; content: { type: 'text'; text: string } }>;
    }
  ) => void;

  registerPrompt(
    'clip_video',
    {
      title: 'Clip a video',
      description: 'Turn a long video into vertical shorts with Momentreel',
      argsSchema: {
        source: z.string().describe('YouTube link or absolute path to a video file'),
        count: z.string().optional().describe('How many clips (default 5)'),
      },
    },
    ({ source, count }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `${CLIPPING_GUIDE}\n\nClip this video into the ${count || '5'} best shorts: ${source}`,
          },
        },
      ],
    })
  );

  tool(
    'momentreel_status',
    {
      title: 'Momentreel status',
      description: 'Whether Momentreel is licensed and has its tools and transcription model installed.',
      annotations: { readOnlyHint: true },
    },
    () =>
      guarded(() => {
        const status = engine.status();
        return ok({
          license: license.denialReason() ?? 'active',
          ready: status.problems.length === 0,
          problems: status.problems,
          whisper_model: status.whisperModel,
        });
      })
  );

  tool(
    'get_clipping_guide',
    {
      title: 'Clipping guide',
      description: 'How to pick, bound and frame good clips. Read it once before the first create_clips.',
      annotations: { readOnlyHint: true },
    },
    () => ok(CLIPPING_GUIDE)
  );

  tool(
    'import_video',
    {
      title: 'Import a video',
      description:
        'Start importing a YouTube (or other yt-dlp supported) link, or an absolute path to a local video file. ' +
        'Download and transcription run on the user\'s computer in the background; returns a video_id at once.',
      inputSchema: {
        source: z.string().min(1).describe('https:// link, or absolute file path'),
        title: z.string().optional(),
        wait_seconds: waitSeconds,
      },
    },
    ({ source, title, wait_seconds }) =>
      licensed(async () => {
        const video = engine.importVideo({ source, title });
        const current = wait_seconds ? await engine.waitForVideo(video.id, wait_seconds) : video;
        return ok(videoView(current));
      })
  );

  tool(
    'get_video',
    {
      title: 'Get a video',
      description: 'Status and progress of an imported video. Poll with wait_seconds until status is "ready".',
      inputSchema: { video_id: z.string(), wait_seconds: waitSeconds },
      annotations: { readOnlyHint: true },
    },
    ({ video_id, wait_seconds }) =>
      guarded(async () => {
        const video = wait_seconds ? await engine.waitForVideo(video_id, wait_seconds) : engine.library.getVideo(video_id);
        if (!video) return fail(`Video ${video_id} not found`);
        return ok(videoView(video));
      })
  );

  tool(
    'list_videos',
    {
      title: 'List videos',
      description: 'Every video in the user\'s Momentreel library, newest first.',
      annotations: { readOnlyHint: true },
    },
    () => guarded(() => ok(engine.library.listVideos().map(videoView)))
  );

  tool(
    'get_transcript',
    {
      title: 'Get transcript',
      description:
        'Timestamped transcript lines "[start-end] text" (seconds from the start of the video). ' +
        'Paged: when next_from is set, call again with from=next_from for the rest.',
      inputSchema: {
        video_id: z.string(),
        from: z.number().min(0).optional().describe('Seconds; default 0'),
        to: z.number().min(0).optional().describe('Seconds; default the end'),
      },
      annotations: { readOnlyHint: true },
    },
    ({ video_id, from, to }) =>
      guarded(async () => {
        const page = await engine.getTranscriptPage(video_id, { from, to });
        return ok({
          duration_seconds: Math.round(page.duration),
          language: page.language,
          next_from: page.nextFrom,
          lines: page.lines,
        });
      })
  );

  tool(
    'get_candidates',
    {
      title: 'Get candidate moments',
      description:
        'For videos over 5 minutes: the strongest ~30 s windows by a heuristic score (emotion, strong statements, ' +
        'Q&A, story arc, pace), each with its transcript lines. Start here instead of reading everything. ' +
        'For short videos it returns mode "full": read get_transcript instead.',
      inputSchema: { video_id: z.string(), limit: z.number().int().min(1).max(40).optional() },
      annotations: { readOnlyHint: true },
    },
    ({ video_id, limit }) => guarded(async () => ok(await engine.getCandidates(video_id, limit)))
  );

  tool(
    'create_clips',
    {
      title: 'Create clips',
      description:
        'Queue vertical 9:16 clips for rendering with captions and reframing. Times are seconds from the start ' +
        'of the source video, on sentence boundaries. Returns the clips at once; poll list_clips for progress.',
      inputSchema: {
        video_id: z.string(),
        clips: z.array(ClipSpecSchema).min(1).max(20),
        ...CaptionOptionsShape,
      },
    },
    ({ video_id, clips, captionStyle, captionPosition, captionSize, burnCaptions }) =>
      licensed(() => {
        const result = engine.createClips(video_id, clips, {
          captionStyle: captionStyle ?? engine.settings.get().defaultCaptionStyle,
          captionPosition,
          captionSize,
          burnCaptions,
        });
        return ok({ created: result.created.map(clipView), rejected: result.rejected });
      })
  );

  tool(
    'list_clips',
    {
      title: 'List clips',
      description: 'Clips with their render status and, once ready, the path of the finished MP4.',
      inputSchema: { video_id: z.string().optional() },
      annotations: { readOnlyHint: true },
    },
    ({ video_id }) => guarded(() => ok(engine.library.listClips(video_id).map(clipView)))
  );

  tool(
    'update_clip',
    {
      title: 'Update a clip',
      description: 'Change a clip\'s bounds, title, captions or framing, and render it again.',
      inputSchema: {
        clip_id: z.string(),
        title: z.string().min(1).max(120).optional(),
        startTime: z.number().min(0).optional(),
        endTime: z.number().positive().optional(),
        hookText: z.string().max(200).optional(),
        cropMethod: z.enum(['track_speaker', 'track_action', 'wide_shot', 'blur_sides']).optional(),
        subjectPosition: z.enum(['left', 'center', 'right']).optional(),
        ...CaptionOptionsShape,
      },
    },
    ({ clip_id, cropMethod, subjectPosition, ...patch }) =>
      licensed(() => {
        const clip = engine.updateClip(clip_id, {
          ...patch,
          cropStrategy: {
            ...(cropMethod ? { method: cropMethod } : {}),
            ...(subjectPosition ? { subjectPosition } : {}),
          },
        });
        return ok(clipView(clip));
      })
  );

  tool(
    'delete_clip',
    {
      title: 'Delete a clip',
      description: 'Delete a clip and its rendered file.',
      inputSchema: { clip_id: z.string() },
      annotations: { destructiveHint: true },
    },
    ({ clip_id }) =>
      guarded(async () => {
        await engine.deleteClip(clip_id);
        return ok({ deleted: clip_id });
      })
  );

  return server;
}
