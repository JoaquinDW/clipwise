/**
 * stdio ↔ HTTP bridge for MCP clients that can only launch a command.
 *
 * Claude Desktop (and Codex, by default) start MCP servers as child processes
 * speaking JSON-RPC over stdio. Running a second engine there would mean two
 * writers on one library, so this process does no work of its own: it forwards
 * every message to the app's local HTTP endpoint and back, starting the app if
 * it is not running.
 *
 * Launched as `<Momentreel binary> <bridge.js> --data-dir <dir> [--app <path>]`
 * with ELECTRON_RUN_AS_NODE=1, so it needs no node install on the machine.
 */
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import { MCP_PATH } from './http';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

// stdout is the protocol channel; anything human goes to stderr
const log = (...parts: unknown[]) => console.error('[momentreel-bridge]', ...parts);

function readSettings(dataDir: string): { mcpPort: number; mcpToken: string } {
  const file = path.join(dataDir, 'settings.json');
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    throw new Error(`Momentreel has not been set up yet (no ${file}). Open the app once.`);
  }
}

async function isUp(port: number): Promise<boolean> {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

function launchApp(appPath: string | undefined): void {
  if (!appPath) return;
  log('Starting Momentreel…');
  // This process runs with ELECTRON_RUN_AS_NODE; the app must not inherit it
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const child =
    process.platform === 'darwin'
      ? spawn('open', ['-g', appPath], { detached: true, stdio: 'ignore', env })
      : spawn(appPath, ['--background'], { detached: true, stdio: 'ignore', env });
  child.unref();
}

async function waitForApp(port: number, appPath: string | undefined): Promise<void> {
  if (await isUp(port)) return;
  launchApp(appPath);
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 500));
    if (await isUp(port)) return;
  }
  throw new Error('Momentreel is not running and did not start. Open the app and try again.');
}

async function main(): Promise<void> {
  const dataDir = arg('--data-dir');
  if (!dataDir) throw new Error('--data-dir is required');
  const appPath = arg('--app');

  const settings = readSettings(dataDir);
  await waitForApp(settings.mcpPort, appPath);

  const upstream = new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${settings.mcpPort}${MCP_PATH}`), {
    requestInit: { headers: { Authorization: `Bearer ${settings.mcpToken}` } },
  });
  const local = new StdioServerTransport();

  local.onmessage = (message: JSONRPCMessage) => {
    upstream.send(message).catch((err: Error) => {
      log('forward failed:', err.message);
      // A request that never gets an answer hangs the client; answer it with the error
      if ('id' in message && message.id !== undefined && 'method' in message) {
        void local.send({
          jsonrpc: '2.0',
          id: message.id,
          error: { code: -32000, message: `Momentreel is not reachable: ${err.message}` },
        });
      }
    });
  };
  upstream.onmessage = (message) => void local.send(message);
  upstream.onerror = (err) => log('upstream error:', err.message);
  local.onclose = () => {
    void upstream.close();
    process.exit(0);
  };

  await upstream.start();
  await local.start();
}

main().catch((err) => {
  log(err instanceof Error ? err.message : err);
  process.exit(1);
});
