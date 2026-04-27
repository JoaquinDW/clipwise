"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { useToast } from "@/app/ui/toast"
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Description,
} from "@headlessui/react"
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline"

type VideoStatus =
  | "UPLOADING"
  | "UPLOADED"
  | "INGESTING"
  | "INGESTED"
  | "TRANSCRIBING"
  | "TRANSCRIBED"
  | "PROCESSING"
  | "READY"
  | "FAILED"

interface VideoActionsProps {
  videoId: string
  status: VideoStatus
  hasTranscription: boolean
  variant?: "header" | "card"
}

const SpinnerIcon = () => (
  <svg
    className="animate-spin h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
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
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
)

const RefreshIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
)

const TrashIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
)

const modalPanelStyle = {
  background: "#111",
  border: "1px solid #1a1a1a",
  borderRadius: 12,
  padding: 24,
  maxWidth: 420,
  width: "100%",
}

export default function VideoActions({
  videoId,
  status,
  hasTranscription,
  variant = "card",
}: VideoActionsProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showRegenerateModal, setShowRegenerateModal] = useState(false)
  const [showRetryModal, setShowRetryModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const handleRegenerate = async () => {
    setShowRegenerateModal(false)
    setIsRegenerating(true)
    try {
      const response = await fetch(`/api/videos/${videoId}/regenerate`, {
        method: "POST",
      })
      const data = await response.json()
      if (!response.ok)
        throw new Error(data.error || "Failed to regenerate clips")
      showToast(
        "success",
        "Regeneration started!",
        `New clips will be created.`,
      )
      router.refresh()
    } catch (err) {
      showToast(
        "error",
        "Regeneration failed",
        err instanceof Error ? err.message : "Failed to regenerate clips",
      )
    } finally {
      setIsRegenerating(false)
    }
  }

  const handleRetry = async () => {
    setShowRetryModal(false)
    setIsRetrying(true)
    try {
      const response = await fetch(`/api/videos/${videoId}/retry`, {
        method: "POST",
      })
      const data = await response.json()
      if (!response.ok)
        throw new Error(data.error || "Failed to retry processing")
      showToast(
        "success",
        "Retry started!",
        "The video will be fully reprocessed.",
      )
      router.refresh()
    } catch (err) {
      showToast(
        "error",
        "Retry failed",
        err instanceof Error ? err.message : "Failed to retry processing",
      )
    } finally {
      setIsRetrying(false)
    }
  }

  const handleDelete = async () => {
    setShowDeleteModal(false)
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/videos/${videoId}`, {
        method: "DELETE",
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to delete video")
      showToast("success", "Video deleted", "The video has been removed.")
      router.push("/dashboard/videos")
    } catch (err) {
      showToast(
        "error",
        "Delete failed",
        err instanceof Error ? err.message : "Failed to delete video",
      )
      setIsDeleting(false)
    }
  }

  const showRegenerateButton =
    (status === "READY" || status === "TRANSCRIBED") && hasTranscription
  const showRetryButton = status === "FAILED"
  const showResetButton = [
    "UPLOADING",
    "UPLOADED",
    "INGESTING",
    "INGESTED",
    "TRANSCRIBING",
    "PROCESSING",
  ].includes(status)
  const busy = isRetrying || isRegenerating || isDeleting

  if (!showRegenerateButton && !showRetryButton && !showResetButton && variant === "card") return null

  const buttons = (
    <div className="flex flex-wrap gap-2">
      {showResetButton && (
        <button
          onClick={() => setShowRetryModal(true)}
          disabled={busy}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "#c2410c",
            border: "1px solid rgba(194,65,12,0.5)",
          }}
        >
          {isRetrying ? <><SpinnerIcon />Resetting…</> : <><RefreshIcon />Reset & Retry</>}
        </button>
      )}

      {showRegenerateButton && (
        <button
          onClick={() => setShowRegenerateModal(true)}
          disabled={busy}
          className="dash-btn-gradient inline-flex items-center gap-2 px-3 py-1.5 text-sm disabled:opacity-50"
        >
          {isRegenerating ? <><SpinnerIcon />Regenerating…</> : <><RefreshIcon />Regenerate</>}
        </button>
      )}

      {showRetryButton && (
        <button
          onClick={() => setShowRetryModal(true)}
          disabled={busy}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "#c2410c",
            border: "1px solid rgba(194,65,12,0.5)",
          }}
        >
          {isRetrying ? <><SpinnerIcon />Retrying…</> : <><RefreshIcon />Retry Processing</>}
        </button>
      )}

      <button
        onClick={() => setShowDeleteModal(true)}
        disabled={busy}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: "#991b1b",
          border: "1px solid rgba(153,27,27,0.5)",
        }}
      >
        {isDeleting ? <><SpinnerIcon />Deleting…</> : <><TrashIcon />Delete</>}
      </button>
    </div>
  )

  return (
    <>
      {variant === "header" ? buttons : (
        <div className="dash-card p-6 mb-8">
          <h2
            className="text-base font-semibold mb-4"
            style={{ fontFamily: "var(--font-syne), sans-serif", color: "#f2ede8" }}
          >
            Actions
          </h2>
          {buttons}
        </div>
      )}

      {/* Regenerate Modal */}
      <Dialog
        open={showRegenerateModal}
        onClose={() => setShowRegenerateModal(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/70" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel style={modalPanelStyle}>
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon
                className="h-5 w-5 flex-none mt-0.5"
                style={{ color: "#FF8C00" }}
              />
              <div>
                <DialogTitle
                  className="text-base font-semibold mb-2"
                  style={{
                    fontFamily: "var(--font-syne), sans-serif",
                    color: "#f2ede8",
                  }}
                >
                  Regenerate Clips?
                </DialogTitle>
                <Description
                  className="text-sm"
                  style={{ color: "var(--dash-text-secondary)" }}
                >
                  This will delete all existing clips and create new ones using
                  the same transcription. This action cannot be undone.
                </Description>
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={handleRegenerate}
                    className="dash-btn-gradient px-4 py-2 text-sm"
                  >
                    Regenerate
                  </button>
                  <button
                    onClick={() => setShowRegenerateModal(false)}
                    className="dash-btn-ghost px-4 py-2 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      {/* Retry / Reset Modal */}
      <Dialog
        open={showRetryModal}
        onClose={() => setShowRetryModal(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/70" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel style={modalPanelStyle}>
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon
                className="h-5 w-5 flex-none mt-0.5"
                style={{ color: "#FF8C00" }}
              />
              <div>
                <DialogTitle
                  className="text-base font-semibold mb-2"
                  style={{
                    fontFamily: "var(--font-syne), sans-serif",
                    color: "#f2ede8",
                  }}
                >
                  {showResetButton
                    ? "Reset & Retry?"
                    : "Retry Full Processing?"}
                </DialogTitle>
                <Description
                  className="text-sm"
                  style={{ color: "var(--dash-text-secondary)" }}
                >
                  This will delete the transcription and all clips, then restart
                  the full processing pipeline. This cannot be undone.
                </Description>
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={handleRetry}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white"
                    style={{ background: "#c2410c" }}
                  >
                    {showResetButton ? "Reset & Retry" : "Retry Processing"}
                  </button>
                  <button
                    onClick={() => setShowRetryModal(false)}
                    className="dash-btn-ghost px-4 py-2 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      {/* Delete Modal */}
      <Dialog
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/70" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel style={modalPanelStyle}>
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="h-5 w-5 flex-none mt-0.5 text-red-400" />
              <div>
                <DialogTitle
                  className="text-base font-semibold mb-2"
                  style={{
                    fontFamily: "var(--font-syne), sans-serif",
                    color: "#f2ede8",
                  }}
                >
                  Delete Video?
                </DialogTitle>
                <Description
                  className="text-sm"
                  style={{ color: "var(--dash-text-secondary)" }}
                >
                  This will permanently delete the video, all clips, and the
                  transcription. This action cannot be undone.
                </Description>
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={handleDelete}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white"
                    style={{ background: "#991b1b" }}
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="dash-btn-ghost px-4 py-2 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  )
}
