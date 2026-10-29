/**
 * Lifetime licences, independent of who sells them.
 *
 * The merchant of record is still undecided (Polar, Lemon Squeezy, …), so the
 * app only knows a `LicenseProvider`: something that can activate a key on this
 * device and later confirm it still holds. Swapping seller means writing one
 * provider, not touching the app.
 *
 * A lifetime licence must keep working offline: it is checked at most once a
 * day, and a failed check (no network, seller down) is forgiven for
 * OFFLINE_GRACE_DAYS. Only an explicit "this key is revoked" turns it off.
 */
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

export interface DeviceInfo {
  id: string;
  name: string;
}

export interface LicenseGrant {
  provider: string;
  key: string;
  /** The seller's id for this device's activation, needed to validate or release it. */
  activationId?: string;
  email?: string;
  /** ISO time of the last successful check against the seller. */
  validatedAt: string;
}

/** Thrown when the seller definitively refuses a key (unknown, refunded, too many devices). */
export class LicenseRejected extends Error {
  name = 'LicenseRejected';
}

export interface LicenseProvider {
  readonly id: string;
  activate(key: string, device: DeviceInfo): Promise<Omit<LicenseGrant, 'validatedAt' | 'provider'>>;
  /** Resolves if the activation still holds; throws LicenseRejected if not; any other error means "could not check". */
  validate(grant: LicenseGrant, device: DeviceInfo): Promise<void>;
  deactivate?(grant: LicenseGrant, device: DeviceInfo): Promise<void>;
}

export const REVALIDATE_HOURS = 24;
export const OFFLINE_GRACE_DAYS = 14;

export type LicenseState =
  | { status: 'none' }
  | { status: 'active'; email?: string; keyHint: string; validatedAt: string; offline: boolean }
  | { status: 'expired-offline'; keyHint: string; validatedAt: string };

function keyHint(key: string): string {
  return key.length <= 8 ? key : `${key.slice(0, 4)}…${key.slice(-4)}`;
}

/**
 * A stable id for this machine that reveals nothing about it. Generated once
 * and stored, so reinstalling the app does not burn a device slot.
 */
export function loadDevice(dataDir: string): DeviceInfo {
  const file = path.join(dataDir, 'device.json');
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as DeviceInfo;
  } catch {
    const device = { id: crypto.randomUUID(), name: os.hostname() };
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(device));
    return device;
  }
}

export class LicenseManager {
  private grant: LicenseGrant | null;
  private readonly file: string;
  /** Set while a check failed for reasons other than rejection. */
  private lastCheckFailed = false;

  constructor(
    dataDir: string,
    private readonly provider: LicenseProvider,
    private readonly device: DeviceInfo,
    private readonly now: () => Date = () => new Date()
  ) {
    this.file = path.join(dataDir, 'license.json');
    this.grant = this.read();
  }

  private read(): LicenseGrant | null {
    try {
      const grant = JSON.parse(fs.readFileSync(this.file, 'utf8')) as LicenseGrant;
      // A grant from another seller cannot be validated by this one; ask for the key again
      return grant.provider === this.provider.id ? grant : null;
    } catch {
      return null;
    }
  }

  private write(grant: LicenseGrant | null): void {
    this.grant = grant;
    if (grant) fs.writeFileSync(this.file, JSON.stringify(grant, null, 2), { mode: 0o600 });
    else fs.rmSync(this.file, { force: true });
  }

  private ageMs(): number {
    return this.grant ? this.now().getTime() - new Date(this.grant.validatedAt).getTime() : Infinity;
  }

  state(): LicenseState {
    if (!this.grant) return { status: 'none' };
    const hint = keyHint(this.grant.key);
    if (this.ageMs() > OFFLINE_GRACE_DAYS * 86_400_000) {
      return { status: 'expired-offline', keyHint: hint, validatedAt: this.grant.validatedAt };
    }
    return {
      status: 'active',
      email: this.grant.email,
      keyHint: hint,
      validatedAt: this.grant.validatedAt,
      offline: this.lastCheckFailed,
    };
  }

  /** null when the app may be used; otherwise a sentence for the user (or their agent). */
  denialReason(): string | null {
    const state = this.state();
    if (state.status === 'active') return null;
    if (state.status === 'none') return 'Momentreel is not activated. Enter your licence key in the Momentreel app.';
    return `Momentreel could not verify your licence for ${OFFLINE_GRACE_DAYS} days. Connect to the internet and open the app.`;
  }

  async activate(key: string): Promise<LicenseState> {
    const trimmed = key.trim();
    if (!trimmed) throw new LicenseRejected('Enter a licence key');
    const result = await this.provider.activate(trimmed, this.device);
    this.lastCheckFailed = false;
    this.write({ ...result, provider: this.provider.id, validatedAt: this.now().toISOString() });
    return this.state();
  }

  /** Re-check with the seller if the last check is older than a day. Never throws. */
  async refresh(force = false): Promise<LicenseState> {
    if (!this.grant) return this.state();
    if (!force && this.ageMs() < REVALIDATE_HOURS * 3_600_000) return this.state();
    try {
      await this.provider.validate(this.grant, this.device);
      this.lastCheckFailed = false;
      this.write({ ...this.grant, validatedAt: this.now().toISOString() });
    } catch (err) {
      if (err instanceof LicenseRejected) {
        this.write(null);
      } else {
        this.lastCheckFailed = true;
      }
    }
    return this.state();
  }

  /** Free this device's slot so the key can move to another machine. */
  async deactivate(): Promise<void> {
    if (this.grant && this.provider.deactivate) {
      await this.provider.deactivate(this.grant, this.device);
    }
    this.write(null);
  }
}
