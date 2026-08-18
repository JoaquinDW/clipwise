'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProgressBar from '@/app/ui/progress-bar';
import Spinner from '@/app/ui/spinner';

const YT_URL_RE = /^https?:\/\/(www\.)?(youtube\.com\/watch\?.*v=|youtu\.be\/)[\w-]+/;

type UploadMode = 'file' | 'youtube' | 'stream';

/**
 * PUT the file at the Supabase signed URL. XHR rather than fetch because it is
 * the only way to get upload progress events.
 */
function uploadToSignedUrl(
  uploadUrl: string,
  file: File,
  onProgress: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

    xhr.upload.onprogress = event => {
      if (event.lengthComputable) {
        // Leave the last slice of the bar for the confirm round-trip.
        onProgress(Math.round((event.loaded / event.total) * 90));
      }
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Upload failed (${xhr.status})`));
    xhr.onerror = () => reject(new Error('Upload failed. Check your connection and try again.'));
    xhr.send(file);
  });
}

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
  const [fetchingMeta, setFetchingMeta] = useState(false);
  const [youtubeThumbnail, setYoutubeThumbnail] = useState<string | null>(null);
  const autoFilledTitle = useRef('');

  useEffect(() => {
    if (mode !== 'youtube' || !YT_URL_RE.test(youtubeUrl)) return;
    setFetchingMeta(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://www.youtube.com/oembed?url=${encodeURIComponent(youtubeUrl)}&format=json`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data.title && (title === '' || title === autoFilledTitle.current)) {
          setTitle(data.title);
          autoFilledTitle.current = data.title;
        }
        if (data.thumbnail_url) setYoutubeThumbnail(data.thumbnail_url);
      } catch {
        // silently fail — user can type manually
      } finally {
        setFetchingMeta(false);
      }
    }, 600);
    return () => { clearTimeout(timer); setFetchingMeta(false); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [youtubeUrl, mode]);

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
        // 1. Ask the API for a signed URL. The file goes straight to storage:
        //    routing it through a serverless function would hit the 4.5 MB
        //    request body limit.
        const signRes = await fetch('/api/videos/upload/sign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            description,
            fileName: file!.name,
            fileSize: file!.size,
          }),
        });
        if (!signRes.ok) throw new Error((await signRes.json()).error || 'Upload failed');
        const signed = await signRes.json();

        // 2. Upload directly, reporting real progress.
        await uploadToSignedUrl(signed.uploadUrl, file!, setProgress);

        // 3. Tell the API the object landed so the pipeline can start.
        const confirmRes = await fetch('/api/videos/upload/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId: signed.videoId, extension: signed.extension }),
        });
        if (!confirmRes.ok) throw new Error((await confirmRes.json()).error || 'Upload failed');

        videoId = signed.videoId;
        setProgress(95);
      } else if (mode === 'youtube') {
        const res = await fetch('/api/videos/youtube', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: youtubeUrl, title, description }),
        });
        if (!res.ok) throw new Error((await res.json()).error || 'YouTube download failed');
        videoId = (await res.json()).videoId;
        // Nothing local is happening for a link — the download runs in the
        // worker. The old flat 30% sat there lying until the redirect; the
        // video page has the real, moving progress.
        setProgress(100);
      } else {
        const res = await fetch('/api/videos/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: streamUrl, title, description }),
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Stream import failed');
        videoId = (await res.json()).videoId;
        setProgress(100);
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
            style={{ color: 'var(--dash-text-secondary)' }}
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
          <p className="mt-2" style={{ color: 'var(--dash-text-secondary)' }}>
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
                      : { borderColor: 'transparent', color: 'var(--dash-text-secondary)' }
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
                  <p className="text-sm" style={{ color: 'var(--dash-text-secondary)' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
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
                  <div className="text-sm" style={{ color: 'var(--dash-text-secondary)' }}>
                    <span className="font-medium" style={{ color: '#FF3B5C' }}>Click to upload</span>{' '}or drag and drop
                  </div>
                  <p className="text-xs" style={{ color: 'var(--dash-text-muted)' }}>MP4, MOV, AVI, or MKV up to 500MB</p>
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
                onChange={(e) => {
                  setYoutubeUrl(e.target.value);
                  if (!e.target.value) { setYoutubeThumbnail(null); autoFilledTitle.current = ''; }
                }}
                placeholder="https://www.youtube.com/watch?v=…"
                className="dash-input"
                disabled={uploading}
                required={mode === 'youtube'}
              />
              {youtubeThumbnail && (
                <div className="mt-3 flex items-center gap-3 rounded-xl overflow-hidden" style={{ background: '#111', border: '1px solid #1a1a1a' }}>
                  <img src={youtubeThumbnail} alt="Video thumbnail" className="h-16 w-28 object-cover shrink-0" />
                  <p className="text-xs truncate pr-3" style={{ color: '#777' }}>{title || '…'}</p>
                </div>
              )}
              {!youtubeThumbnail && (
                <p className="mt-2 text-xs" style={{ color: 'var(--dash-text-muted)' }}>Paste the full URL of a YouTube video</p>
              )}
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
              <p className="mt-2 text-xs" style={{ color: 'var(--dash-text-muted)' }}>
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
            <div className="flex items-center gap-2 mb-1">
              <label htmlFor="title" className="block text-sm font-medium" style={{ color: '#777' }}>
                Title *
              </label>
              {fetchingMeta && (
                <span className="text-xs flex items-center gap-1" style={{ color: 'var(--dash-text-secondary)' }}>
                  <Spinner className="h-3 w-3" color="currentColor" />
                  Fetching…
                </span>
              )}
              {!fetchingMeta && title && title === autoFilledTitle.current && (
                <span className="text-xs" style={{ color: 'var(--dash-text-muted)' }}>Auto-filled · editable</span>
              )}
            </div>
            <input
              type="text"
              id="title"
              name="title"
              autoComplete="off"
              spellCheck={false}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                autoFilledTitle.current = '';
              }}
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

          {/* Progress */}
          {uploading && (
            <div className="rounded-xl p-4" style={{ background: '#111', border: '1px solid #1a1a1a' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium" style={{ color: '#f2ede8' }}>
                  {mode !== 'file'
                    ? mode === 'youtube' ? 'Submitting YouTube URL…' : 'Starting stream import…'
                    : progress >= 90 ? 'Starting processing…' : 'Uploading video…'}
                </span>
                <span className="text-sm font-medium" style={{ color: '#FF3B5C' }}>{progress}%</span>
              </div>
              <ProgressBar value={progress} label="Upload progress" />
              <p className="mt-2 text-xs" style={{ color: 'var(--dash-text-secondary)' }}>
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
