'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const TERMINAL_STATUSES = new Set(['READY', 'FAILED']);
const POLL_INTERVAL_MS = 4000;

export default function VideoStatusPoller({ videoId, currentStatus }: { videoId: string; currentStatus: string }) {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (TERMINAL_STATUSES.has(currentStatus)) return;

    function schedule() {
      timerRef.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/videos/${videoId}/status`);
          if (!res.ok) return;
          const data = await res.json();
          // Refresh the Server Component data
          router.refresh();
          if (!TERMINAL_STATUSES.has(data.status)) {
            schedule();
          }
        } catch {
          schedule();
        }
      }, POLL_INTERVAL_MS);
    }

    schedule();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [videoId, currentStatus, router]);

  return null;
}
