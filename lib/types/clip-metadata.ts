export interface ClipMetadata {
  captionStyle?: string;
  captionPosition?: 'top' | 'center' | 'bottom';
  captionSize?: 'small' | 'medium' | 'large';
  /**
   * Generation of the caption renderer that burned this file. Absent on clips
   * rendered before the unified renderer, which is what keeps the reexport cache
   * from handing back a file drawn by the old one.
   */
  captionRenderVersion?: number;
  proxyUrl?: string;
  hookText?: string;
  cropStrategy?: { method: string; subjectPosition?: string };
  layoutType?: string;
  layoutRegions?: unknown[];
  /**
   * Set only on user-edited renders. The worker burns captions into the file
   * when this is true; AI-generated clips leave it unset and stay caption-free
   * so the editor overlay is the only source of truth.
   */
  burnCaptions?: boolean;
  /**
   * Written by the worker when a render did not use the strategy it was asked
   * for. Structurally the `RenderFallback` of lib/video/processor.ts, inlined
   * so this module stays importable from client components.
   */
  renderFallback?: { from: string; to: string; reason: string };
}
