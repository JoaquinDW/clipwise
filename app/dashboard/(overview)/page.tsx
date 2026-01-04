import { lusitana } from '@/app/ui/fonts';
import { auth } from '@/auth';
import {
  VideoCameraIcon,
  ClockIcon,
  SparklesIcon,
  PlusIcon,
  BanknotesIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { prismaClientGlobal } from '@/infra/prisma';
import { VideoStatus } from '@prisma/client';

export default async function Page() {
  const session = await auth();
  const name = session?.user?.name || session?.user?.email;
  const userId = session?.user?.id;

  // Fetch user's company and video statistics
  const user = await prismaClientGlobal.user.findUnique({
    where: { id: userId },
    include: { company: true },
  });

  const company = user?.company;

  const videos = await prismaClientGlobal.video.findMany({
    where: { companyId: company?.id },
    include: {
      clips: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 3,
  });

  const stats = {
    totalVideos: videos.length,
    totalClips: videos.reduce((sum, video) => sum + video.clips.length, 0),
    minutesUsed: company?.minutesUsed || 0,
    readyVideos: videos.filter(v => v.status === VideoStatus.READY).length,
  };

  const recentVideos = videos.slice(0, 3);

  return (
    <main>
      <div className="mb-8">
        <h1 className={`${lusitana.className} mb-2 text-2xl md:text-3xl font-bold text-gray-900`}>
          Welcome back, {name?.split(' ')[0] || name}
        </h1>
        <p className="text-gray-600">
          Transform your long-form videos into viral clips with AI
        </p>
      </div>

      {/* Quick Action CTA */}
      <Link
        href="/dashboard/videos/new"
        className="mb-8 block"
      >
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-1">Create Your First Clip</h2>
              <p className="text-blue-100">Upload a video or paste a YouTube link to get started</p>
            </div>
            <PlusIcon className="h-10 w-10" />
          </div>
        </div>
      </Link>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Total Videos</p>
            <VideoCameraIcon className="h-5 w-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.totalVideos}</p>
          <p className="text-xs text-gray-500 mt-1">{stats.readyVideos} ready</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Clips Generated</p>
            <SparklesIcon className="h-5 w-5 text-purple-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.totalClips}</p>
          <p className="text-xs text-gray-500 mt-1">AI-powered clips</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Minutes Used</p>
            <ClockIcon className="h-5 w-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.minutesUsed.toFixed(1)}</p>
          <p className="text-xs text-gray-500 mt-1">Processing time</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Success Rate</p>
            <SparklesIcon className="h-5 w-5 text-yellow-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {stats.totalVideos > 0 ? Math.round((stats.readyVideos / stats.totalVideos) * 100) : 0}%
          </p>
          <p className="text-xs text-gray-500 mt-1">Videos processed</p>
        </div>
      </div>

      {/* Recent Videos */}
      {recentVideos.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Videos</h2>
            <Link
              href="/dashboard/videos"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentVideos.map((video) => (
              <Link key={video.id} href={`/dashboard/videos/${video.id}`}>
                <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-100 overflow-hidden">
                  <div className="aspect-video bg-gray-100 flex items-center justify-center">
                    {video.thumbnailUrl ? (
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <VideoCameraIcon className="h-12 w-12 text-gray-400" />
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium text-gray-900 truncate mb-1">
                      {video.title}
                    </h3>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{video.clips.length} clips</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        video.status === VideoStatus.READY ? 'bg-green-100 text-green-700' :
                        video.status === VideoStatus.FAILED ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {video.status}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Access</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/dashboard/videos">
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow border border-gray-100 flex flex-col items-center text-center">
              <VideoCameraIcon className="h-8 w-8 text-blue-600 mb-2" />
              <p className="text-sm font-medium text-gray-900">My Videos</p>
            </div>
          </Link>

          <Link href="/dashboard/videos/new">
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow border border-gray-100 flex flex-col items-center text-center">
              <PlusIcon className="h-8 w-8 text-green-600 mb-2" />
              <p className="text-sm font-medium text-gray-900">Upload Video</p>
            </div>
          </Link>

          <Link href="/billing">
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow border border-gray-100 flex flex-col items-center text-center">
              <BanknotesIcon className="h-8 w-8 text-purple-600 mb-2" />
              <p className="text-sm font-medium text-gray-900">Billing</p>
            </div>
          </Link>

          <Link href="/account">
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow border border-gray-100 flex flex-col items-center text-center">
              <UserCircleIcon className="h-8 w-8 text-orange-600 mb-2" />
              <p className="text-sm font-medium text-gray-900">Account</p>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}