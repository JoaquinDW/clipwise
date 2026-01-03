import { auth } from '@/auth';
import { prismaClientGlobal } from '@/infra/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import VideoActions from './VideoActions';

export default async function VideoDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;

  // Get video with all relations
  const video = await prismaClientGlobal.video.findUnique({
    where: { id },
    include: {
      transcription: true,
      clips: {
        orderBy: { score: 'desc' },
      },
    },
  });

  if (!video) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/videos"
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center mb-4"
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Videos
          </Link>

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{video.title}</h1>
              {video.description && (
                <p className="mt-2 text-gray-600">{video.description}</p>
              )}
              <div className="mt-4 flex items-center space-x-4 text-sm text-gray-500">
                <span>
                  {video.duration
                    ? `${Math.floor(video.duration / 60)}:${String(video.duration % 60).padStart(2, '0')}`
                    : 'Unknown duration'}
                </span>
                <span>•</span>
                <span>{new Date(video.createdAt).toLocaleDateString()}</span>
                <span>•</span>
                <StatusBadge status={video.status} />
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {video.status === 'FAILED' && video.errorMessage && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Processing failed
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  {video.errorMessage}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Video Actions */}
        <VideoActions
          videoId={video.id}
          status={video.status}
          hasTranscription={!!video.transcription}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Clips */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Generated Clips ({video.clips.length})
              </h2>

              {video.clips.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {video.status === 'READY'
                    ? 'No clips generated'
                    : 'Clips are being generated...'}
                </div>
              ) : (
                <div className="space-y-4">
                  {video.clips.map((clip, index) => (
                    <div
                      key={clip.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">
                            {clip.title}
                          </h3>
                          {clip.description && (
                            <p className="text-sm text-gray-600 mt-1">
                              {clip.description}
                            </p>
                          )}
                        </div>
                        <div className="ml-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Score: {clip.score}/100
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <div className="text-sm text-gray-500">
                          <span>
                            {clip.startTime.toFixed(1)}s - {clip.endTime.toFixed(1)}s
                          </span>
                          <span className="mx-2">•</span>
                          <span>{clip.duration.toFixed(1)}s</span>
                        </div>

                        {clip.status === 'READY' && clip.storageUrl && (
                          <a
                            href={clip.storageUrl}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                          >
                            <svg
                              className="w-4 h-4 mr-1"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                              />
                            </svg>
                            Download
                          </a>
                        )}
                        {clip.status === 'GENERATING' && (
                          <span className="text-sm text-gray-500">
                            Generating...
                          </span>
                        )}
                        {clip.status === 'FAILED' && (
                          <span className="text-sm text-red-600">Failed</span>
                        )}
                      </div>

                      {/* Metadata */}
                      {clip.metadata && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          {(clip.metadata as any).hookText && (
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Hook:</span>{' '}
                              {(clip.metadata as any).hookText}
                            </p>
                          )}
                          {(clip.metadata as any).tags && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {(clip.metadata as any).tags.map(
                                (tag: string, i: number) => (
                                  <span
                                    key={i}
                                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                                  >
                                    #{tag}
                                  </span>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Transcription */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Transcription
              </h2>

              {video.transcription ? (
                <div className="space-y-3">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Language:</span>{' '}
                    {video.transcription.language?.toUpperCase() || 'Unknown'}
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Segments:</span>{' '}
                    {Array.isArray(video.transcription.segments)
                      ? video.transcription.segments.length
                      : 0}
                  </div>
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {video.transcription.text}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  {video.status === 'TRANSCRIBING'
                    ? 'Transcribing...'
                    : 'No transcription available'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    UPLOADING: 'bg-yellow-100 text-yellow-800',
    UPLOADED: 'bg-blue-100 text-blue-800',
    TRANSCRIBING: 'bg-purple-100 text-purple-800',
    TRANSCRIBED: 'bg-indigo-100 text-indigo-800',
    PROCESSING: 'bg-orange-100 text-orange-800',
    READY: 'bg-green-100 text-green-800',
    FAILED: 'bg-red-100 text-red-800',
  };

  const labels = {
    UPLOADING: 'Uploading',
    UPLOADED: 'Uploaded',
    TRANSCRIBING: 'Transcribing',
    TRANSCRIBED: 'Transcribed',
    PROCESSING: 'Processing',
    READY: 'Ready',
    FAILED: 'Failed',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'
      }`}
    >
      {labels[status as keyof typeof labels] || status}
    </span>
  );
}
