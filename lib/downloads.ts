/**
 * Desktop builds the website links to. macOS ships first; Windows is wired the
 * same way, so shipping it is setting NEXT_PUBLIC_WINDOWS_DOWNLOAD_URL, not a
 * code change. Builds are served from the same folder electron-updater reads
 * (see desktop/electron-builder.yml).
 */
export type Platform = 'mac' | 'windows';

export interface DesktopDownload {
  platform: Platform;
  available: boolean;
  url: string | null;
}

const MAC_DEFAULT = 'https://downloads.momentreel.app/desktop/mac/Momentreel.dmg';

export const DOWNLOADS: Record<Platform, DesktopDownload> = {
  mac: {
    platform: 'mac',
    available: true,
    url: process.env.NEXT_PUBLIC_MAC_DOWNLOAD_URL || MAC_DEFAULT,
  },
  windows: {
    platform: 'windows',
    available: !!process.env.NEXT_PUBLIC_WINDOWS_DOWNLOAD_URL,
    url: process.env.NEXT_PUBLIC_WINDOWS_DOWNLOAD_URL || null,
  },
};
