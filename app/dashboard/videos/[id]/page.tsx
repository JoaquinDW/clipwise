import { prismaClientGlobal } from "@/infra/prisma"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import VideoActions from "./VideoActions"
import VideoProgressProvider from "./VideoProgress"
import { VideoProgressStrip, VideoStatusBadge } from "./VideoProgressHeader"
import ClipsSection from "./ClipsSection"
import { getSessionUserWithCompany } from "@/lib/auth/session"
import { collapseLineages, resolveVisibleClipId } from "@/lib/video/clip-lineage"

export default async function VideoDetailPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { clip?: string }
}) {
  const { id } = params

  const user = await getSessionUserWithCompany()
  if (!user) redirect("/login")

  const video = await prismaClientGlobal.video.findUnique({
    where: { id },
    include: {
      transcription: true,
      clips: { orderBy: { score: "desc" } },
    },
  })

  // Scoped to the caller's company: a cuid from another tenant must 404, not
  // hand over their transcript and clips.
  if (!video || video.companyId !== user.companyId) notFound()

  // One card per clip: edits live on as extra rows, but only the newest usable
  // version of each lineage reaches the UI.
  const visibleClips = collapseLineages(video.clips)

  const readyClips = video.clips.filter((c) => c.status === "READY").length
  const progressFallback = { status: video.status, errorMessage: video.errorMessage }

  return (
    <VideoProgressProvider
      videoId={video.id}
      initial={{
        status: video.status,
        progress: 0,
        stageProgress: video.stageProgress,
        stageDetail: video.stageDetail,
        errorMessage: video.errorMessage,
        clips: [],
        clipsTotal: video.clips.length,
        clipsReady: readyClips,
      }}
    >
      <div
        className="-m-6 flex flex-col"
        style={{ height: "calc(100vh - 4rem)" }}
      >
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
          <VideoStatusBadge fallback={progressFallback} />

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

        {/* Live pipeline progress — full width so it survives every breakpoint */}
        <VideoProgressStrip fallback={progressFallback} />

        {/* Main content — 2 columns */}
        <div className="flex flex-1 pt-5 min-h-0">
          <ClipsSection
            clips={visibleClips.map((c) => {
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
            initialClipId={resolveVisibleClipId(
              visibleClips,
              video.clips,
              searchParams.clip
            )}
            videoClipsCount={visibleClips.length}
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
    </VideoProgressProvider>
  )
}
