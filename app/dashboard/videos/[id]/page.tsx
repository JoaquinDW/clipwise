import { prismaClientGlobal } from "@/infra/prisma"
import Link from "next/link"
import { notFound } from "next/navigation"
import VideoActions from "./VideoActions"
import VideoStatusPoller from "./VideoStatusPoller"
import ClipsSection from "./ClipsSection"

export default async function VideoDetailPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { clip?: string }
}) {
  const { id } = params

  const video = await prismaClientGlobal.video.findUnique({
    where: { id },
    include: {
      transcription: true,
      clips: { orderBy: { score: "desc" } },
    },
  })

  if (!video) notFound()

  const isProcessing = !["READY", "FAILED"].includes(video.status)
  const isStream =
    (video.source as string) === "TWITCH" || (video.source as string) === "KICK"

  const processingLabel: Record<string, string> = {
    UPLOADING: "Waiting to start…",
    UPLOADED: "Queued for processing…",
    INGESTING: isStream
      ? "Downloading stream in chunks — transcription starts immediately…"
      : "Extracting audio from video…",
    INGESTED: "Audio ready, starting transcription…",
    TRANSCRIBING: isStream
      ? "Transcribing chunks in parallel…"
      : "Transcribing audio…",
    TRANSCRIBED: "Detecting highlights with AI…",
    PROCESSING: `Generating clips (${video.clips.filter((c) => c.status === "READY").length}/${video.clips.length} ready)…`,
  }

  return (
    <div
      className="-m-6 flex flex-col"
      style={{ height: "calc(100vh - 4rem)" }}
    >
      <VideoStatusPoller videoId={video.id} currentStatus={video.status} />

      {/* Sticky header */}
      <header
        className="sticky top-0 z-40 flex-none flex items-center gap-3 px-4 h-10 border-b"
        style={{
          background: "#0e0f11",
          borderColor: "rgba(255,255,255,0.06)",
        }}
      >
        {/* Back */}
        <Link
          href="/dashboard/videos"
          className="flex-none flex items-center gap-1 text-xs transition-colors"
          style={{ color: "var(--dash-text-muted)" }}
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back
        </Link>

        <span style={{ color: "rgba(255,255,255,0.12)" }}>|</span>

        {/* Title */}
        <h1
          className="text-sm font-semibold truncate flex-1 min-w-0"
          style={{
            fontFamily: "var(--font-syne), sans-serif",
            color: "#f2ede8",
          }}
        >
          {video.title}
        </h1>

        {/* Status badge */}
        <StatusBadge status={video.status} />

        {/* Processing spinner */}
        {isProcessing && (
          <div className="flex items-center gap-2 flex-none">
            <svg
              className="animate-spin h-3.5 w-3.5 flex-none"
              fill="none"
              viewBox="0 0 24 24"
              style={{ color: "#FF3B5C" }}
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            <span
              className="text-xs hidden sm:block"
              style={{ color: "var(--dash-text-muted)" }}
            >
              {processingLabel[video.status] ?? "Processing…"}
            </span>
          </div>
        )}

        {/* Error message */}
        {video.status === "FAILED" && video.errorMessage && (
          <span className="text-xs text-red-400 flex-none hidden sm:block truncate max-w-48">
            {video.errorMessage}
          </span>
        )}

        {/* Action buttons */}
        <div className="flex-none">
          <VideoActions
            videoId={video.id}
            status={video.status}
            hasTranscription={!!video.transcription}
            variant="header"
          />
        </div>
      </header>

      {/* Main content — 2 columns */}
      <div className="flex flex-1 pt-5 min-h-0">
        <ClipsSection
          clips={video.clips.map((c) => {
            const meta = c.metadata as Record<string, unknown> | null
            return {
              id: c.id,
              title: c.title ?? "",
              description: c.description ?? null,
              storageUrl: c.storageUrl ?? null,
              thumbnailUrl: c.thumbnailUrl ?? null,
              score: c.score ?? 0,
              status: c.status,
              startTime: c.startTime ?? 0,
              endTime: c.endTime ?? 0,
              duration: c.duration ?? 0,
              metadata: c.metadata,
              parentClipId: c.parentClipId ?? null,
              captions: (c.captions ?? null) as
                | import("@/lib/ai/captions").CaptionsResult
                | null,
              proxyUrl: (meta?.proxyUrl as string) ?? null,
              captionStyle: (meta?.captionStyle as string) ?? null,
              captionPosition:
                (meta?.captionPosition as "top" | "center" | "bottom") ?? null,
              captionSize:
                (meta?.captionSize as "small" | "medium" | "large") ?? null,
            }
          })}
          initialClipId={searchParams.clip ?? null}
          videoClipsCount={video.clips.length}
          videoStatus={video.status}
          transcription={
            video.transcription
              ? {
                text: video.transcription.text,
                language: video.transcription.language,
                segments: Array.isArray(video.transcription.segments)
                  ? video.transcription.segments
                  : null,
              }
              : null
          }
        />
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    UPLOADING:
      "bg-[rgba(99,102,241,0.15)] text-indigo-400 border border-indigo-900/50",
    UPLOADED:
      "bg-[rgba(99,102,241,0.15)] text-indigo-400 border border-indigo-900/50",
    INGESTING:
      "bg-[rgba(99,102,241,0.15)] text-indigo-400 border border-indigo-900/50",
    INGESTED:
      "bg-[rgba(99,102,241,0.15)] text-indigo-400 border border-indigo-900/50",
    TRANSCRIBING:
      "bg-[rgba(168,85,247,0.15)] text-purple-400 border border-purple-900/50",
    TRANSCRIBED:
      "bg-[rgba(168,85,247,0.15)] text-purple-400 border border-purple-900/50",
    PROCESSING:
      "bg-[rgba(251,191,36,0.12)] text-yellow-400 border border-yellow-900/50",
    READY:
      "bg-[rgba(34,197,94,0.15)] text-green-400 border border-green-900/50",
    FAILED: "bg-[rgba(239,68,68,0.15)] text-red-400 border border-red-900/50",
  }

  const labels: Record<string, string> = {
    UPLOADING: "Uploading",
    UPLOADED: "Uploaded",
    INGESTING: "Extracting audio",
    INGESTED: "Audio ready",
    TRANSCRIBING: "Transcribing",
    TRANSCRIBED: "Transcribed",
    PROCESSING: "Processing",
    READY: "Ready",
    FAILED: "Failed",
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-none ${styles[status] ?? "bg-[rgba(255,255,255,0.08)] text-[var(--dash-text-secondary)] border border-[rgba(255,255,255,0.08)]"}`}
    >
      {labels[status] ?? status}
    </span>
  )
}
