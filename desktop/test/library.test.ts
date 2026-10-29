import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { Library } from '../src/engine/library';

describe('Library', () => {
  it('marks work interrupted by a quit as failed on the next start', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mr-lib-'));
    const file = path.join(dir, 'library.json');
    const lib = new Library(file);
    const now = new Date().toISOString();
    lib.addVideo({ id: 'v', title: 't', source: 'file', dir, status: 'transcribing', progress: 40, createdAt: now, updatedAt: now });
    lib.flush();

    const reopened = new Library(file);
    expect(reopened.getVideo('v')).toMatchObject({ status: 'failed', error: expect.stringMatching(/Interrupted/) });
  });

  it('keeps a corrupt library aside instead of overwriting it', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mr-lib-'));
    const file = path.join(dir, 'library.json');
    fs.writeFileSync(file, '{not json');
    const lib = new Library(file);
    expect(lib.listVideos()).toEqual([]);
    expect(fs.readdirSync(dir).some((f) => f.startsWith('library.json.corrupt-'))).toBe(true);
  });
});
