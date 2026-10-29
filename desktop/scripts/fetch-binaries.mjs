#!/usr/bin/env node
// Puts yt-dlp and whisper-cli into resources/bin/<platform>-<arch>/ before a
// release build. FFmpeg and ffprobe come from their npm installer packages.
//
//   pnpm fetch-binaries              # this machine's platform and arch
//   pnpm fetch-binaries darwin-x64   # an explicit target (yt-dlp only when cross-building)
//
// whisper-cli is compiled from source on macOS (Metal, static, so the app
// bundle carries no dylibs), and taken from the official release zip on Windows.
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const WHISPER_CPP_VERSION = 'v1.7.6';
const here = path.dirname(fileURLToPath(import.meta.url));
const target = process.argv[2] || `${process.platform}-${process.arch}`;
const [platform, arch] = target.split('-');
const outDir = path.join(here, '..', 'resources', 'bin', target);
fs.mkdirSync(outDir, { recursive: true });

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });

async function download(url, dest) {
  console.log(`↓ ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

async function fetchYtdlp() {
  // Nightly, as the worker Dockerfile does: stable builds fall behind YouTube's changes
  const base = 'https://github.com/yt-dlp/yt-dlp-nightly-builds/releases/latest/download';
  if (platform === 'darwin') {
    const dest = path.join(outDir, 'yt-dlp');
    await download(`${base}/yt-dlp_macos`, dest);
    fs.chmodSync(dest, 0o755);
  } else if (platform === 'win32') {
    await download(`${base}/yt-dlp.exe`, path.join(outDir, 'yt-dlp.exe'));
  } else {
    const dest = path.join(outDir, 'yt-dlp');
    await download(`${base}/yt-dlp_linux`, dest);
    fs.chmodSync(dest, 0o755);
  }
}

function buildWhisperMac() {
  if (process.platform !== 'darwin' || arch !== process.arch) {
    console.warn(`! whisper-cli for ${target} must be built on a ${target} Mac; skipped`);
    return;
  }
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'whisper-cpp-'));
  run('git', ['clone', '--depth', '1', '--branch', WHISPER_CPP_VERSION, 'https://github.com/ggml-org/whisper.cpp', work]);
  run('cmake', [
    '-S', work,
    '-B', path.join(work, 'build'),
    '-DCMAKE_BUILD_TYPE=Release',
    '-DBUILD_SHARED_LIBS=OFF',
    '-DWHISPER_BUILD_TESTS=OFF',
    '-DGGML_METAL=ON',
    // Shaders compiled into the binary: nothing to ship next to it
    '-DGGML_METAL_EMBED_LIBRARY=ON',
    // Intel Macs predate many SIMD extensions; target the baseline
    ...(arch === 'x64' ? ['-DGGML_NATIVE=OFF'] : []),
    '-DCMAKE_OSX_DEPLOYMENT_TARGET=12.0',
  ]);
  run('cmake', ['--build', path.join(work, 'build'), '--config', 'Release', '--target', 'whisper-cli', '-j']);
  fs.copyFileSync(path.join(work, 'build', 'bin', 'whisper-cli'), path.join(outDir, 'whisper-cli'));
  fs.chmodSync(path.join(outDir, 'whisper-cli'), 0o755);
  fs.rmSync(work, { recursive: true, force: true });
}

async function fetchWhisperWindows() {
  const zip = path.join(os.tmpdir(), 'whisper-bin-x64.zip');
  await download(`https://github.com/ggml-org/whisper.cpp/releases/download/${WHISPER_CPP_VERSION}/whisper-bin-x64.zip`, zip);
  const extracted = fs.mkdtempSync(path.join(os.tmpdir(), 'whisper-bin-'));
  run('tar', ['-xf', zip, '-C', extracted]);
  // whisper-cli.exe needs the DLLs that ship beside it
  const release = fs.existsSync(path.join(extracted, 'Release')) ? path.join(extracted, 'Release') : extracted;
  for (const file of fs.readdirSync(release)) {
    if (file === 'whisper-cli.exe' || file.endsWith('.dll')) fs.copyFileSync(path.join(release, file), path.join(outDir, file));
  }
}

await fetchYtdlp();
if (platform === 'darwin') buildWhisperMac();
else if (platform === 'win32') await fetchWhisperWindows();
else console.warn('! Linux is not a release target; install whisper.cpp and set WHISPER_CLI_PATH');
console.log(`✓ ${outDir}`);
