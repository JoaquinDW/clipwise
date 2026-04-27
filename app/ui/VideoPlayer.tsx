'use client';

import { useState } from 'react';

interface VideoPlayerProps {
  url: string;
  title?: string;
  className?: string;
  controls?: boolean;
  playing?: boolean;
  muted?: boolean;
  loop?: boolean;
  width?: string | number;
  height?: string | number;
}

export function VideoPlayer({
  url,
  title,
  className = '',
  controls = true,
  playing = false,
  muted = false,
  loop = false,
}: VideoPlayerProps) {
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <div className={`relative bg-gray-900 rounded-lg overflow-hidden w-full h-full ${className}`}>
      {!isReady && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
        </div>
      )}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800 text-white p-4">
          <svg
            className="w-12 h-12 text-red-400 mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-sm text-center">Failed to load video</p>
          {title && <p className="text-xs text-gray-400 mt-1">{title}</p>}
        </div>
      )}
      <video
        src={url}
        title={title}
        controls={controls}
        autoPlay={playing}
        muted={muted}
        loop={loop}
        onLoadedData={() => setIsReady(true)}
        onError={() => setHasError(true)}
        className="w-full h-full object-contain"
        playsInline
        controlsList="nodownload"
        disablePictureInPicture
      />
    </div>
  );
}

export function VerticalVideoPlayer({
  url,
  title,
  className = '',
  maxWidth = 360,
  ...props
}: VideoPlayerProps & { maxWidth?: number }) {
  return (
    <div
      className={`mx-auto w-full ${className}`}
      style={{ maxWidth: `${maxWidth}px` }}
    >
      <div className="relative w-full" style={{ aspectRatio: '9/16' }}>
        <VideoPlayer url={url} title={title} {...props} />
      </div>
    </div>
  );
}
