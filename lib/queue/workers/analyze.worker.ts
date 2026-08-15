/* eslint-disable @typescript-eslint/no-explicit-any */
import { Worker, Job } from 'bullmq';
import { prismaClientGlobal } from '@/infra/prisma';
import { detectHighlights } from '@/lib/ai/highlights';
import { scoreWindows, buildExpandedWindows, SHORT_VIDEO_BYPASS_SECONDS } from '@/lib/ai/scoring';
import { rankCandidates, rankedCandidateToHighlight } from '@/lib/ai/rank-candidates';
import { createRedisConnection, QUEUE_NAME, enqueueClip, type AnalyzeJobData } from '../queue';
import type { TranscriptionSegment } from '@/lib/ai/transcribe';
import type { Highlight } from '@/lib/ai/highlights';
import { getPlanLimits } from '@/lib/plans';

export async function processAnalyze(job: Job<AnalyzeJobData>) {
  const { videoId } = job.data;
  const startMs = Date.now();
  console.log(`[analyze] Starting for video ${videoId}`);

  const video = await prismaClientGlobal.video.findUnique({
    where: { id: videoId },
    include: { transcription: true, company: { select: { plan: true } } },
  });

  if (!video?.transcription) throw new Error('No transcription found for video');

  const segments = video.transcription.segments as unknown as TranscriptionSegment[];
  const videoDuration = segments.length > 0 ? segments[segments.length - 1].end : 0;
  const captionStyle = (video.metadata as any)?.captionStyle;
  const maxClips = getPlanLimits(video.company.plan).maxClipsPerVideo;

  let highlights: Highlight[];

  if (videoDuration < SHORT_VIDEO_BYPASS_SECONDS) {
    // ── Short video: legacy GPT path (unchanged) ──────────────────────────────
    console.log(`[analyze] Short video (${videoDuration.toFixed(0)}s) — using legacy GPT path`);

    await prismaClientGlobal.video.update({
      where: { id: videoId },
      data: { status: 'PROCESSING' },
    });

    const result = await detectHighlights(segments, {
      maxHighlights: maxClips,
      minDuration: 15,
      maxDuration: 60,
      targetAudience: 'TikTok, Instagram Reels, YouTube Shorts users',
      contentType: 'video content',
    });

    highlights = result.highlights;

  } else {
    // ── Long video: V2.1 Candidate-First pipeline ─────────────────────────────

    // Phase 1: Heuristic Scoring
    await prismaClientGlobal.video.update({
      where: { id: videoId },
      data: { status: 'SCORING' },
    });
    console.log(`[analyze] SCORING phase — ${segments.length} segments, ${videoDuration.toFixed(0)}s video`);

    const scoredWindows = scoreWindows(segments, {
      windowDuration: 30,
      windowStep: 15,
      topK: 20,
      minScore: 0.18,
    });

    console.log(`[analyze] ${scoredWindows.length} candidates after heuristic scoring`);

    // Phase 2: Context Expansion
    const expandedWindows = buildExpandedWindows(scoredWindows, segments, 30);

    // Phase 3: Persist Candidate records
    await prismaClientGlobal.candidate.deleteMany({ where: { videoId } });
    if (expandedWindows.length > 0) {
      await prismaClientGlobal.candidate.createMany({
        data: expandedWindows.map((w) => ({
          videoId,
          startTime: w.startTime,
          endTime: w.endTime,
          expandedStart: w.expandedStart,
          expandedEnd: w.expandedEnd,
          transcript: w.text,
          heuristicScore: w.heuristicScore,
        })),
      });
    }

    // Phase 4: GPT Ranking
    await prismaClientGlobal.video.update({
      where: { id: videoId },
      data: { status: 'RANKING' },
    });
    console.log(`[analyze] RANKING phase — sending ${expandedWindows.length} candidates to GPT`);

    const rankingResult = await rankCandidates(expandedWindows, {
      maxClips,
      minDuration: 15,
      maxDuration: 60,
      targetAudience: 'TikTok, Instagram Reels, YouTube Shorts users',
      contentType: 'video content',
    });

    // Update gptScore + rank on Candidate records
    const candidateRecords = await prismaClientGlobal.candidate.findMany({
      where: { videoId },
      orderBy: { heuristicScore: 'desc' },
    });

    await Promise.all(
      rankingResult.rankedClips.map(async (rc) => {
        const record = candidateRecords[rc.candidateIndex - 1];
        if (!record) return;
        await prismaClientGlobal.candidate.update({
          where: { id: record.id },
          data: {
            gptScore: rc.score / 100,
            rank: rankingResult.rankedClips.indexOf(rc) + 1,
          },
        });
      })
    );

    // Metrics logging
    const fullTranscriptTokenEstimate = Math.round(
      segments.map((s) => s.text).join(' ').length / 4
    );
    const actualTokenEstimate = Math.round(
      expandedWindows.map((w) => w.text).join(' ').length / 4
    );
    const compressionRatio = actualTokenEstimate / Math.max(fullTranscriptTokenEstimate, 1);

    await prismaClientGlobal.video.update({
      where: { id: videoId },
      data: {
        analysisMetrics: {
          fullTranscriptTokenEstimate,
          actualTokenEstimate,
          compressionRatio: +compressionRatio.toFixed(3),
          candidateCount: expandedWindows.length,
          durationMs: Date.now() - startMs,
        },
      },
    });

    console.log(
      `[analyze] Token compression: ${fullTranscriptTokenEstimate} → ${actualTokenEstimate} tokens ` +
      `(${Math.round((1 - compressionRatio) * 100)}% reduction, ${expandedWindows.length} candidates)`
    );

    highlights = rankingResult.rankedClips.map(rankedCandidateToHighlight);
  }

  // ── Create Clip records & enqueue (unchanged for both paths) ─────────────────
  await prismaClientGlobal.video.update({
    where: { id: videoId },
    data: { status: 'PROCESSING' },
  });

  // The model can overshoot; the plan limit is the hard cap.
  highlights = highlights.slice(0, maxClips);

  console.log(`[analyze] Found ${highlights.length} highlights (plan cap: ${maxClips})`);

  await Promise.all(
    highlights.map(async (highlight) => {
      const clip = await prismaClientGlobal.clip.create({
        data: {
          videoId,
          title: highlight.title,
          description: highlight.description,
          startTime: highlight.startTime,
          endTime: highlight.endTime,
          duration: highlight.endTime - highlight.startTime,
          score: highlight.score,
          status: 'PENDING',
          metadata: {
            hookText: highlight.hookText,
            tags: highlight.tags,
            cropStrategy: {
              method: highlight.cropStrategy.method,
              subjectPosition: highlight.cropStrategy.subjectPosition,
              sceneType: highlight.cropStrategy.sceneType,
              reasoning: highlight.cropStrategy.reasoning,
            },
            layoutType: highlight.layoutType ?? 'standard',
            layoutRegions: highlight.layoutRegions?.length ? highlight.layoutRegions : null,
            captionStyle: captionStyle ?? null,
          },
        },
      });

      await enqueueClip({ videoId, clipId: clip.id });
      console.log(`[analyze] Enqueued clip job for: ${highlight.title}`);
    })
  );
}

export function startAnalyzeWorker() {
  const worker = new Worker<AnalyzeJobData>(
    QUEUE_NAME,
    async (job) => {
      if (job.name === 'analyze') await processAnalyze(job);
    },
    { connection: createRedisConnection(), concurrency: 2 }
  );

  worker.on('failed', async (job, err) => {
    console.error(`[analyze] Job failed for video ${job?.data.videoId}:`, err.message);
    if (job?.data.videoId) {
      await prismaClientGlobal.video.update({
        where: { id: job.data.videoId },
        data: { status: 'FAILED', errorMessage: err.message },
      }).catch(() => {});
    }
  });

  return worker;
}
