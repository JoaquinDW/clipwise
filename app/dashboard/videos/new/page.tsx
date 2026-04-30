'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAllCaptionStyles, type CaptionStyleName } from '@/lib/ai/caption-styles';

type UploadMode = 'file' | 'youtube' | 'stream';

export default function NewVideoPage() {
  const router = useRouter();
  const [mode, setMode] = useState<UploadMode>('file');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [streamUrl, setStreamUrl] = useState('');
  const [captionStyle, setCaptionStyle] = useState<CaptionStyleName>('classic');

  const captionStyles = getAllCaptionStyles();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0]);
  }, []);

  const handleFileSelect = (selectedFile: File) => {
    const validTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
    if (!validTypes.includes(selectedFile.type)) {
      setError('Invalid file type. Please upload MP4, MOV, AVI, or MKV.');
      return;
    }
    if (selectedFile.size > 500 * 1024 * 1024) {
      setError('File too large. Maximum size is 500MB.');
      return;
    }
    setFile(selectedFile);
    setError(null);
    if (!title) setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'file' && !file) { setError('Please select a video file'); return; }
    if (mode === 'youtube' && !youtubeUrl) { setError('Please enter a YouTube URL'); return; }
    if (mode === 'stream' && !streamUrl) { setError('Please enter a Twitch or Kick VOD URL'); return; }
    if (!title.trim()) { setError('Please enter a title'); return; }

    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      let videoId: string;

      if (mode === 'file') {
        const formData = new FormData();
        formData.append('file', file!);
        formData.append('title', title);
        if (description) formData.append('description', description);
        formData.append('captionStyle', captionStyle);

        const res = await fetch('/api/videos/upload', { method: 'POST', body: formData });
        if (!res.ok) throw new Error((await res.json()).error || 'Upload failed');
        videoId = (await res.json()).videoId;
        setProgress(30);
      } else if (mode === 'youtube') {
        const res = await fetch('/api/videos/youtube', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: youtubeUrl, title, description, captionStyle }),
        });
        if (!res.ok) throw new Error((await res.json()).error || 'YouTube download failed');
        videoId = (await res.json()).videoId;
        setProgress(30);
      } else {
        const res = await fetch('/api/videos/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: streamUrl, title, description, captionStyle }),
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Stream import failed');
        videoId = (await res.json()).videoId;
        setProgress(30);
      }

      setUploading(false);
      setProgress(100);
      router.push(`/dashboard/videos/${videoId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/videos"
            className="text-sm flex items-center mb-4 transition-colors"
            style={{ color: '#555' }}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Videos
          </Link>
          <h1
            className="text-3xl font-bold"
            style={{ fontFamily: 'var(--font-syne), sans-serif', color: '#f2ede8' }}
          >
            Upload Video
          </h1>
          <p className="mt-2" style={{ color: '#555' }}>
            Upload from your computer or paste a YouTube URL
          </p>
        </div>

        {/* Mode Tabs */}
        <div className="mb-6">
          <div style={{ borderBottom: '1px solid #1a1a1a' }}>
            <nav role="tablist" className="-mb-px flex space-x-8">
              {(['file', 'youtube', 'stream'] as UploadMode[]).map((m) => (
                <button
                  key={m}
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => setMode(m)}
                  className="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors"
                  style={
                    mode === m
                      ? { borderColor: '#FF3B5C', color: '#FF3B5C' }
                      : { borderColor: 'transparent', color: '#555' }
                  }
                >
                  {m === 'file' ? '📁 Upload File' : m === 'youtube' ? '🎥 YouTube URL' : '🎮 Stream URL'}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Upload Form */}
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* File Upload Zone */}
          {mode === 'file' && (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className="relative border-2 border-dashed rounded-xl p-12 text-center transition-colors"
              style={
                dragActive
                  ? { borderColor: '#FF3B5C', background: 'rgba(255,59,92,0.05)' }
                  : { borderColor: '#2a2a2a' }
              }
            >
              <input
                type="file"
                name="video-file"
                accept="video/*"
                aria-label="Upload video file"
                onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={uploading}
              />

              {file ? (
                <div className="space-y-2">
                  <svg className="mx-auto h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-lg font-medium" style={{ color: '#f2ede8' }}>{file.name}</p>
                  <p className="text-sm" style={{ color: '#555' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="text-sm transition-colors"
                    style={{ color: '#FF3B5C' }}
                  >
                    Change file
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <svg className="mx-auto h-12 w-12" style={{ color: '#333' }} stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="text-sm" style={{ color: '#555' }}>
                    <span className="font-medium" style={{ color: '#FF3B5C' }}>Click to upload</span>{' '}or drag and drop
                  </div>
                  <p className="text-xs" style={{ color: '#444' }}>MP4, MOV, AVI, or MKV up to 500MB</p>
                </div>
              )}
            </div>
          )}

          {/* YouTube URL */}
          {mode === 'youtube' && (
            <div>
              <label htmlFor="youtube-url" className="block text-sm font-medium mb-2" style={{ color: '#777' }}>
                YouTube URL *
              </label>
              <input
                type="url"
                id="youtube-url"
                name="youtube-url"
                autoComplete="url"
                spellCheck={false}
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=…"
                className="dash-input"
                disabled={uploading}
                required={mode === 'youtube'}
              />
              <p className="mt-2 text-xs" style={{ color: '#444' }}>Paste the full URL of a YouTube video</p>
            </div>
          )}

          {/* Stream URL */}
          {mode === 'stream' && (
            <div>
              <label htmlFor="stream-url" className="block text-sm font-medium mb-2" style={{ color: '#777' }}>
                Stream URL *
              </label>
              <input
                type="url"
                id="stream-url"
                name="stream-url"
                autoComplete="url"
                spellCheck={false}
                value={streamUrl}
                onChange={(e) => setStreamUrl(e.target.value)}
                placeholder="https://www.twitch.tv/videos/… or https://kick.com/…/video/…"
                className="dash-input"
                disabled={uploading}
                required={mode === 'stream'}
              />
              <p className="mt-2 text-xs" style={{ color: '#444' }}>
                Paste a Twitch VOD URL or Kick VOD URL. Clips appear progressively as the stream is processed.
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              className="rounded-xl p-4"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}
            >
              <div className="flex items-start gap-3">
                <svg className="h-5 w-5 flex-none text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-sm" style={{ color: '#fca5a5' }}>{error}</p>
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-1" style={{ color: '#777' }}>
              Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              autoComplete="off"
              spellCheck={false}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My awesome video"
              className="dash-input"
              disabled={uploading}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-1" style={{ color: '#777' }}>
              Description (optional)
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell us about your video…"
              className="dash-input"
              style={{ resize: 'vertical' }}
              disabled={uploading}
            />
          </div>

          {/* Caption Style */}
          <div>
            <label className="block text-sm font-medium mb-3" style={{ color: '#777' }}>
              Caption Style
            </label>
            <div className="grid grid-cols-3 gap-4">
              {captionStyles.map(({ key, preset }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCaptionStyle(key)}
                  disabled={uploading}
                  className={`relative rounded-xl border-2 p-4 text-left transition-all ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  style={
                    captionStyle === key
                      ? { borderColor: '#FF3B5C', background: 'rgba(255,59,92,0.08)' }
                      : { borderColor: '#1a1a1a', background: '#111' }
                  }
                >
                  {captionStyle === key && (
                    <div className="absolute top-2 right-2">
                      <svg className="h-5 w-5" style={{ color: '#FF3B5C' }} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                  <div className="mb-3">
                    <h3 className="text-sm font-semibold" style={{ color: '#f2ede8' }}>{preset.name}</h3>
                    <p className="text-xs mt-1" style={{ color: '#555' }}>{preset.description}</p>
                  </div>
                  <div className="bg-[#0a0a0a] rounded p-2 flex items-center justify-center h-16">
                    <span style={{ fontFamily: preset.font, fontSize: '14px', color: preset.color, fontWeight: preset.fontWeight, textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                      <span style={{ backgroundColor: preset.highlightColor, padding: '2px 4px', borderRadius: '2px' }}>Example</span>{' '}Text
                    </span>
                  </div>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs" style={{ color: '#444' }}>
              Choose how captions will appear on your video clips
            </p>
          </div>

          {/* Progress */}
          {uploading && (
            <div className="rounded-xl p-4" style={{ background: '#111', border: '1px solid #1a1a1a' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium" style={{ color: '#f2ede8' }}>
                  {mode === 'file' ? 'Uploading video…' : mode === 'youtube' ? 'Submitting YouTube URL…' : 'Starting stream import…'}
                </span>
                <span className="text-sm font-medium" style={{ color: '#FF3B5C' }}>{progress}%</span>
              </div>
              <div className="w-full rounded-full h-1.5" style={{ background: '#1a1a1a' }}>
                <div
                  className="h-1.5 rounded-full"
                  style={{ background: 'linear-gradient(135deg, #FF3B5C, #FF8C00)', width: `${progress}%`, transition: 'width 0.3s ease' }}
                />
              </div>
              <p className="mt-2 text-xs" style={{ color: '#555' }}>
                Processing will continue in the background — you&apos;ll be redirected automatically.
              </p>
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <Link href="/dashboard/videos" className="dash-btn-ghost px-4 py-2 text-sm font-medium">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={(mode === 'file' && !file) || (mode === 'youtube' && !youtubeUrl) || (mode === 'stream' && !streamUrl) || uploading}
              className="dash-btn-gradient px-5 py-2 text-sm"
            >
              {uploading ? 'Processing…' : 'Upload & Process'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
