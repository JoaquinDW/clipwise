'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import VideoFilters from './VideoFilters';
import { VideoCameraIcon } from '@heroicons/react/24/outline';
import ProgressBar from '@/app/ui/progress-bar';
import VideoListPoller from '../VideoListPoller';
import {
  FALLBACK_STATUS_STYLE,
  STATUS_LABELS,
  STATUS_STYLES,
  isProcessing,
  stageDescription,
} from '@/lib/video/video-status-ui';

interface Video {
  id: string;
  title: string;
  description: string | null;
  status: string;
  thumbnailUrl: string | null;
  duration: number | null;
  createdAt: Date;
}

interface VideoGridProps {
  videos: Video[];
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status] ?? FALLBACK_STATUS_STYLE}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

type LiveStatus = { status: string; progress: number; stageDetail: string | null };

export default function VideoGrid({ videos }: VideoGridProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt-desc');
  // Live rows from the poller, keyed by video id. Empty until the first tick.
  const [live, setLive] = useState<Record<string, LiveStatus>>({});

  const hasActiveVideos = videos.some((v) => isProcessing(v.status));

  const filteredAndSortedVideos = useMemo(() => {
    let filtered = [...videos];

    if (searchTerm) {
      filtered = filtered.filter((video) =>
        video.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter((video) => video.status === statusFilter);
    }

    const [sortField, sortDirection] = sortBy.split('-');
    filtered.sort((a, b) => {
      let aValue: string | number | Date | null = a[sortField as keyof Video] as string | number | Date | null;
      let bValue: string | number | Date | null = b[sortField as keyof Video] as string | number | Date | null;

      if (aValue === null) return 1;
      if (bValue === null) return -1;

      if (sortField === 'createdAt') {
        aValue = new Date(aValue as string | Date).getTime();
        bValue = new Date(bValue as string | Date).getTime();
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = (bValue as string).toLowerCase();
      }

      return sortDirection === 'asc' ? (aValue! > bValue! ? 1 : -1) : (aValue! < bValue! ? 1 : -1);
    });

    return filtered;
  }, [videos, searchTerm, statusFilter, sortBy]);

  return (
    <>
      <VideoListPoller
        hasActiveVideos={hasActiveVideos}
        onUpdate={(rows) =>
          setLive(Object.fromEntries(rows.map((r) => [r.id, r])))
        }
      />
      <VideoFilters
        onSearchChange={setSearchTerm}
        onStatusFilter={setStatusFilter}
        onSortChange={setSortBy}
      />

      <div className="mb-4 text-sm" style={{ color: 'var(--dash-text-secondary)' }}>
        Showing {filteredAndSortedVideos.length} of {videos.length} videos
      </div>

      {filteredAndSortedVideos.length === 0 ? (
        <div className="dash-card text-center py-16">
          <VideoCameraIcon className="mx-auto h-12 w-12" style={{ color: '#333' }} />
          <h3 className="mt-3 text-sm font-medium" style={{ color: '#f2ede8' }}>
            {videos.length === 0 ? 'No videos yet' : 'No videos found'}
          </h3>
          <p className="mt-1 text-sm" style={{ color: 'var(--dash-text-secondary)' }}>
            {videos.length === 0
              ? 'Get started by uploading your first video.'
              : 'Try adjusting your search or filters.'}
          </p>
          {videos.length === 0 && (
            <div className="mt-6">
              <Link
                href="/dashboard/videos/new"
                className="dash-btn-gradient px-4 py-2 text-sm gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Upload Video
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedVideos.map((video) => (
            <Link key={video.id} href={`/dashboard/videos/${video.id}`} className="group">
              <div className="dash-card overflow-hidden">
                {/* Thumbnail */}
                <div className="aspect-video bg-[#1a1a1a] relative">
                  {video.thumbnailUrl ? (
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      width={640}
                      height={360}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <VideoCameraIcon className="w-12 h-12" style={{ color: '#333' }} />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <StatusBadge status={live[video.id]?.status ?? video.status} />
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="text-base font-medium truncate" style={{ color: '#f2ede8' }}>
                    {video.title}
                  </h3>
                  {video.description && (
                    <p className="mt-1 text-sm line-clamp-2" style={{ color: 'var(--dash-text-secondary)' }}>
                      {video.description}
                    </p>
                  )}
                  <div className="mt-3 flex items-center justify-between text-xs" style={{ color: 'var(--dash-text-secondary)' }}>
                    <span>
                      {video.duration
                        ? `${Math.floor(video.duration / 60)}:${String(video.duration % 60).padStart(2, '0')}`
                        : '—'}
                    </span>
                    <span>{new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(video.createdAt))}</span>
                  </div>

                  {/* A card that is still working says what it is working on,
                      instead of a flat "Processing..." in the duration slot. */}
                  {isProcessing(live[video.id]?.status ?? video.status) && (
                    <div className="mt-2.5">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs truncate" style={{ color: 'var(--dash-text-muted)' }}>
                          {stageDescription(
                            live[video.id]?.status ?? video.status,
                            live[video.id]?.stageDetail,
                          )}
                        </span>
                        <span className="text-xs tabular-nums flex-none" style={{ color: 'var(--dash-text-muted)' }}>
                          {live[video.id]?.progress ?? 0}%
                        </span>
                      </div>
                      <ProgressBar
                        value={live[video.id]?.progress ?? 0}
                        indeterminate={!live[video.id]}
                        size="sm"
                        label={`Processing ${video.title}`}
                      />
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
