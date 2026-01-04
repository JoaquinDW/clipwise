import { auth } from '@/auth';
import { GetCompanyVideos } from '@/domain/video/use-case';
import Link from 'next/link';
import { prismaClientGlobal } from '@/infra/prisma';
import { PlusIcon } from '@heroicons/react/24/outline';
import VideoGrid from './VideoGrid';

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

  // Serialize dates for client component
  const serializedVideos = videos.map((video) => ({
    ...video,
    createdAt: video.createdAt,
    updatedAt: video.updatedAt,
  }));

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Videos</h1>
            <p className="mt-2 text-gray-600">
              Upload videos and generate viral clips with AI
            </p>
          </div>
          <Link
            href="/dashboard/videos/new"
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Upload Video
          </Link>
        </div>

        {/* Video Grid with Filters */}
        <VideoGrid videos={serializedVideos} />
      </div>
    </div>
  );
}
