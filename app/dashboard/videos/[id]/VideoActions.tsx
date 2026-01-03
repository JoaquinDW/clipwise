'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type VideoStatus =
  | 'UPLOADING'
  | 'UPLOADED'
  | 'TRANSCRIBING'
  | 'TRANSCRIBED'
  | 'PROCESSING'
  | 'READY'
  | 'FAILED';

interface VideoActionsProps {
  videoId: string;
  status: VideoStatus;
  hasTranscription: boolean;
}

export default function VideoActions({
  videoId,
  status,
  hasTranscription,
}: VideoActionsProps) {
  const router = useRouter();
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegenerate = async () => {
    if (
      !confirm(
        'Are you sure you want to regenerate clips? This will delete all existing clips and create new ones using the same transcription.'
      )
    ) {
      return;
    }

    setIsRegenerating(true);
    setError(null);

    try {
      const response = await fetch(`/api/videos/${videoId}/regenerate`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to regenerate clips');
      }

      console.log('Regeneration started:', data);

      // Refresh the page to show updated status
      router.refresh();

      // Optionally show success message
      alert(
        `Regeneration started! The video will be processed and ${data.clipsCreated || 'new'} clips will be created.`
      );
    } catch (err) {
      console.error('Regeneration error:', err);
      setError(err instanceof Error ? err.message : 'Failed to regenerate clips');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleRetry = async () => {
    if (
      !confirm(
        'Are you sure you want to retry processing? This will delete the transcription and all clips, then restart the full processing pipeline.'
      )
    ) {
      return;
    }

    setIsRetrying(true);
    setError(null);

    try {
      const response = await fetch(`/api/videos/${videoId}/retry`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to retry processing');
      }

      console.log('Retry started:', data);

      // Refresh the page to show updated status
      router.refresh();

      // Optionally show success message
      alert('Retry started! The video will be fully reprocessed.');
    } catch (err) {
      console.error('Retry error:', err);
      setError(err instanceof Error ? err.message : 'Failed to retry processing');
    } finally {
      setIsRetrying(false);
    }
  };

  // Determine which actions to show based on status
  const showRegenerateButton =
    (status === 'READY' || status === 'TRANSCRIBED') && hasTranscription;
  const showRetryButton = status === 'FAILED';

  // Don't render anything if no actions are available
  if (!showRegenerateButton && !showRetryButton) {
    return null;
  }

  return (
    <div className="bg-white shadow rounded-lg p-6 mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {showRegenerateButton && (
          <button
            onClick={handleRegenerate}
            disabled={isRegenerating || isRetrying}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isRegenerating ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
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
                Regenerating...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Regenerate Clips
              </>
            )}
          </button>
        )}

        {showRetryButton && (
          <button
            onClick={handleRetry}
            disabled={isRetrying || isRegenerating}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isRetrying ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
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
                Retrying...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Retry Full Processing
              </>
            )}
          </button>
        )}
      </div>

      {/* Help text */}
      <div className="mt-4 text-sm text-gray-600">
        {showRegenerateButton && (
          <p>
            <strong>Regenerate Clips:</strong> Creates new clips using the existing
            transcription. Useful if you want different highlights from the same video.
          </p>
        )}
        {showRetryButton && (
          <p>
            <strong>Retry Full Processing:</strong> Completely reprocesses the video
            from scratch, including transcription. Use this if processing failed or you
            want to start over.
          </p>
        )}
      </div>
    </div>
  );
}
