import { prismaClientGlobal } from '@/infra/prisma';
import { getPlanById, getPlanLimits, TRIAL_MINUTES, type PlanLimits } from '@/lib/plans';
import { isSubscriptionBypassed } from '@/lib/subscription-bypass';

/** Stripe statuses that entitle a company to use the product. */
const ACTIVE_STATUSES = new Set(['active', 'trialing']);

export type AccessDenialReason = 'no_company' | 'no_subscription' | 'quota_exceeded';

export interface CompanyAccess {
  allowed: boolean;
  reason?: AccessDenialReason;
  /** True when the subscription itself is fine and only the quota is spent. */
  hasSubscription: boolean;
  planId: string | null;
  planName: string | null;
  status: string | null;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  minutesUsed: number;
  minutesLimit: number;
  minutesRemaining: number;
  limits: PlanLimits;
  bypassed: boolean;
}

/**
 * Everything the app needs to decide whether a company may process video, and
 * everything /billing needs to render its state. One query, no Stripe call.
 */
export async function getCompanyAccess(
  companyId: string | null | undefined,
  userEmail?: string | null
): Promise<CompanyAccess> {
  const bypassed = isSubscriptionBypassed(userEmail);

  if (!companyId) {
    return {
      allowed: bypassed,
      reason: bypassed ? undefined : 'no_company',
      hasSubscription: bypassed,
      planId: null,
      planName: null,
      status: null,
      trialEndsAt: null,
      currentPeriodEnd: null,
      minutesUsed: 0,
      minutesLimit: 0,
      minutesRemaining: 0,
      limits: getPlanLimits(null),
      bypassed,
    };
  }

  const company = await prismaClientGlobal.company.findUnique({
    where: { id: companyId },
    select: {
      plan: true,
      subscriptionStatus: true,
      trialEndsAt: true,
      currentPeriodEnd: true,
      minutesUsed: true,
    },
  });

  const planId = company?.plan ?? null;
  const status = company?.subscriptionStatus ?? null;
  const limits = getPlanLimits(planId);
  const minutesUsed = company?.minutesUsed ?? 0;

  // While trialing, the plan's monthly allowance is capped to the trial
  // allowance — the customer has not paid for a full period yet.
  const minutesLimit =
    status === 'trialing'
      ? Math.min(limits.minutesPerMonth, TRIAL_MINUTES)
      : limits.minutesPerMonth;

  const hasSubscription = bypassed || (!!status && ACTIVE_STATUSES.has(status));
  const withinQuota = bypassed || minutesUsed < minutesLimit;

  return {
    allowed: hasSubscription && withinQuota,
    reason: !hasSubscription ? 'no_subscription' : !withinQuota ? 'quota_exceeded' : undefined,
    hasSubscription,
    planId,
    planName: getPlanById(planId)?.name ?? null,
    status,
    trialEndsAt: company?.trialEndsAt ?? null,
    currentPeriodEnd: company?.currentPeriodEnd ?? null,
    minutesUsed,
    minutesLimit,
    minutesRemaining: Math.max(0, minutesLimit - minutesUsed),
    limits,
    bypassed,
  };
}

const DENIAL_MESSAGES: Record<AccessDenialReason, string> = {
  no_company: 'Your account is not set up yet. Reload the dashboard and try again.',
  no_subscription: 'Start your free trial to process videos.',
  quota_exceeded: 'You have used all the video minutes in your plan. Upgrade to keep going.',
};

export function accessDenialMessage(reason: AccessDenialReason | undefined): string {
  return reason ? DENIAL_MESSAGES[reason] : 'Billing check failed.';
}
