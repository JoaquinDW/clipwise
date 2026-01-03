import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { GetCompanyVideos } from '@/domain/video/use-case';
import Link from 'next/link';
import { prismaClientGlobal } from '@/infra/prisma';

export default async function VideosPage() {
  const session = await auth();

  // For testing: use test user if no session
  const userId = session?.user?.id || 'test-user-id';

  // Get user's company
  const user = await prismaClientGlobal.user.findUnique({
    where: { id: userId },
    include: { company: true },
  });

  if (!user?.companyId) {
    return <div className="p-8">No company found for user</div>;
  }

  // Get all videos for this company
  const getVideos = new GetCompanyVideos();
  const videos = await getVideos.execute(user.companyId);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Videos</h1>
            <p className="mt-2 text-gray-600">
              Upload videos and generate viral clips with AI
            </p>
          </div>
          <Link
            href="/dashboard/videos/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Upload Video
          </Link>
        </div>

        {/* Videos Grid */}
        {videos.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No videos</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by uploading your first video.
            </p>
            <div className="mt-6">
              <Link
                href="/dashboard/videos/new"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Upload Video
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((video) => (
              <Link
                key={video.id}
                href={`/dashboard/videos/${video.id}`}
                className="group"
              >
                <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
                  {/* Thumbnail */}
                  <div className="aspect-video bg-gray-200 relative">
                    {video.thumbnailUrl ? (
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <svg
                          className="w-12 h-12 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    )}

                    {/* Status Badge */}
                    <div className="absolute top-2 right-2">
                      <StatusBadge status={video.status} />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="text-lg font-medium text-gray-900 group-hover:text-blue-600 truncate">
                      {video.title}
                    </h3>
                    {video.description && (
                      <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                        {video.description}
                      </p>
                    )}

                    <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                      <span>
                        {video.duration
                          ? `${Math.floor(video.duration / 60)}:${String(video.duration % 60).padStart(2, '0')}`
                          : 'Processing...'}
                      </span>
                      <span>
                        {new Date(video.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
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
