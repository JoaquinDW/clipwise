"use client"

import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react"
import { XMarkIcon } from "@heroicons/react/24/outline"

interface TranscriptPanelProps {
  isOpen: boolean
  onClose: () => void
  transcription: {
    text: string
    language?: string | null
    segments?: unknown[] | null
  }
}

export default function TranscriptPanel({
  isOpen,
  onClose,
  transcription,
}: TranscriptPanelProps) {
  const segmentCount = Array.isArray(transcription.segments)
    ? transcription.segments.length
    : 0

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/70" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel
          style={{
            background: "#111",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16,
            padding: 24,
            width: "100%",
            maxWidth: 560,
            maxHeight: "80vh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div className="flex items-center justify-between mb-4 flex-none">
            <DialogTitle
              className="text-base font-semibold"
              style={{
                fontFamily: "var(--font-syne), sans-serif",
                color: "#f2ede8",
              }}
            >
              Transcription
            </DialogTitle>
            <button
              onClick={onClose}
              className="rounded-full p-1 transition-colors"
              style={{ color: "var(--dash-text-muted)" }}
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4 flex-none">
            <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-3 py-2">
              <p
                className="text-[11px] uppercase tracking-[0.18em]"
                style={{ color: "var(--dash-text-muted)" }}
              >
                Language
              </p>
              <p
                className="mt-1 text-sm font-medium"
                style={{ color: "var(--dash-text)" }}
              >
                {transcription.language?.toUpperCase() || "Unknown"}
              </p>
            </div>
            <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-3 py-2">
              <p
                className="text-[11px] uppercase tracking-[0.18em]"
                style={{ color: "var(--dash-text-muted)" }}
              >
                Segments
              </p>
              <p
                className="mt-1 text-sm font-medium"
                style={{ color: "var(--dash-text)" }}
              >
                {segmentCount}
              </p>
            </div>
          </div>

          <div
            className="overflow-y-auto rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-4 py-4 flex-1"
          >
            <p
              className="text-sm whitespace-pre-wrap leading-7"
              style={{ color: "var(--dash-text-secondary)" }}
            >
              {transcription.text}
            </p>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
