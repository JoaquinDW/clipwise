import fs from 'fs';
import os from 'os';
import path from 'path';
import { beforeEach, describe, expect, it } from 'vitest';
import { LicenseManager, LicenseRejected, type LicenseProvider } from '../src/license/license';

const device = { id: 'dev-1', name: 'test' };

function provider(validate: LicenseProvider['validate']): LicenseProvider {
  return { id: 'test', activate: async (key) => ({ key, email: 'a@b.c', activationId: 'act' }), validate };
}

describe('LicenseManager', () => {
  let dir: string;
  let now: Date;
  const clock = () => now;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mr-license-'));
    now = new Date('2026-01-01T00:00:00Z');
  });

  it('starts unactivated and activates', async () => {
    const manager = new LicenseManager(dir, provider(async () => {}), device, clock);
    expect(manager.denialReason()).toMatch(/not activated/);
    await manager.activate('KEY-1234-5678');
    expect(manager.state()).toMatchObject({ status: 'active', email: 'a@b.c', keyHint: 'KEY-…5678' });
    // Persisted across restarts
    expect(new LicenseManager(dir, provider(async () => {}), device, clock).denialReason()).toBeNull();
  });

  it('forgives failed checks for the grace period, then stops', async () => {
    const manager = new LicenseManager(dir, provider(async () => { throw new Error('offline'); }), device, clock);
    await manager.activate('KEY');
    now = new Date('2026-01-10T00:00:00Z');
    expect((await manager.refresh()).status).toBe('active');
    now = new Date('2026-01-20T00:00:00Z');
    expect((await manager.refresh()).status).toBe('expired-offline');
    expect(manager.denialReason()).toMatch(/14 days/);
  });

  it('turns off at once when the seller rejects the key', async () => {
    const manager = new LicenseManager(dir, provider(async () => { throw new LicenseRejected('refunded'); }), device, clock);
    await manager.activate('KEY');
    now = new Date('2026-01-03T00:00:00Z');
    expect((await manager.refresh()).status).toBe('none');
  });

  it('does not call the seller more than once a day', async () => {
    let calls = 0;
    const manager = new LicenseManager(dir, provider(async () => { calls++; }), device, clock);
    await manager.activate('KEY');
    await manager.refresh();
    expect(calls).toBe(0);
    now = new Date('2026-01-02T01:00:00Z');
    await manager.refresh();
    expect(calls).toBe(1);
  });

  it('ignores a grant stored by a different seller', async () => {
    await new LicenseManager(dir, provider(async () => {}), device, clock).activate('KEY');
    const other: LicenseProvider = { ...provider(async () => {}), id: 'other-seller' };
    expect(new LicenseManager(dir, other, device, clock).state().status).toBe('none');
  });
});
