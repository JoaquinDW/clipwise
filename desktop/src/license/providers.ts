/**
 * Licence providers.
 *
 * `http` talks to a small licence API of our own (see desktop/README.md for the
 * contract). Putting our own endpoint between the app and the seller is what
 * keeps the seller swappable after release: installed apps never learn who the
 * seller is, so moving from one to another is a server change.
 *
 * `dev` accepts any key starting with DEV- and never goes online. It is only
 * selected when MOMENTREEL_LICENSE_PROVIDER=dev, which a release build does not set.
 */
import { LicenseRejected, type LicenseProvider } from './license';

interface ApiError {
  error?: string;
  /** true when the key itself is refused, as opposed to the request failing. */
  rejected?: boolean;
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json().catch(() => ({}))) as T & ApiError;
  // 4xx with rejected:true is a verdict about the key; anything else is a failed check
  if (!res.ok) {
    if (json.rejected) throw new LicenseRejected(json.error || 'This licence key was not accepted');
    throw new Error(json.error || `Licence server answered ${res.status}`);
  }
  return json;
}

export function httpLicenseProvider(baseUrl: string): LicenseProvider {
  const base = baseUrl.replace(/\/$/, '');
  return {
    id: 'http',
    async activate(key, device) {
      const res = await post<{ activation_id?: string; email?: string }>(`${base}/activate`, {
        key,
        device_id: device.id,
        device_name: device.name,
      });
      return { key, activationId: res.activation_id, email: res.email };
    },
    async validate(grant, device) {
      await post(`${base}/validate`, { key: grant.key, activation_id: grant.activationId, device_id: device.id });
    },
    async deactivate(grant, device) {
      await post(`${base}/deactivate`, { key: grant.key, activation_id: grant.activationId, device_id: device.id });
    },
  };
}

export const devLicenseProvider: LicenseProvider = {
  id: 'dev',
  async activate(key) {
    if (!key.startsWith('DEV-')) throw new LicenseRejected('Development builds accept keys starting with DEV-');
    return { key, email: 'dev@localhost' };
  },
  async validate() {},
};

export function selectLicenseProvider(env: NodeJS.ProcessEnv = process.env): LicenseProvider {
  if (env.MOMENTREEL_LICENSE_PROVIDER === 'dev') return devLicenseProvider;
  return httpLicenseProvider(env.MOMENTREEL_LICENSE_API || 'https://momentreel.app/api/license');
}
