import { prismaClientGlobal } from '@/infra/prisma';

/**
 * Progress reporting for the video pipeline.
 *
 * Workers only ever say "I am N% through my own stage". The mapping from a
 * stage to its slice of the overall 0-100 bar lives here and nowhere else, so
 * re-balancing the pipeline (or inserting a stage) is a one-table change
 * instead of an edit in five workers plus the status API.
 */

export type VideoStage =
  | 'UPLOADING'
  | 'UPLOADED'
  | 'INGESTING'
  | 'INGESTED'
  | 'TRANSCRIBING'
  | 'TRANSCRIBED'
  | 'SCORING'
  | 'RANKING'
  | 'PROCESSING'
  | 'READY'
  | 'FAILED';

/**
 * [start, end] of the global bar each stage owns.
 *
 * INGESTING and PROCESSING get the widest bands because they are the two
 * stages that report real sub-progress (bytes downloaded, clips rendered) and
 * are also where most of the wall-clock time goes.
 */
export const STAGE_BANDS: Record<VideoStage, [number, number]> = {
  UPLOADING: [0, 5],
  UPLOADED: [5, 10],
  INGESTING: [10, 35],
  INGESTED: [35, 38],
  TRANSCRIBING: [38, 62],
  TRANSCRIBED: [62, 66],
  SCORING: [66, 72],
  RANKING: [72, 78],
  PROCESSING: [78, 100],
  READY: [100, 100],
  FAILED: [0, 0],
};

const clampPct = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/** Absolute 0-100 progress from a stage plus how far into it we are. */
export function composeProgress(status: string, stageProgress = 0): number {
  const band = STAGE_BANDS[status as VideoStage];
  if (!band) return 0;
  const [start, end] = band;
  return clampPct(start + ((end - start) * clampPct(stageProgress)) / 100);
}

/** Map a 0-1 fraction onto a sub-range of the current stage. */
export function subBand(from: number, to: number, fraction: number): number {
  return clampPct(from + (to - from) * Math.max(0, Math.min(1, fraction)));
}

type Reporter = {
  /** Record progress. Writes are coalesced; safe to call on every ffmpeg tick. */
  report: (pct: number, detail?: string) => void;
  /** Force the pending value out, e.g. before moving to the next stage. */
  flush: () => Promise<void>;
};

type ReporterOptions = {
  /** Skip a write unless the percentage moved at least this much. */
  minDeltaPct?: number;
  /** Never write more often than this. */
  minIntervalMs?: number;
};

/**
 * Throttled writer. yt-dlp and ffmpeg both emit progress several times per
 * second, and the Supavisor pooler this project runs behind caps us at a
 * handful of connections (see CLAUDE.md on `connection_limit=5`), so writing
 * every tick is not an option. A changed `detail` string always gets through —
 * it is what the user actually reads — while the percentage is rate limited.
 */
function makeReporter(
  write: (pct: number, detail: string | null) => Promise<unknown>,
  { minDeltaPct = 2, minIntervalMs = 1500 }: ReporterOptions = {}
): Reporter {
  let lastWrittenPct = -1;
  let lastWrittenAt = 0;
  let lastDetail: string | null = null;
  let pending: { pct: number; detail: string | null } | null = null;
  let inFlight: Promise<unknown> = Promise.resolve();

  const push = (pct: number, detail: string | null) => {
    lastWrittenPct = pct;
    lastWrittenAt = Date.now();
    lastDetail = detail;
    pending = null;
    // Progress is cosmetic: a failed write must never take down a render.
    inFlight = write(pct, detail).catch((err) =>
      console.warn('[progress] write failed (ignored):', err?.message ?? err)
    );
  };

  return {
    report(rawPct, detail) {
      const pct = clampPct(rawPct);
      const nextDetail = detail ?? lastDetail;
      const detailChanged = nextDetail !== lastDetail;
      const movedEnough = Math.abs(pct - lastWrittenPct) >= minDeltaPct;
      const waitedEnough = Date.now() - lastWrittenAt >= minIntervalMs;

      if (detailChanged || (movedEnough && waitedEnough)) {
        push(pct, nextDetail);
      } else {
        pending = { pct, detail: nextDetail };
      }
    },
    async flush() {
      if (pending) push(pending.pct, pending.detail);
      await inFlight;
    },
  };
}

export function makeStageReporter(videoId: string, options?: ReporterOptions): Reporter {
  return makeReporter(
    (stageProgress, stageDetail) =>
      prismaClientGlobal.video.update({
        where: { id: videoId },
        data: { stageProgress, stageDetail },
      }),
    options
  );
}

export function makeClipReporter(clipId: string, options?: ReporterOptions): Reporter {
  return makeReporter(
    (progress) =>
      prismaClientGlobal.clip.update({
        where: { id: clipId },
        data: { progress },
      }),
    options
  );
}

/**
 * Move the video to a new stage. Resets `stageProgress` in the same write so a
 * stage can never inherit the previous one's percentage — which is exactly how
 * a bar ends up jumping backwards.
 */
export async function setStage(videoId: string, status: VideoStage, detail?: string) {
  await prismaClientGlobal.video.update({
    where: { id: videoId },
    data: { status, stageProgress: 0, stageDetail: detail ?? null },
  });
}
