"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { CaptionEdits } from "@/lib/video/render-signature"

/**
 * Download hands over exactly what the editor is showing.
 *
 * The clip on screen is always the caption-free original — the preview draws
 * captions as an overlay and trim as client state — so a render is always
 * needed. /reexport does it, and answers instantly with an existing render when
 * one already matches these settings, which is what keeps a repeat download
 * fast. The render itself is a deliverable: it never becomes the clip on screen.
 */

export type DownloadPhase = "idle" | "rendering" | "downloading" | "error"

const POLL_INTERVAL_MS = 2500
const POLL_TIMEOUT_MS = 5 * 60 * 1000

interface DownloadableClip {
  id: string
}

async function saveFile(clipId: string) {
  const res = await fetch(`/api/clips/${clipId}/download`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Could not fetch the clip")

  // The URL carries Content-Disposition: attachment, which is the only thing
  // that makes a cross-origin file save rather than play. An `<a download>`
  // pointed straight at storage cannot do it — that attribute is ignored on
  // cross-origin URLs, which is why this button used to open a tab instead.
  const a = document.createElement("a")
  a.href = data.url
  a.rel = "noopener"
  document.body.appendChild(a)
  a.click()
  a.remove()
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function useClipDownload(clip: DownloadableClip | null, edits: CaptionEdits) {
  const [phase, setPhase] = useState<DownloadPhase>("idle")
  const [error, setError] = useState<string | null>(null)
  const cancelledRef = useRef(false)

  // Switching clips (or leaving the page) abandons any render we were watching.
  useEffect(() => {
    cancelledRef.current = false
    setPhase("idle")
    setError(null)
    return () => {
      cancelledRef.current = true
    }
  }, [clip?.id])

  const waitForClip = useCallback(async (clipId: string): Promise<void> => {
    const deadline = Date.now() + POLL_TIMEOUT_MS

    while (Date.now() < deadline) {
      await sleep(POLL_INTERVAL_MS)
      if (cancelledRef.current) return

      const res = await fetch(`/api/clips/${clipId}/status`)
      if (!res.ok) continue // a blip in one poll is not a failed render
      const data = await res.json()

      if (data.status === "READY" && data.storageUrl) return
      if (data.status === "FAILED") {
        throw new Error(data.errorMessage || "The render failed")
      }
    }

    throw new Error("This is taking longer than expected — try again in a moment")
  }, [])

  const download = useCallback(async () => {
    if (!clip || phase === "rendering" || phase === "downloading") return

    setError(null)

    try {
      setPhase("rendering")
      const res = await fetch(`/api/clips/${clip.id}/reexport`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(edits),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not prepare the clip")

      // `cached` means the server matched an earlier render of these exact
      // settings, so there is nothing to wait for.
      if (!data.cached) await waitForClip(data.clipId)
      if (cancelledRef.current) return

      setPhase("downloading")
      await saveFile(data.clipId)
      if (cancelledRef.current) return
      setPhase("idle")
    } catch (err) {
      if (cancelledRef.current) return
      setPhase("error")
      setError(err instanceof Error ? err.message : "Download failed")
    }
  }, [clip, edits, phase, waitForClip])

  return { download, phase, error }
}
