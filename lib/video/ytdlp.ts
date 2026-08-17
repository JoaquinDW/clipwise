/**
 * Flags every yt-dlp invocation must carry.
 *
 * YouTube gates its media URLs behind an obfuscated JS "n challenge". yt-dlp can
 * only solve it with the EJS solver script, which is not bundled — without it the
 * extractor still returns format URLs, but every download dies on `HTTP Error 403:
 * Forbidden`. `--remote-components ejs:github` fetches (and then caches) that
 * script from the yt-dlp release page on first use.
 *
 * Requires a JS runtime on PATH — deno or node. See https://github.com/yt-dlp/yt-dlp/wiki/EJS
 *
 * `--no-update` only silences the "your version is older than 90 days" banner that
 * otherwise pollutes stderr and job error messages.
 */
export const YTDLP_COMMON_ARGS = ['--no-update', '--remote-components', 'ejs:github'];

/** Prepends the required flags to a yt-dlp argv. */
export function ytdlpArgs(...args: string[]): string[] {
  return [...YTDLP_COMMON_ARGS, ...args];
}
