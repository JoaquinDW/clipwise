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

export default function VideoGrid({ videos }: VideoGridProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt-desc');

  const filteredAndSortedVideos = useMemo(() => {
    let filtered = [...videos];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter((video) =>
        video.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter((video) => video.status === statusFilter);
    }

    // Apply sorting
    const [sortField, sortDirection] = sortBy.split('-');
    filtered.sort((a, b) => {
      let aValue: any = a[sortField as keyof Video];
      let bValue: any = b[sortField as keyof Video];

      // Handle null values
      if (aValue === null) return 1;
      if (bValue === null) return -1;

      // Handle dates
      if (sortField === 'createdAt') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      // Handle strings
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
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

      {/* Results Count */}
      <div className="mb-4 text-sm text-gray-600">
        Showing {filteredAndSortedVideos.length} of {videos.length} videos
      </div>

      {/* Videos Grid */}
      {filteredAndSortedVideos.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <VideoCameraIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {videos.length === 0 ? 'No videos' : 'No videos found'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {videos.length === 0
              ? 'Get started by uploading your first video.'
              : 'Try adjusting your search or filters.'}
          </p>
          {videos.length === 0 && (
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
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedVideos.map((video) => (
            <Link
              key={video.id}
              href={`/dashboard/videos/${video.id}`}
              className="group"
            >
              <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow border border-gray-100">
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
                      <VideoCameraIcon className="w-12 h-12 text-gray-400" />
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
    </>
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
