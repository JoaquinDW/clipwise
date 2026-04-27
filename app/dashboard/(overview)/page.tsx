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

const darkStatusClass: Record<string, string> = {
  READY: 'bg-[rgba(34,197,94,0.15)] text-green-400 border border-green-900/50',
  FAILED: 'bg-[rgba(239,68,68,0.15)] text-red-400 border border-red-900/50',
};
const defaultStatusClass = 'bg-[rgba(251,191,36,0.12)] text-yellow-400 border border-yellow-900/50';

export default async function Page() {
  const session = await auth();
  const name = session?.user?.name || session?.user?.email;
  const userId = session?.user?.id;

  const user = await prismaClientGlobal.user.findUnique({
    where: { id: userId },
    include: { company: true },
  });

  const company = user?.company;

  const videos = await prismaClientGlobal.video.findMany({
    where: { companyId: company?.id },
    include: { clips: true },
    orderBy: { createdAt: 'desc' },
    take: 3,
  });

  const stats = {
    totalVideos: videos.length,
    totalClips: videos.reduce((sum, video) => sum + video.clips.length, 0),
    minutesUsed: company?.minutesUsed || 0,
    readyVideos: videos.filter(v => v.status === VideoStatus.READY).length,
  };

  return (
    <main>
      <div className="mb-8">
        <h1
          className="mb-2 text-2xl md:text-3xl font-bold"
          style={{ fontFamily: 'var(--font-syne), sans-serif', color: '#f2ede8' }}
        >
          Welcome back, {name?.split(' ')[0] || name}
        </h1>
        <p style={{ color: '#555' }}>
          Transform your long-form videos into viral clips with AI
        </p>
      </div>

      {/* Quick Action CTA */}
      <Link href="/dashboard/videos/new" className="mb-8 block">
        <div
          className="rounded-xl p-6 transition-all"
          style={{
            background: 'linear-gradient(135deg, #FF3B5C, #FF8C00)',
            boxShadow: '0 0 36px rgba(255,59,92,0.28)',
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-1 text-white" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>
                Create Your First Clip
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.8)' }}>
                Upload a video or paste a YouTube link to get started
              </p>
            </div>
            <PlusIcon className="h-10 w-10 text-white opacity-80" />
          </div>
        </div>
      </Link>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Videos', value: stats.totalVideos, sub: `${stats.readyVideos} ready`, Icon: VideoCameraIcon },
          { label: 'Clips Generated', value: stats.totalClips, sub: 'AI-powered clips', Icon: SparklesIcon },
          { label: 'Minutes Used', value: stats.minutesUsed.toFixed(1), sub: 'Processing time', Icon: ClockIcon },
          {
            label: 'Success Rate',
            value: `${stats.totalVideos > 0 ? Math.round((stats.readyVideos / stats.totalVideos) * 100) : 0}%`,
            sub: 'Videos processed',
            Icon: SparklesIcon,
          },
        ].map(({ label, value, sub, Icon }) => (
          <div key={label} className="dash-card p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium" style={{ color: '#555' }}>{label}</p>
              <Icon className="h-5 w-5" style={{ color: '#FF3B5C' }} />
            </div>
            <p className="text-3xl font-bold" style={{ color: '#f2ede8', fontFamily: 'var(--font-syne), sans-serif' }}>
              {value}
            </p>
            <p className="text-xs mt-1" style={{ color: '#444' }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Recent Videos */}
      {videos.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-lg font-semibold"
              style={{ fontFamily: 'var(--font-syne), sans-serif', color: '#f2ede8' }}
            >
              Recent Videos
            </h2>
            <Link href="/dashboard/videos" className="text-sm font-medium" style={{ color: '#FF3B5C' }}>
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {videos.map((video) => (
              <Link key={video.id} href={`/dashboard/videos/${video.id}`}>
                <div className="dash-card overflow-hidden">
                  <div className="aspect-video bg-[#1a1a1a] flex items-center justify-center">
                    {video.thumbnailUrl ? (
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <VideoCameraIcon className="h-12 w-12" style={{ color: '#333' }} />
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium truncate mb-1" style={{ color: '#f2ede8' }}>
                      {video.title}
                    </h3>
                    <div className="flex items-center justify-between text-xs" style={{ color: '#555' }}>
                      <span>{video.clips.length} clips</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          darkStatusClass[video.status] ?? defaultStatusClass
                        }`}
                      >
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
        <h2
          className="text-lg font-semibold mb-4"
          style={{ fontFamily: 'var(--font-syne), sans-serif', color: '#f2ede8' }}
        >
          Quick Access
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { href: '/dashboard/videos', Icon: VideoCameraIcon, label: 'My Videos' },
            { href: '/dashboard/videos/new', Icon: PlusIcon, label: 'Upload Video' },
            { href: '/billing', Icon: BanknotesIcon, label: 'Billing' },
            { href: '/account', Icon: UserCircleIcon, label: 'Account' },
          ].map(({ href, Icon, label }) => (
            <Link key={label} href={href}>
              <div className="dash-card p-6 flex flex-col items-center text-center">
                <Icon className="h-8 w-8 mb-2" style={{ color: '#FF3B5C' }} />
                <p className="text-sm font-medium" style={{ color: '#f2ede8' }}>{label}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
