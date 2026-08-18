"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { needsRender, type CaptionEdits, type ClipLike } from "@/lib/video/render-signature"

/**
 * Download hands over exactly what the editor is showing.
 *
 * The preview draws captions as an overlay and trim as client state, so the
 * stored MP4 usually is not that file yet — AI clips are rendered caption-free
 * on purpose. When they differ we render first (reusing the re-export pipeline,
 * which hands back an existing render when the settings already match), poll
 * the clip, and save as soon as it lands.
 */

export type DownloadPhase = "idle" | "rendering" | "downloading" | "error"

const POLL_INTERVAL_MS = 2500
const POLL_TIMEOUT_MS = 5 * 60 * 1000

interface DownloadableClip extends ClipLike {
  id: string
  parentClipId?: string | null
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

export function useClipDownload(
  clip: DownloadableClip | null,
  edits: CaptionEdits,
  onRendered: (newClipId: string, lineageRootId: string) => void
) {
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
      let targetId = clip.id

      // Only the settings the file was rendered with matter — an untouched AI
      // clip still needs a pass, because those are stored caption-free.
      if (needsRender(clip, edits)) {
        setPhase("rendering")
        const res = await fetch(`/api/clips/${clip.id}/reexport`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(edits),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Could not prepare the clip")

        targetId = data.clipId
        if (!data.cached) await waitForClip(targetId)
        if (cancelledRef.current) return
      }

      setPhase("downloading")
      await saveFile(targetId)
      if (cancelledRef.current) return
      setPhase("idle")

      if (targetId !== clip.id) {
        onRendered(targetId, clip.parentClipId ?? clip.id)
      }
    } catch (err) {
      if (cancelledRef.current) return
      setPhase("error")
      setError(err instanceof Error ? err.message : "Download failed")
    }
  }, [clip, edits, phase, waitForClip, onRendered])

  return { download, phase, error }
}
