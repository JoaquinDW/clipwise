/* eslint-disable indent */
import { NextRequest } from 'next/server';
import { headers } from 'next/headers';
import { validateEvent, WebhookVerificationError } from '@polar-sh/sdk/webhooks.js';
import type { Order } from '@polar-sh/sdk/models/components/order.js';
import { RegisterTransaction, SyncSubscription } from '@/domain/company/use-case';
import { CompanyRepository } from '@/domain/company/company.repository';
import type { TransactionProps } from '@/domain/company/company.entity';
import { getPlanByProductId } from '@/lib/plans';

/**
 * Polar webhook receiver.
 *
 * Polar and Stripe share the same subscription status vocabulary
 * (trialing | active | past_due | canceled | incomplete | unpaid | paused), so
 * the statuses land on Company unchanged and lib/billing/access.ts needs no
 * translation layer.
 */

function metadataString(
  metadata: Record<string, unknown> | undefined,
  key: string
): string | undefined {
  const value = metadata?.[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * The subset of a Polar subscription we persist. Both the full `Subscription`
 * of the `subscription.*` events and the leaner `OrderSubscription` nested in
 * `order.paid` satisfy this — the latter carries no nested `customer`, hence
 * the optional field.
 */
type SyncableSubscription = {
  id: string;
  status: string;
  productId: string;
  customerId: string;
  currentPeriodEnd: Date | null;
  trialEnd: Date | null;
  metadata: Record<string, unknown>;
  customer?: { externalId?: string | null } | null;
};

/** Mirror a Polar subscription onto the company it belongs to. */
async function syncFromSubscription(
  subscription: SyncableSubscription,
  options: { resetMinutes?: boolean; statusOverride?: string } = {}
) {
  const plan = getPlanByProductId(subscription.productId);

  const synced = await new SyncSubscription().sync({
    // The company id travels as the customer's external id — see the checkout
    // route. The metadata copy is the fallback.
    billingCustomerId: subscription.customerId,
    fallbackCompanyId:
      subscription.customer?.externalId ??
      metadataString(subscription.metadata, 'companyId'),
    billingProvider: 'polar',
    billingSubscriptionId: subscription.id,
    billingProductId: subscription.productId,
    plan: plan?.id ?? null,
    subscriptionStatus: options.statusOverride ?? subscription.status,
    trialEndsAt: subscription.trialEnd ?? null,
    currentPeriodEnd: subscription.currentPeriodEnd ?? null,
    resetMinutes: options.resetMinutes,
  });

  if (!synced) {
    console.warn(
      `[polar-webhook] no company matched subscription ${subscription.id} ` +
        `(customer ${subscription.customerId}, external ${subscription.customer?.externalId})`
    );
  }
}

/** Keep an audit trail of settled payments. */
async function recordOrder(order: Order) {
  const companyId = await new CompanyRepository().findCompanyIdForBilling(
    order.customerId,
    order.customer?.externalId ?? metadataString(order.metadata, 'companyId')
  );
  if (!companyId) return;

  const transaction: TransactionProps = {
    companyId,
    userId: metadataString(order.metadata, 'userId'),
    productId: order.productId ?? undefined,
    orderId: order.id,
    billingReason: order.billingReason,
    amount: order.totalAmount,
    currency: order.currency,
    created: Math.floor(order.createdAt.getTime() / 1000),
    customerDetails: {
      email: order.customer?.email ?? null,
      name: order.customer?.name ?? null,
      country: order.customer?.billingAddress?.country ?? null,
    },
  };

  await new RegisterTransaction().registerTransaction(transaction);
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headerList = headers();
  const webhookHeaders: Record<string, string> = {};
  headerList.forEach((value, key) => {
    webhookHeaders[key] = value;
  });

  let event: ReturnType<typeof validateEvent>;
  try {
    event = validateEvent(body, webhookHeaders, process.env.POLAR_WEBHOOK_SECRET ?? '');
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      return new Response('Invalid signature', { status: 403 });
    }
    return new Response(`Webhook Error: ${error}`, { status: 400 });
  }

  try {
    switch (event.type) {
      // A new subscription, including one that starts in `trialing`.
      case 'subscription.created':
        await syncFromSubscription(event.data, { resetMinutes: true });
        break;

      case 'subscription.active':
      case 'subscription.updated':
      case 'subscription.uncanceled':
        await syncFromSubscription(event.data);
        break;

      case 'subscription.past_due':
        await syncFromSubscription(event.data, { statusOverride: 'past_due' });
        break;

      // `canceled` still runs to the end of the paid period; `revoked` is the
      // definitive end. Both stop access at the next access check.
      case 'subscription.canceled':
      case 'subscription.revoked':
        await syncFromSubscription(event.data, { statusOverride: event.data.status });
        break;

      case 'order.paid': {
        const order = event.data;
        await recordOrder(order);
        // A renewal opens a new metering period; the first order of a
        // subscription was already reset by subscription.created.
        if (order.subscription && order.billingReason === 'subscription_cycle') {
          await syncFromSubscription(order.subscription, { resetMinutes: true });
        }
        break;
      }

      default:
        // Acknowledged, not retried. A non-2xx here would make Polar redeliver
        // unrelated events forever.
        break;
    }

    return new Response('ok', { status: 200 });
  } catch (error) {
    console.error(`[polar-webhook] failed handling ${event.type}`, error);
    return new Response('Server error', { status: 500 });
  }
}
