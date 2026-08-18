'use client'

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { TERMINAL_STATUSES } from '@/lib/video/video-status-ui'

const POLL_INTERVAL_MS = 2000
const MAX_BACKOFF_MS = 30000

export type LiveClip = {
  id: string
  title: string
  description: string | null
  status: string
  progress: number
  storageUrl: string | null
  thumbnailUrl: string | null
  score: number | null
  duration: number
  hookText: string | null
  cropReason: string | null
}

export type VideoProgressState = {
  status: string
  progress: number
  stageProgress: number
  stageDetail: string | null
  errorMessage: string | null
  clips: LiveClip[]
  clipsTotal: number
  clipsReady: number
}

const VideoProgressContext = createContext<VideoProgressState | null>(null)

/** Live pipeline state, or null once the video is done and polling has stopped. */
export function useVideoProgress(): VideoProgressState | null {
  return useContext(VideoProgressContext)
}

/** The live clip matching `clipId`, if the poller has newer data than the server render. */
export function useLiveClip(clipId: string): LiveClip | undefined {
  return useVideoProgress()?.clips.find((c) => c.id === clipId)
}

/**
 * Polls the status endpoint and publishes the result to the tree.
 *
 * Two channels on purpose. The JSON drives every number and label as client
 * state, so the bar moves every 2s without a server round-trip. `router.refresh()`
 * — which refetches the whole RSC payload, transcript and all — fires only when
 * something structural actually changed: a new stage, or another clip finished.
 * It used to run unconditionally on every tick.
 */
export default function VideoProgressProvider({
  videoId,
  initial,
  children,
}: {
  videoId: string
  initial: VideoProgressState
  children: ReactNode
}) {
  const router = useRouter()
  const [state, setState] = useState<VideoProgressState>(initial)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Refs, not state: these gate the refresh without re-running the effect.
  const lastStatusRef = useRef(initial.status)
  const lastClipsReadyRef = useRef(initial.clipsReady)

  useEffect(() => {
    if (TERMINAL_STATUSES.has(initial.status)) return

    let cancelled = false
    let backoff = POLL_INTERVAL_MS

    function schedule(delay: number) {
      timerRef.current = setTimeout(tick, delay)
    }

    async function tick() {
      if (cancelled) return
      try {
        const res = await fetch(`/api/videos/${videoId}/status`)
        if (!res.ok) {
          // A transient 500 must not end polling. The old code returned here
          // without rescheduling, so one bad response froze the page until the
          // user reloaded by hand.
          backoff = Math.min(backoff * 2, MAX_BACKOFF_MS)
          schedule(backoff)
          return
        }

        const data: VideoProgressState = await res.json()
        if (cancelled) return

        backoff = POLL_INTERVAL_MS
        setState(data)

        // Only structural changes are worth a full RSC refetch.
        if (data.status !== lastStatusRef.current || data.clipsReady > lastClipsReadyRef.current) {
          lastStatusRef.current = data.status
          lastClipsReadyRef.current = data.clipsReady
          router.refresh()
        }

        if (!TERMINAL_STATUSES.has(data.status)) schedule(POLL_INTERVAL_MS)
      } catch {
        backoff = Math.min(backoff * 2, MAX_BACKOFF_MS)
        schedule(backoff)
      }
    }

    schedule(POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [videoId, initial.status, router])

  return <VideoProgressContext.Provider value={state}>{children}</VideoProgressContext.Provider>
}
