import { create } from "zustand"
import type { TrimHandle } from "@/lib/video/trim-limits"

interface ClipEditorState {
  deltaStart: number
  deltaEnd: number
  captionStyle: string
  captionPosition: "top" | "center" | "bottom"
  captionSize: "small" | "medium" | "large"
  showSafeAreas: boolean
  currentTime: number
  /** Which timeline handle is under the pointer, so the player follows that edge. */
  draggingHandle: TrimHandle | null

  setDeltaStart: (v: number) => void
  setDeltaEnd: (v: number) => void
  setCaptionStyle: (v: string) => void
  setCaptionPosition: (v: "top" | "center" | "bottom") => void
  setCaptionSize: (v: "small" | "medium" | "large") => void
  setShowSafeAreas: (v: boolean) => void
  setCurrentTime: (v: number) => void
  setDraggingHandle: (v: TrimHandle | null) => void
  reset: (clip: {
    captionStyle?: string | null
    captionPosition?: "top" | "center" | "bottom" | null
    captionSize?: "small" | "medium" | "large" | null
    startTime: number
  }) => void
}

export const useClipEditorStore = create<ClipEditorState>()((set) => ({
  deltaStart: 0,
  deltaEnd: 0,
  captionStyle: "classic",
  captionPosition: "bottom",
  captionSize: "medium",
  showSafeAreas: false,
  currentTime: 0,
  draggingHandle: null,

  setDeltaStart: (v) => set({ deltaStart: v }),
  setDeltaEnd: (v) => set({ deltaEnd: v }),
  setCaptionStyle: (v) => set({ captionStyle: v }),
  setCaptionPosition: (v) => set({ captionPosition: v }),
  setCaptionSize: (v) => set({ captionSize: v }),
  setShowSafeAreas: (v) => set({ showSafeAreas: v }),
  setCurrentTime: (v) => set({ currentTime: v }),
  setDraggingHandle: (v) => set({ draggingHandle: v }),

  reset: (clip) =>
    set({
      deltaStart: 0,
      deltaEnd: 0,
      captionStyle: clip.captionStyle ?? "classic",
      captionPosition: clip.captionPosition ?? "bottom",
      captionSize: clip.captionSize ?? "medium",
      showSafeAreas: false,
      currentTime: clip.startTime,
      draggingHandle: null,
    }),
}))
