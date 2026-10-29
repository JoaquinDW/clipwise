// Bundles the app with esbuild. Shared pipeline code is imported straight from
// the repo root (`@/lib/...`), so the desktop app and the old cloud worker run
// the same FFmpeg, caption and scoring code — nothing is copied.
import { build, context } from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const watch = process.argv.includes('--watch');

// Native or file-reading packages stay in node_modules, where electron-builder
// packs (and unpacks) them; bundling would break their binary and model lookups.
const external = [
  'electron',
  'electron-updater',
  'fluent-ffmpeg',
  '@ffmpeg-installer/*',
  '@ffprobe-installer/*',
  '@napi-rs/canvas',
  '@tensorflow/*',
  '@vladmandic/face-api',
  '@vladmandic/face-api/*',
];

const shared = {
  bundle: true,
  sourcemap: true,
  logLevel: 'info',
  alias: { '@': repoRoot },
  // Shared code under ../lib resolves packages from here when the root has no install
  nodePaths: [path.join(here, 'node_modules')],
  define: { 'process.env.MOMENTREEL_VERSION': JSON.stringify(JSON.parse(fs.readFileSync(path.join(here, 'package.json'), 'utf8')).version) },
};

const node = {
  ...shared,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  external,
};

const configs = [
  { ...node, entryPoints: { main: 'src/main/main.ts', preload: 'src/main/preload.ts', bridge: 'src/mcp/bridge.ts', serve: 'src/cli/serve.ts' }, outdir: 'dist' },
  {
    ...shared,
    platform: 'browser',
    target: 'chrome130',
    format: 'iife',
    entryPoints: { app: 'src/renderer/main.tsx' },
    outdir: 'dist/renderer',
    jsx: 'automatic',
    define: { ...shared.define, 'process.env.NODE_ENV': JSON.stringify(watch ? 'development' : 'production') },
    minify: !watch,
  },
];

function copyStatic() {
  fs.mkdirSync(path.join(here, 'dist/renderer'), { recursive: true });
  for (const file of ['index.html', 'styles.css']) {
    fs.copyFileSync(path.join(here, 'src/renderer', file), path.join(here, 'dist/renderer', file));
  }
}

process.chdir(here);
copyStatic();
if (watch) {
  for (const config of configs) await (await context(config)).watch();
} else {
  await Promise.all(configs.map((config) => build(config)));
}
