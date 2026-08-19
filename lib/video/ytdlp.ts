import { spawn } from 'child_process';

/**
 * Flags every yt-dlp invocation must carry.
 *
 * YouTube gates its media URLs behind an obfuscated JS "n challenge". yt-dlp can
 * only solve it with the EJS solver script, which is not bundled — without it the
 * extractor still returns format URLs, but every download dies on `HTTP Error 403:
 * Forbidden`. `--remote-components ejs:github` fetches (and then caches) that
 * script from the yt-dlp release page on first use.
 *
 * Requires a JS runtime on PATH. yt-dlp only enables deno by default, so `--js-runtimes
 * node` is what actually satisfies it here: node is the one runtime both the worker
 * container and a dev machine are guaranteed to have. It must be **node >= 22** —
 * yt-dlp reports node 20 as `(unsupported)` and falls back to the deprecated
 * no-runtime path. See https://github.com/yt-dlp/yt-dlp/wiki/EJS
 *
 * `--no-update` only silences the "your version is older than 90 days" banner that
 * otherwise pollutes stderr and job error messages.
 *
 * None of this saves a stale yt-dlp: the binary must come from the nightly channel.
 * See the comment in docker/worker/Dockerfile.
 */
export const YTDLP_COMMON_ARGS = [
  '--no-update',
  '--remote-components', 'ejs:github',
  '--js-runtimes', 'node',
];

/** Prepends the required flags to a yt-dlp argv. */
export function ytdlpArgs(...args: string[]): string[] {
  return [...YTDLP_COMMON_ARGS, ...args];
}

export type DownloadProgress = {
  /** 0-1 of the current file. */
  fraction: number;
  /** Human readable, already trimmed: "2.15MiB/s" */
  speed?: string;
  /** Human readable: "00:35" */
  eta?: string;
};

/**
 * The sentinel that prefixes our progress lines. yt-dlp writes plenty of other
 * chatter to stdout (format selection, merge notices); tagging our own template
 * means we parse only lines we asked for.
 */
const PROGRESS_PREFIX = 'CWPROGRESS';

const PROGRESS_ARGS = [
  '--newline',
  '--progress',
  '--progress-template',
  `${PROGRESS_PREFIX}:%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s`,
];

/**
 * Run yt-dlp and report download progress as it goes.
 *
 * `execFileAsync` gives no signal at all, which is why a long download used to
 * look identical to a hung one. Spawning lets us read the progress template off
 * stdout line by line.
 *
 * stderr is retained (capped) purely so a failure still produces a usable error
 * message — yt-dlp puts its real diagnostics there.
 */
export function downloadWithProgress(
  args: string[],
  onProgress: (progress: DownloadProgress) => void,
  options: { timeoutMs?: number } = {}
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const child = spawn('yt-dlp', [...PROGRESS_ARGS, ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdoutBuffer = '';
    let stderrTail = '';
    let timedOut = false;

    const timer = options.timeoutMs
      ? setTimeout(() => {
        timedOut = true;
        child.kill('SIGKILL');
      }, options.timeoutMs)
      : null;

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdoutBuffer += chunk;
      const lines = stdoutBuffer.split('\n');
      // The last element is whatever came in mid-line; keep it for next time.
      stdoutBuffer = lines.pop() ?? '';
      for (const line of lines) {
        const parsed = parseProgressLine(line);
        if (parsed) onProgress(parsed);
      }
    });

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk: string) => {
      stderrTail = (stderrTail + chunk).slice(-4000);
    });

    child.on('error', (err) => {
      if (timer) clearTimeout(timer);
      reject(err);
    });
    child.on('close', (code) => {
      if (timer) clearTimeout(timer);
      if (timedOut) reject(new Error(`yt-dlp timed out after ${options.timeoutMs}ms`));
      else if (code === 0) resolve();
      else reject(new Error(`yt-dlp exited with code ${code}: ${stderrTail.trim()}`));
    });
  });
}

function parseProgressLine(line: string): DownloadProgress | null {
  const start = line.indexOf(`${PROGRESS_PREFIX}:`);
  if (start === -1) return null;

  // yt-dlp pads these fields ("  4.2%"), and reports "NA" before the first
  // sample of a download is available.
  const [percentStr, speedStr, etaStr] = line
    .slice(start + PROGRESS_PREFIX.length + 1)
    .split('|')
    .map((part) => part.trim());

  const percent = parseFloat((percentStr ?? '').replace('%', ''));
  if (!Number.isFinite(percent)) return null;

  const usable = (value?: string) => (value && value !== 'NA' && value !== 'Unknown' ? value : undefined);

  return {
    fraction: Math.max(0, Math.min(1, percent / 100)),
    speed: usable(speedStr),
    eta: usable(etaStr),
  };
}

/** "Downloading audio — 2.15MiB/s · ETA 00:35" */
export function formatDownloadDetail(label: string, progress: DownloadProgress): string {
  const parts = [progress.speed, progress.eta ? `ETA ${progress.eta}` : undefined].filter(Boolean);
  return parts.length ? `${label} — ${parts.join(' · ')}` : label;
}
