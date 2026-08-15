'use client';

import { useState } from 'react';
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';

interface VideoFiltersProps {
  onSearchChange: (search: string) => void;
  onStatusFilter: (status: string) => void;
  onSortChange: (sort: string) => void;
}

export default function VideoFilters({
  onSearchChange,
  onStatusFilter,
  onSortChange,
}: VideoFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="mb-6 space-y-4">
      {/* Search Bar */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5" style={{ color: 'var(--dash-text-muted)' }} />
          </div>
          <input
            type="text"
            placeholder="Search videos by title..."
            onChange={(e) => onSearchChange(e.target.value)}
            className="dash-input pl-10"
            style={{ paddingLeft: 40 }}
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="dash-btn-ghost inline-flex items-center gap-2 px-4 py-2 text-sm font-medium"
        >
          <FunnelIcon className="h-5 w-5" />
          Filters
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="dash-card p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#777' }}>
                Status
              </label>
              <select
                onChange={(e) => onStatusFilter(e.target.value)}
                className="dash-input"
              >
                <option value="">All statuses</option>
                <option value="READY">Ready</option>
                <option value="PROCESSING">Processing</option>
                <option value="TRANSCRIBING">Transcribing</option>
                <option value="UPLOADED">Uploaded</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#777' }}>
                Sort by
              </label>
              <select
                onChange={(e) => onSortChange(e.target.value)}
                className="dash-input"
              >
                <option value="createdAt-desc">Newest first</option>
                <option value="createdAt-asc">Oldest first</option>
                <option value="title-asc">Title (A-Z)</option>
                <option value="title-desc">Title (Z-A)</option>
                <option value="duration-desc">Longest first</option>
                <option value="duration-asc">Shortest first</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
