'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const POLL_INTERVAL_MS = 5000
const MAX_BACKOFF_MS = 60000

type ActiveVideo = { id: string; status: string; progress: number; stageDetail: string | null }

/**
 * Keeps the (server-rendered) video list and dashboard overview honest.
 *
 * Without this, a user who starts a video and navigates back to the list sees
 * whatever status was true at render time and stays there until they reload by
 * hand — a badge frozen on "Processing" for a video that finished minutes ago.
 *
 * Mounts as a no-op when nothing is in flight, so a settled account does not
 * poll at all.
 */
export default function VideoListPoller({
  hasActiveVideos,
  onUpdate,
}: {
  hasActiveVideos: boolean
  /** Optional: receive live rows instead of only triggering a refresh. */
  onUpdate?: (videos: ActiveVideo[]) => void
}) {
  const router = useRouter()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSignatureRef = useRef<string>('')
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate

  useEffect(() => {
    if (!hasActiveVideos) return

    let cancelled = false
    let backoff = POLL_INTERVAL_MS

    async function tick() {
      if (cancelled) return
      try {
        const res = await fetch('/api/videos/active')
        if (!res.ok) {
          backoff = Math.min(backoff * 2, MAX_BACKOFF_MS)
          timerRef.current = setTimeout(tick, backoff)
          return
        }

        const data = (await res.json()) as { videos: ActiveVideo[] }
        if (cancelled) return
        backoff = POLL_INTERVAL_MS
        onUpdateRef.current?.(data.videos)

        // Refresh only when a status actually moved. Progress alone updates
        // through `onUpdate` and needs no server round-trip.
        const signature = data.videos.map((v) => `${v.id}:${v.status}`).sort().join('|')
        if (signature !== lastSignatureRef.current) {
          lastSignatureRef.current = signature
          router.refresh()
        }

        // An empty list means everything finished — the final refresh above has
        // already landed, so there is nothing left to watch.
        if (data.videos.length > 0) timerRef.current = setTimeout(tick, POLL_INTERVAL_MS)
      } catch {
        backoff = Math.min(backoff * 2, MAX_BACKOFF_MS)
        timerRef.current = setTimeout(tick, backoff)
      }
    }

    timerRef.current = setTimeout(tick, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [hasActiveVideos, router])

  return null
}
