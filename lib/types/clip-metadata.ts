export interface ClipMetadata {
  captionStyle?: string;
  captionPosition?: 'top' | 'center' | 'bottom';
  captionSize?: 'small' | 'medium' | 'large';
  proxyUrl?: string;
  hookText?: string;
  cropStrategy?: { method: string; subjectPosition?: string };
  layoutType?: string;
  layoutRegions?: unknown[];
}
