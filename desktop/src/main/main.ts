/**
 * Electron main process: hosts the engine, the local MCP endpoint and the UI.
 *
 * The app keeps running with its window closed (on macOS, as apps do; on
 * Windows, from the tray), because the agent may call it at any time. The
 * stdio bridge starts it when it is not running.
 */
import { app, BrowserWindow, clipboard, dialog, ipcMain, Menu, net, protocol, shell, Tray, nativeImage } from 'electron';
import path from 'path';
import { pathToFileURL } from 'url';
import { autoUpdater } from 'electron-updater';

import { Engine } from '../engine/engine';
import type { Settings } from '../engine/settings';
import { LicenseManager, loadDevice } from '../license/license';
import { devLicenseProvider, selectLicenseProvider } from '../license/providers';
import { createMcpServer } from '../mcp/server';
import { startMcpHttp, type McpHttpHandle } from '../mcp/http';
import { claudeCodeCommand, installAgent, isAgentInstalled, type AgentId, type Connection } from './agent-config';
import type { AppState } from './ipc-types';

const VERSION = process.env.MOMENTREEL_VERSION || app.getVersion();

protocol.registerSchemesAsPrivileged([
  { scheme: 'media', privileges: { standard: true, secure: true, stream: true, supportFetchAPI: true } },
]);

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

let engine: Engine;
let license: LicenseManager;
let mcp: McpHttpHandle | null = null;
let mcpError: string | null = null;
let win: BrowserWindow | null = null;
let tray: Tray | null = null;
let quitting = false;

function resourcesDir(): string {
  return app.isPackaged ? process.resourcesPath : path.join(__dirname, '..', 'resources');
}

/** The thing a launcher opens: the .app bundle on macOS, the exe elsewhere. */
function appLaunchPath(): string {
  return process.platform === 'darwin' ? path.resolve(process.execPath, '..', '..', '..') : process.execPath;
}

function bridgeScript(): string {
  // Unpacked from the asar so a plain node-mode process can read it without asar support surprises
  return path.join(__dirname, 'bridge.js').replace(`app.asar${path.sep}`, `app.asar.unpacked${path.sep}`);
}

function connection(): Connection {
  const settings = engine.settings.get();
  return {
    url: mcp?.url ?? `http://127.0.0.1:${settings.mcpPort}/mcp`,
    token: settings.mcpToken,
    bridge: {
      command: process.execPath,
      args: [bridgeScript(), '--data-dir', app.getPath('userData'), '--app', appLaunchPath()],
      env: { ELECTRON_RUN_AS_NODE: '1' },
    },
  };
}

function state(): AppState {
  const conn = connection();
  return {
    version: VERSION,
    platform: process.platform,
    license: license.state(),
    engine: engine.status(),
    settings: engine.settings.get(),
    videos: engine.library.listVideos(),
    clips: engine.library.listClips(),
    libraryDir: engine.config.libraryDir,
    mcp: {
      url: conn.url,
      running: !!mcp,
      error: mcpError,
      claudeCodeCommand: claudeCodeCommand(conn),
      installed: {
        'claude-desktop': isAgentInstalled('claude-desktop'),
        codex: isAgentInstalled('codex'),
        cursor: isAgentInstalled('cursor'),
      },
    },
  };
}

let pushTimer: NodeJS.Timeout | null = null;
function pushState(): void {
  if (pushTimer) return;
  pushTimer = setTimeout(() => {
    pushTimer = null;
    win?.webContents.send('state', state());
  }, 200);
}

/** Only files the engine wrote, or the sources it imported, are served to the UI. */
function servable(file: string): boolean {
  const resolved = path.resolve(file);
  if (resolved.startsWith(path.resolve(engine.config.libraryDir) + path.sep)) return true;
  return engine.library.listVideos().some((v) => v.sourcePath && path.resolve(v.sourcePath) === resolved);
}

function registerMediaProtocol(): void {
  protocol.handle('media', (request) => {
    const file = decodeURIComponent(new URL(request.url).pathname.replace(/^\/+/, '/'));
    const local = process.platform === 'win32' ? file.replace(/^\//, '') : file;
    if (!servable(local)) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(local).toString(), { headers: request.headers });
  });
}

function createWindow(): void {
  if (win) {
    win.show();
    win.focus();
    return;
  }
  win = new BrowserWindow({
    width: 1180,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Momentreel',
    backgroundColor: '#0f0f12',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  // Links open in the browser, never inside the app
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  win.on('close', (event) => {
    if (!quitting) {
      event.preventDefault();
      win?.hide();
    }
  });
  win.on('closed', () => {
    win = null;
  });
}

function createTray(): void {
  // macOS keeps the Dock icon; Windows needs a way back to a hidden window
  if (process.platform === 'darwin') return;
  const icon = nativeImage.createFromPath(path.join(resourcesDir(), 'icon.png'));
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
  tray.setToolTip('Momentreel');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Open Momentreel', click: createWindow },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() },
    ])
  );
  tray.on('click', createWindow);
}

async function startMcp(): Promise<void> {
  const settings = engine.settings.get();
  try {
    mcp = await startMcpHttp({
      port: settings.mcpPort,
      token: settings.mcpToken,
      createServer: () => createMcpServer(engine, license, VERSION),
    });
    mcpError = null;
  } catch (err) {
    mcp = null;
    mcpError =
      (err as NodeJS.ErrnoException).code === 'EADDRINUSE'
        ? `Port ${settings.mcpPort} is in use by another program. Change it in Settings.`
        : String(err);
  }
  pushState();
}

function registerIpc(): void {
  const handle = <A extends unknown[], R>(channel: string, fn: (...args: A) => R | Promise<R>) =>
    ipcMain.handle(channel, async (_event, ...args) => fn(...(args as A)));

  handle('state:get', () => state());

  handle('license:activate', async (key: string) => {
    const result = await license.activate(key);
    pushState();
    return result;
  });
  handle('license:deactivate', async () => {
    await license.deactivate();
    pushState();
  });

  handle('video:import', (source: string) => engine.importVideo({ source }));
  handle('video:pick', async () => {
    const result = await dialog.showOpenDialog(win!, {
      properties: ['openFile'],
      filters: [{ name: 'Video', extensions: ['mp4', 'mov', 'mkv', 'webm', 'm4v', 'avi'] }],
    });
    return result.canceled ? null : result.filePaths[0];
  });
  handle('video:delete', (id: string) => engine.deleteVideo(id));
  handle('video:reveal', (id: string) => {
    const video = engine.library.getVideo(id);
    if (video) shell.openPath(video.dir);
  });

  handle('clip:update', (id: string, patch: Parameters<Engine['updateClip']>[1]) => engine.updateClip(id, patch));
  handle('clip:delete', (id: string) => engine.deleteClip(id));
  handle('clip:reveal', (id: string) => {
    const clip = engine.library.getClip(id);
    if (clip?.filePath) shell.showItemInFolder(clip.filePath);
  });

  handle('model:download', (id: string) => {
    // Long-running: progress arrives through state pushes, errors as a dialog
    engine.downloadWhisperModel(id).catch((err) => dialog.showErrorBox('Model download failed', String(err)));
  });
  handle('settings:update', async (patch: Partial<Settings>) => {
    const before = engine.settings.get();
    const next = engine.updateSettings(patch);
    if (next.mcpPort !== before.mcpPort || next.mcpToken !== before.mcpToken) {
      await mcp?.close();
      await startMcp();
    }
    return next;
  });

  handle('agent:install', (agent: Exclude<AgentId, 'claude-code'>) => {
    const file = installAgent(agent, connection());
    pushState();
    return file;
  });
  handle('agent:copy-claude-code', () => {
    clipboard.writeText(claudeCodeCommand(connection()));
  });
  handle('shell:open-external', (url: string) => {
    if (/^https:\/\//.test(url)) void shell.openExternal(url);
  });
}

function setupAutoUpdates(): void {
  if (!app.isPackaged) return;
  autoUpdater.autoDownload = true;
  autoUpdater.on('error', (err) => console.warn('[updater]', err.message));
  void autoUpdater.checkForUpdatesAndNotify();
  setInterval(() => void autoUpdater.checkForUpdatesAndNotify(), 6 * 3_600_000);
}

app.on('second-instance', () => createWindow());

app.whenReady().then(async () => {
  const dataDir = app.getPath('userData');
  engine = new Engine({
    dataDir,
    libraryDir: path.join(app.getPath('videos'), 'Momentreel'),
    resourcesDir: resourcesDir(),
    fontsDir: app.isPackaged
      ? path.join(process.resourcesPath, 'fonts', 'captions')
      : path.join(__dirname, '..', '..', 'public', 'fonts', 'captions'),
    // yt-dlp needs a JS runtime for YouTube; this binary is one when run as node
    ytdlpJsRuntime: `node:${process.execPath}`,
  });
  // Unpackaged builds never talk to a licence server
  const provider = app.isPackaged ? selectLicenseProvider() : devLicenseProvider;
  license = new LicenseManager(dataDir, provider, loadDevice(dataDir));
  void license.refresh().then(pushState);
  setInterval(() => void license.refresh().then(pushState), 3_600_000);

  engine.on('change', pushState);
  registerMediaProtocol();
  registerIpc();
  await startMcp();
  createTray();
  if (!process.argv.includes('--background')) createWindow();
  setupAutoUpdates();
  void engine.updateYtdlp().then(pushState);

  app.on('activate', createWindow);
});

app.on('before-quit', () => {
  quitting = true;
  engine?.shutdown();
  void mcp?.close();
});

// Keep serving the agent with every window closed
app.on('window-all-closed', () => {});
