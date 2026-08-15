import { NextResponse } from 'next/server';
import { getSessionUserWithCompany, type SessionUserWithCompany } from '@/lib/auth/session';
import { accessDenialMessage, getCompanyAccess, type CompanyAccess } from '@/lib/billing/access';

export type GuardResult =
  | { ok: true; user: SessionUserWithCompany; access: CompanyAccess }
  | { ok: false; response: NextResponse };

/**
 * Single entry gate for every route that spends compute: authenticated, has a
 * company, has an active subscription or trial, and still has quota left.
 */
export async function requireBillableUser(): Promise<GuardResult> {
  const user = await getSessionUserWithCompany();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const access = await getCompanyAccess(user.companyId, user.email);
  if (!access.allowed) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: accessDenialMessage(access.reason), reason: access.reason },
        { status: 402 }
      ),
    };
  }

  return { ok: true, user, access };
}

/** Auth-only gate, for routes that read data instead of spending compute. */
export async function requireUser(): Promise<GuardResult> {
  const user = await getSessionUserWithCompany();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const access = await getCompanyAccess(user.companyId, user.email);
  return { ok: true, user, access };
}
