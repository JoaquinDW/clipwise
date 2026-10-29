/**
 * Headless engine + MCP endpoint, without Electron.
 *
 * For development and for testing the agent workflow end to end (phase 1 of
 * the plan): `pnpm dev:engine`, then point Claude Code at the printed URL.
 * The packaged app runs the same pieces from its main process.
 */
import os from 'os';
import path from 'path';
import { Engine } from '../engine/engine';
import { LicenseManager, loadDevice } from '../license/license';
import { selectLicenseProvider } from '../license/providers';
import { createMcpServer } from '../mcp/server';
import { startMcpHttp } from '../mcp/http';

const root = path.resolve(__dirname, '..');
const dataDir = process.env.MOMENTREEL_DATA_DIR || path.join(os.homedir(), '.momentreel-dev');

async function main() {
  const engine = new Engine({
    dataDir,
    libraryDir: process.env.MOMENTREEL_LIBRARY_DIR || path.join(dataDir, 'library'),
    resourcesDir: path.join(root, 'resources'),
    fontsDir: path.join(root, '..', 'public', 'fonts', 'captions'),
  });
  const license = new LicenseManager(dataDir, selectLicenseProvider(), loadDevice(dataDir));
  await license.refresh();

  if (process.argv.includes('--download-model')) {
    const id = engine.settings.get().whisperModel;
    console.log(`Downloading Whisper model ${id}…`);
    await engine.downloadWhisperModel(id);
  }

  const key = process.env.MOMENTREEL_LICENSE_KEY;
  if (key && license.state().status === 'none') await license.activate(key);

  const settings = engine.settings.get();
  const handle = await startMcpHttp({
    port: settings.mcpPort,
    token: settings.mcpToken,
    createServer: () => createMcpServer(engine, license, 'dev'),
  });

  const status = engine.status();
  console.log(`Momentreel engine — data in ${dataDir}`);
  console.log(`MCP endpoint: ${handle.url}`);
  console.log(`Token:        ${settings.mcpToken}`);
  console.log(`Licence:      ${license.denialReason() ?? 'active'}`);
  if (status.problems.length) console.log(`Not ready:    ${status.problems.join('; ')}`);
  console.log(
    `\nClaude Code: claude mcp add --transport http momentreel ${handle.url} --header "Authorization: Bearer ${settings.mcpToken}"`
  );

  const stop = async () => {
    engine.shutdown();
    await handle.close();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
