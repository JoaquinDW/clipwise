import { create } from "zustand"

interface ClipEditorState {
  deltaStart: number
  deltaEnd: number
  captionStyle: string
  captionPosition: "top" | "center" | "bottom"
  captionSize: "small" | "medium" | "large"
  showSafeAreas: boolean
  currentTime: number

  setDeltaStart: (v: number) => void
  setDeltaEnd: (v: number) => void
  setCaptionStyle: (v: string) => void
  setCaptionPosition: (v: "top" | "center" | "bottom") => void
  setCaptionSize: (v: "small" | "medium" | "large") => void
  setShowSafeAreas: (v: boolean) => void
  setCurrentTime: (v: number) => void
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

  setDeltaStart: (v) => set({ deltaStart: v }),
  setDeltaEnd: (v) => set({ deltaEnd: v }),
  setCaptionStyle: (v) => set({ captionStyle: v }),
  setCaptionPosition: (v) => set({ captionPosition: v }),
  setCaptionSize: (v) => set({ captionSize: v }),
  setShowSafeAreas: (v) => set({ showSafeAreas: v }),
  setCurrentTime: (v) => set({ currentTime: v }),

  reset: (clip) =>
    set({
      deltaStart: 0,
      deltaEnd: 0,
      captionStyle: clip.captionStyle ?? "classic",
      captionPosition: clip.captionPosition ?? "bottom",
      captionSize: clip.captionSize ?? "medium",
      showSafeAreas: false,
      currentTime: clip.startTime,
    }),
}))
