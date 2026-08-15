import { auth } from '@/auth';
import {
  VideoCameraIcon,
  ClockIcon,
  SparklesIcon,
  PlusIcon,
  BanknotesIcon,
  UserCircleIcon,
  ArrowUpRightIcon,
  CloudArrowUpIcon,
  ScissorsIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { prismaClientGlobal } from '@/infra/prisma';
import { VideoStatus } from '@prisma/client';

const statusBadge: Record<string, { className: string; label: string }> = {
  READY: { className: 'dash-badge dash-badge--success', label: 'Ready' },
  FAILED: { className: 'dash-badge dash-badge--error', label: 'Failed' },
};
const pendingBadge = { className: 'dash-badge dash-badge--pending', label: 'Processing' };

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default async function Page() {
  const session = await auth();
  const name = session?.user?.name || session?.user?.email;
  const userId = session?.user?.id;

  const user = await prismaClientGlobal.user.findUnique({
    where: { id: userId },
    include: { company: true },
  });

  const company = user?.company;
  const companyId = company?.id;

  const [totalVideos, readyVideos, totalClips, recentVideos] = companyId
    ? await Promise.all([
      prismaClientGlobal.video.count({ where: { companyId } }),
      prismaClientGlobal.video.count({ where: { companyId, status: VideoStatus.READY } }),
      prismaClientGlobal.clip.count({ where: { video: { companyId } } }),
      prismaClientGlobal.video.findMany({
        where: { companyId },
        include: { _count: { select: { clips: true } } },
        orderBy: { createdAt: 'desc' },
        take: 3,
      }),
    ])
    : [0, 0, 0, []];

  const minutesUsed = company?.minutesUsed || 0;
  const hasVideos = totalVideos > 0;

  const statCards = [
    {
      label: 'Total Videos',
      value: totalVideos,
      sub: `${readyVideos} ready`,
      Icon: VideoCameraIcon,
      accent: '#FF3B5C',
      tint: 'rgba(255, 59, 92, 0.12)',
    },
    {
      label: 'Clips Generated',
      value: totalClips,
      sub: 'AI-powered clips',
      Icon: SparklesIcon,
      accent: '#FF8C00',
      tint: 'rgba(255, 140, 0, 0.12)',
    },
    {
      label: 'Minutes Used',
      value: minutesUsed.toFixed(1),
      sub: 'Processing time',
      Icon: ClockIcon,
      accent: '#38BDF8',
      tint: 'rgba(56, 189, 248, 0.12)',
    },
    {
      label: 'Success Rate',
      value: `${totalVideos > 0 ? Math.round((readyVideos / totalVideos) * 100) : 0}%`,
      sub: 'Videos processed',
      Icon: CheckCircleIcon,
      accent: '#34D399',
      tint: 'rgba(52, 211, 153, 0.12)',
    },
  ];

  const onboardingSteps = [
    {
      Icon: CloudArrowUpIcon,
      title: 'Upload a video',
      text: 'Drop a file or paste a YouTube link',
    },
    {
      Icon: SparklesIcon,
      title: 'AI finds the highlights',
      text: 'Transcription, hooks and virality scoring',
    },
    {
      Icon: ScissorsIcon,
      title: 'Get ready-to-post clips',
      text: 'Vertical 9:16 clips with burned-in captions',
    },
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 md:px-2 md:py-2">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1
            className="mb-2 text-2xl font-bold md:text-3xl"
            style={{ fontFamily: 'var(--font-syne), sans-serif' }}
          >
            Welcome back, {name?.split(' ')[0] || name}
          </h1>
          <p className="dash-text-secondary">
            Transform your long-form videos into viral clips with AI
          </p>
        </div>
        {hasVideos && (
          <Link
            href="/dashboard/videos/new"
            className="dash-btn-gradient gap-2 px-4 py-2.5 text-sm"
          >
            <PlusIcon className="h-5 w-5" aria-hidden="true" />
            New Video
          </Link>
        )}
      </div>

      {/* First-run hero CTA */}
      {!hasVideos && (
        <Link href="/dashboard/videos/new" className="dash-card-link mb-8 block rounded-xl">
          <div
            className="rounded-xl p-6 md:p-8"
            style={{
              background: 'linear-gradient(135deg, #FF3B5C, #FF8C00)',
              boxShadow: '0 0 36px rgba(255,59,92,0.28)',
            }}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2
                  className="mb-1 text-xl font-semibold text-white md:text-2xl"
                  style={{ fontFamily: 'var(--font-syne), sans-serif' }}
                >
                  Create Your First Clip
                </h2>
                <p className="text-white/85">
                  Upload a video or paste a YouTube link to get started
                </p>
              </div>
              <span className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-white/15">
                <ArrowUpRightIcon className="h-6 w-6 text-white" aria-hidden="true" />
              </span>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 border-t border-white/15 pt-6 sm:grid-cols-3">
              {onboardingSteps.map(({ Icon, title, text }, i) => (
                <div key={title} className="flex items-start gap-3">
                  <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-white/15 text-sm font-bold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-white">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {title}
                    </p>
                    <p className="mt-0.5 text-xs text-white/75">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Link>
      )}

      {/* Statistics Grid */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map(({ label, value, sub, Icon, accent, tint }) => (
          <div key={label} className="dash-card p-5">
            <div className="flex items-center gap-3">
              <span className="dash-icon-tile" style={{ background: tint }}>
                <Icon className="h-5 w-5" style={{ color: accent }} aria-hidden="true" />
              </span>
              <p className="dash-text-secondary text-sm font-medium">{label}</p>
            </div>
            <p
              className="mt-4 text-3xl font-bold tabular-nums"
              style={{ fontFamily: 'var(--font-syne), sans-serif' }}
            >
              {value}
            </p>
            <p className="dash-text-muted mt-1 text-xs">{sub}</p>
          </div>
        ))}
      </div>

      {/* Recent Videos */}
      {recentVideos.length > 0 && (
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2
              className="text-lg font-semibold"
              style={{ fontFamily: 'var(--font-syne), sans-serif' }}
            >
              Recent Videos
            </h2>
            <Link
              href="/dashboard/videos"
              className="group flex items-center gap-1 text-sm font-medium transition-colors"
              style={{ color: '#FF3B5C' }}
            >
              View all
              <ArrowUpRightIcon
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden="true"
              />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {recentVideos.map((video) => {
              const badge = statusBadge[video.status] ?? pendingBadge;
              return (
                <Link
                  key={video.id}
                  href={`/dashboard/videos/${video.id}`}
                  className="dash-card-link rounded-xl"
                >
                  <div className="dash-card overflow-hidden">
                    <div className="relative aspect-video bg-[#1a1a1a]">
                      {video.thumbnailUrl ? (
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <VideoCameraIcon className="h-12 w-12 text-[#333]" aria-hidden="true" />
                        </div>
                      )}
                      {video.duration ? (
                        <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-xs font-medium tabular-nums text-white">
                          {formatDuration(video.duration)}
                        </span>
                      ) : null}
                    </div>
                    <div className="p-4">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <h3 className="truncate font-medium">{video.title}</h3>
                        <span className={badge.className}>
                          <span className="dash-badge-dot" aria-hidden="true" />
                          {badge.label}
                        </span>
                      </div>
                      <div className="dash-text-muted flex items-center justify-between text-xs">
                        <span>
                          {video._count.clips} {video._count.clips === 1 ? 'clip' : 'clips'}
                        </span>
                        <span>{timeAgo(video.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div>
        <h2
          className="mb-4 text-lg font-semibold"
          style={{ fontFamily: 'var(--font-syne), sans-serif' }}
        >
          Quick Access
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: '/dashboard/videos', Icon: VideoCameraIcon, label: 'My Videos', sub: 'Browse your library' },
            { href: '/dashboard/videos/new', Icon: PlusIcon, label: 'Upload Video', sub: 'File or YouTube link' },
            { href: '/billing', Icon: BanknotesIcon, label: 'Billing', sub: 'Plan & invoices' },
            { href: '/account', Icon: UserCircleIcon, label: 'Account', sub: 'Profile settings' },
          ].map(({ href, Icon, label, sub }) => (
            <Link key={label} href={href} className="dash-card-link rounded-xl">
              <div className="dash-card group flex items-center gap-3 p-4">
                <span className="dash-icon-tile" style={{ background: 'rgba(255, 59, 92, 0.1)' }}>
                  <Icon className="h-5 w-5" style={{ color: '#FF3B5C' }} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-grow">
                  <p className="truncate text-sm font-medium">{label}</p>
                  <p className="dash-text-muted truncate text-xs">{sub}</p>
                </div>
                <ArrowUpRightIcon
                  className="dash-text-muted h-4 w-4 flex-none opacity-0 transition-opacity group-hover:opacity-100"
                  aria-hidden="true"
                />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
