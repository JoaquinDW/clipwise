import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { CaptionStyleName } from '@/lib/captions/presets';
import { DEFAULT_WHISPER_MODEL } from './whisper';

export interface Settings {
  whisperModel: string;
  /** Empty means let Whisper detect it. */
  language: string;
  defaultCaptionStyle: CaptionStyleName;
  /** Port of the local MCP endpoint. Fixed so agent configs written once keep working. */
  mcpPort: number;
  /** Bearer token the local MCP endpoint requires, so other local apps can't drive it. */
  mcpToken: string;
}

export const DEFAULT_MCP_PORT = 47821;

function defaults(): Settings {
  return {
    whisperModel: DEFAULT_WHISPER_MODEL,
    language: '',
    defaultCaptionStyle: 'bold',
    mcpPort: DEFAULT_MCP_PORT,
    mcpToken: crypto.randomBytes(24).toString('base64url'),
  };
}

export class SettingsStore {
  private value: Settings;

  constructor(private readonly file: string) {
    let stored: Partial<Settings> = {};
    try {
      stored = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      // First run, or unreadable: start from defaults
    }
    this.value = { ...defaults(), ...stored };
    // Persist immediately so the generated token is stable across launches
    this.write();
  }

  get(): Settings {
    return { ...this.value };
  }

  update(patch: Partial<Settings>): Settings {
    this.value = { ...this.value, ...patch };
    this.write();
    return this.get();
  }

  private write(): void {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(this.value, null, 2), { mode: 0o600 });
  }
}
