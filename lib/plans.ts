/**
 * Single source of truth for subscription plans.
 *
 * Everything that needs to know about pricing, quotas or provider product IDs
 * reads from here: the landing pricing section, /billing, the checkout route,
 * the billing webhook, the access gate and the queue workers.
 */

export type PlanId = 'starter' | 'pro';

export interface Plan {
  id: PlanId;
  name: string;
  /** Monthly price in USD when billed monthly. */
  priceMonthly: number;
  /** Monthly price in USD when billed annually (null when not offered). */
  priceAnnual: number | null;
  /** Video minutes included per billing period. */
  minutesPerMonth: number;
  maxClipsPerVideo: number;
  maxVideoDurationSeconds: number;
  /** Polar product ID (a UUID). Undefined until configured. */
  polarProductId?: string;
}

/** Days of free trial granted by Stripe on the first subscription. */
export const TRIAL_DAYS = 7;

/** Video minutes a company can process while still on trial. */
export const TRIAL_MINUTES = 30;

/** Billing support contact shown in the app. */
export const SUPPORT_EMAIL = 'support@momentreel.app';

export const PLANS: Record<PlanId, Plan> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    priceMonthly: 8,
    priceAnnual: null,
    minutesPerMonth: 120,
    maxClipsPerVideo: 5,
    maxVideoDurationSeconds: 3600,
    polarProductId: process.env.NEXT_PUBLIC_POLAR_STARTER_PRODUCT_ID,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceMonthly: 15,
    priceAnnual: null,
    minutesPerMonth: 300,
    maxClipsPerVideo: 10,
    maxVideoDurationSeconds: 3600,
    polarProductId: process.env.NEXT_PUBLIC_POLAR_PRO_PRODUCT_ID,
  },
};

/** All plans in display order. Both are self-serve. */
export const ALL_PLANS: Plan[] = [PLANS.starter, PLANS.pro];

/**
 * Product IDs we are willing to start a checkout with. Anything else posted to
 * the checkout route is rejected.
 */
export function getAllowedProductIds(): string[] {
  return ALL_PLANS.map(p => p.polarProductId).filter(
    (id): id is string => typeof id === 'string' && id.length > 0
  );
}

export function isAllowedProductId(productId: string): boolean {
  return getAllowedProductIds().includes(productId);
}

export function getPlanByProductId(productId: string | null | undefined): Plan | null {
  if (!productId) return null;
  return ALL_PLANS.find(p => p.polarProductId && p.polarProductId === productId) ?? null;
}

export function getPlanById(planId: string | null | undefined): Plan | null {
  if (!planId) return null;
  return (PLANS as Record<string, Plan>)[planId] ?? null;
}

export interface PlanLimits {
  minutesPerMonth: number;
  maxClipsPerVideo: number;
  maxVideoDurationSeconds: number;
}

/**
 * Effective limits for a company. Falls back to trial limits when no plan is
 * set yet (user is inside the Stripe trial before the first invoice).
 */
export function getPlanLimits(planId: string | null | undefined): PlanLimits {
  const plan = getPlanById(planId);
  if (plan) {
    return {
      minutesPerMonth: plan.minutesPerMonth,
      maxClipsPerVideo: plan.maxClipsPerVideo,
      maxVideoDurationSeconds: plan.maxVideoDurationSeconds,
    };
  }

  return {
    minutesPerMonth: TRIAL_MINUTES,
    maxClipsPerVideo: Number(process.env.MAX_CLIPS_PER_VIDEO) || 5,
    maxVideoDurationSeconds: Number(process.env.MAX_VIDEO_DURATION_SECONDS) || 3600,
  };
}
