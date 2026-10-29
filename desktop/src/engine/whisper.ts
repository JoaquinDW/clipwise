/**
 * Local transcription with whisper.cpp.
 *
 * MCP cannot carry this part: agents read text, not audio. Running Whisper on
 * the user's machine is what removes the per-minute Whisper API cost, and on
 * Apple Silicon whisper.cpp uses Metal, so a one-hour podcast takes minutes.
 */
import { execFile, spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';
import type { TranscriptionResult } from '@/lib/ai/transcribe';
import { parseWhisperProgress, toTranscription, type WhisperJson } from './whisper-output';

const execFileAsync = promisify(execFile);

export interface WhisperModel {
  id: string;
  label: string;
  file: string;
  sizeMb: number;
}

/**
 * Models the app offers, smallest first. `small` is the default: it is the
 * smallest that transcribes Spanish well enough to caption, and still runs
 * acceptably on an Intel Mac.
 */
export const WHISPER_MODELS: WhisperModel[] = [
  { id: 'base', label: 'Base (rápido, menos preciso)', file: 'ggml-base.bin', sizeMb: 148 },
  { id: 'small', label: 'Small (recomendado)', file: 'ggml-small.bin', sizeMb: 488 },
  { id: 'large-v3-turbo-q5_0', label: 'Large v3 Turbo (mejor calidad, Apple Silicon)', file: 'ggml-large-v3-turbo-q5_0.bin', sizeMb: 574 },
];

export const DEFAULT_WHISPER_MODEL = 'small';

const MODEL_BASE_URL = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main';

export function getWhisperModel(id: string): WhisperModel {
  const model = WHISPER_MODELS.find((m) => m.id === id);
  if (!model) throw new Error(`Unknown Whisper model "${id}"`);
  return model;
}

export function modelPath(modelsDir: string, id: string): string {
  return path.join(modelsDir, getWhisperModel(id).file);
}

export function isModelInstalled(modelsDir: string, id: string): boolean {
  return fs.existsSync(modelPath(modelsDir, id));
}

/** Download a model into `modelsDir`, reporting 0-1. Resumes nothing: a partial file is discarded. */
export async function downloadModel(
  modelsDir: string,
  id: string,
  onProgress: (fraction: number) => void
): Promise<string> {
  const model = getWhisperModel(id);
  const dest = modelPath(modelsDir, id);
  const tmp = `${dest}.download`;
  await fs.promises.mkdir(modelsDir, { recursive: true });

  const response = await fetch(`${MODEL_BASE_URL}/${model.file}`);
  if (!response.ok || !response.body) {
    throw new Error(`Could not download the ${model.id} model (HTTP ${response.status})`);
  }

  const total = Number(response.headers.get('content-length')) || model.sizeMb * 1024 * 1024;
  let received = 0;
  const out = fs.createWriteStream(tmp);
  try {
    // @ts-expect-error — Node's fetch body is an async-iterable web stream
    for await (const chunk of response.body) {
      const buffer = Buffer.from(chunk);
      received += buffer.length;
      if (!out.write(buffer)) await new Promise<void>((resolve) => out.once('drain', () => resolve()));
      onProgress(Math.min(1, received / total));
    }
    await new Promise<void>((resolve, reject) => out.end((err?: Error | null) => (err ? reject(err) : resolve())));
    await fs.promises.rename(tmp, dest);
  } catch (err) {
    out.destroy();
    await fs.promises.unlink(tmp).catch(() => {});
    throw err;
  }
  return dest;
}

/** whisper.cpp only reads 16 kHz mono PCM. */
export async function extractWhisperAudio(ffmpegPath: string, input: string, output: string): Promise<void> {
  await execFileAsync(
    ffmpegPath,
    ['-y', '-i', input, '-vn', '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', output],
    { maxBuffer: 1024 * 1024 * 20 }
  );
}

export async function transcribeLocal(opts: {
  whisperCli: string;
  modelFile: string;
  wavPath: string;
  language?: string;
  durationHint?: number;
  onProgress?: (fraction: number) => void;
}): Promise<TranscriptionResult> {
  const outBase = path.join(path.dirname(opts.wavPath), 'whisper');
  const threads = Math.max(1, Math.min(8, os.cpus().length - 1));

  const args = [
    '-m', opts.modelFile,
    '-f', opts.wavPath,
    '-l', opts.language || 'auto',
    '-t', String(threads),
    // One entry per word, split on word boundaries: word-level timings are what
    // the caption renderer animates against
    '-ml', '1',
    '-sow',
    '-oj',
    '-of', outBase,
    '-pp',
  ];

  await new Promise<void>((resolve, reject) => {
    const child = spawn(opts.whisperCli, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderrTail = '';
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk: string) => {
      stderrTail = (stderrTail + chunk).slice(-4000);
      for (const line of chunk.split('\n')) {
        const fraction = parseWhisperProgress(line);
        if (fraction !== null) opts.onProgress?.(fraction);
      }
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`whisper.cpp exited with ${code}: ${stderrTail.trim().split('\n').slice(-3).join(' ')}`));
    });
  });

  const json = JSON.parse(await fs.promises.readFile(`${outBase}.json`, 'utf8')) as WhisperJson;
  await fs.promises.unlink(`${outBase}.json`).catch(() => {});
  return toTranscription(json, opts.durationHint);
}
