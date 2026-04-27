'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import VideoFilters from './VideoFilters';
import { VideoCameraIcon } from '@heroicons/react/24/outline';

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

const STATUS_STYLES: Record<string, string> = {
  UPLOADING:   'bg-[rgba(99,102,241,0.15)] text-indigo-400 border border-indigo-900/50',
  UPLOADED:    'bg-[rgba(99,102,241,0.15)] text-indigo-400 border border-indigo-900/50',
  INGESTING:   'bg-[rgba(99,102,241,0.15)] text-indigo-400 border border-indigo-900/50',
  INGESTED:    'bg-[rgba(99,102,241,0.15)] text-indigo-400 border border-indigo-900/50',
  TRANSCRIBING:'bg-[rgba(168,85,247,0.15)] text-purple-400 border border-purple-900/50',
  TRANSCRIBED: 'bg-[rgba(168,85,247,0.15)] text-purple-400 border border-purple-900/50',
  PROCESSING:  'bg-[rgba(251,191,36,0.12)] text-yellow-400 border border-yellow-900/50',
  READY:       'bg-[rgba(34,197,94,0.15)] text-green-400 border border-green-900/50',
  FAILED:      'bg-[rgba(239,68,68,0.15)] text-red-400 border border-red-900/50',
};

const STATUS_LABELS: Record<string, string> = {
  UPLOADING: 'Uploading', UPLOADED: 'Uploaded',
  INGESTING: 'Extracting', INGESTED: 'Audio ready',
  TRANSCRIBING: 'Transcribing', TRANSCRIBED: 'Transcribed',
  PROCESSING: 'Processing', READY: 'Ready', FAILED: 'Failed',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status] ?? 'bg-[rgba(255,255,255,0.06)] text-[#777]'}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export default function VideoGrid({ videos }: VideoGridProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt-desc');

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
      <VideoFilters
        onSearchChange={setSearchTerm}
        onStatusFilter={setStatusFilter}
        onSortChange={setSortBy}
      />

      <div className="mb-4 text-sm" style={{ color: '#555' }}>
        Showing {filteredAndSortedVideos.length} of {videos.length} videos
      </div>

      {filteredAndSortedVideos.length === 0 ? (
        <div className="dash-card text-center py-16">
          <VideoCameraIcon className="mx-auto h-12 w-12" style={{ color: '#333' }} />
          <h3 className="mt-3 text-sm font-medium" style={{ color: '#f2ede8' }}>
            {videos.length === 0 ? 'No videos yet' : 'No videos found'}
          </h3>
          <p className="mt-1 text-sm" style={{ color: '#555' }}>
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
                    <StatusBadge status={video.status} />
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="text-base font-medium truncate" style={{ color: '#f2ede8' }}>
                    {video.title}
                  </h3>
                  {video.description && (
                    <p className="mt-1 text-sm line-clamp-2" style={{ color: '#555' }}>
                      {video.description}
                    </p>
                  )}
                  <div className="mt-3 flex items-center justify-between text-xs" style={{ color: '#555' }}>
                    <span>
                      {video.duration
                        ? `${Math.floor(video.duration / 60)}:${String(video.duration % 60).padStart(2, '0')}`
                        : 'Processing...'}
                    </span>
                    <span>{new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(video.createdAt))}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
