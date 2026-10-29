import { describe, expect, it } from 'vitest';
import { ClipSpecSchema, validateClipRange } from '../src/engine/clip-spec';
import { classifySource, slugify } from '../src/engine/engine';

describe('ClipSpecSchema', () => {
  it('accepts the minimum an agent might send', () => {
    expect(ClipSpecSchema.parse({ title: 'x', startTime: 1, endTime: 20 })).toMatchObject({ title: 'x' });
  });

  it('accepts a partial crop strategy', () => {
    const spec = ClipSpecSchema.parse({ title: 'x', startTime: 1, endTime: 20, cropStrategy: { method: 'blur_sides' } });
    expect(spec.cropStrategy?.method).toBe('blur_sides');
  });

  it('rejects an unknown crop method', () => {
    expect(() => ClipSpecSchema.parse({ title: 'x', startTime: 1, endTime: 20, cropStrategy: { method: 'zoom' } })).toThrow();
  });
});

describe('validateClipRange', () => {
  it('enforces short-form bounds and the video length', () => {
    expect(validateClipRange({ startTime: 0, endTime: 30 }, 60)).toBeNull();
    expect(validateClipRange({ startTime: 0, endTime: 2 }, 60)).toMatch(/at least 5s/);
    expect(validateClipRange({ startTime: 0, endTime: 300 }, 600)).toMatch(/at most 180s/);
    expect(validateClipRange({ startTime: 50, endTime: 70 }, 60)).toMatch(/video is 60.0s long/);
  });
});

describe('classifySource', () => {
  it('tells YouTube, other links and files apart', () => {
    expect(classifySource('https://www.youtube.com/watch?v=abc')).toBe('youtube');
    expect(classifySource('https://youtu.be/abc')).toBe('youtube');
    expect(classifySource('https://www.twitch.tv/videos/1')).toBe('url');
    expect(classifySource('/Users/me/Movies/talk.mp4')).toBe('file');
    // A lookalike host is not YouTube
    expect(classifySource('https://notyoutube.com/x')).toBe('url');
  });
});

describe('slugify', () => {
  it('makes safe file names from titles in any language', () => {
    expect(slugify('El momento que lo cambió TODO!')).toBe('el-momento-que-lo-cambio-todo');
    expect(slugify('¿?')).toBe('clip');
  });
});
