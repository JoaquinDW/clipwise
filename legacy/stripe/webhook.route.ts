/* eslint-disable indent */
import Stripe from 'stripe';
import { NextRequest } from 'next/server';
import { headers } from 'next/headers';
import { RegisterTransaction, SyncSubscription } from '@/domain/company/use-case';
import { TransactionProps, CustomerDetails } from '@/domain/company/company.entity';
import { CompanyRepository } from '@/domain/company/company.repository';
import { getPlanByPriceId } from '@/lib/plans';

type METADATA = {
  userId?: string;
  priceId?: string;
  companyId?: string;
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

function toDate(seconds: number | null | undefined): Date | null {
  return seconds ? new Date(seconds * 1000) : null;
}

function customerIdOf(customer: string | { id: string } | null | undefined): string | null {
  if (!customer) return null;
  return typeof customer === 'string' ? customer : customer.id;
}

/** Mirror a Stripe subscription onto the company it belongs to. */
async function syncFromSubscription(
  subscription: Stripe.Subscription,
  options: { resetMinutes?: boolean } = {}
) {
  const metadata = (subscription.metadata ?? {}) as METADATA;
  const priceId = subscription.items.data[0]?.price?.id ?? null;
  const plan = getPlanByPriceId(priceId);

  const synced = await new SyncSubscription().sync({
    stripeCustomerId: customerIdOf(subscription.customer),
    fallbackCompanyId: metadata.companyId,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    plan: plan?.id ?? null,
    subscriptionStatus: subscription.status,
    trialEndsAt: toDate(subscription.trial_end),
    currentPeriodEnd: toDate(subscription.current_period_end),
    resetMinutes: options.resetMinutes,
  });

  if (!synced) {
    console.warn(
      `[stripe-webhook] no company matched subscription ${subscription.id} (customer ${customerIdOf(subscription.customer)})`
    );
  }
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const endpointSecret = process.env.STRIPE_SECRET_WEBHOOK_KEY!;
  const sig = headers().get('stripe-signature') as string;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err) {
    return new Response(`Webhook Error: ${err}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = (session.metadata ?? {}) as METADATA;

        // Persist the customer link first so every later event resolves by it.
        const companyId = await new CompanyRepository().findCompanyIdForStripe(
          customerIdOf(session.customer),
          metadata.companyId
        );

        if (session.subscription) {
          const subscriptionId =
            typeof session.subscription === 'string'
              ? session.subscription
              : session.subscription.id;
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await syncFromSubscription(subscription, { resetMinutes: true });
        }

        // Audit trail of the payment itself.
        if (companyId) {
          const transactionDetails: TransactionProps = {
            userId: metadata.userId,
            priceId: metadata.priceId,
            companyId,
          };
          if (session.amount_total) transactionDetails.amount = session.amount_total;
          if (session.currency) transactionDetails.currency = session.currency;
          if (session.created) transactionDetails.created = session.created;
          if (session.customer_details) {
            transactionDetails.customerDetails =
              session.customer_details as unknown as CustomerDetails;
          }
          await new RegisterTransaction().registerTransaction(transactionDetails);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.trial_will_end': {
        await syncFromSubscription(event.data.object as Stripe.Subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const metadata = (subscription.metadata ?? {}) as METADATA;
        await new SyncSubscription().sync({
          stripeCustomerId: customerIdOf(subscription.customer),
          fallbackCompanyId: metadata.companyId,
          subscriptionStatus: 'canceled',
          currentPeriodEnd: toDate(subscription.current_period_end),
        });
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId =
          typeof invoice.subscription === 'string'
            ? invoice.subscription
            : invoice.subscription?.id;
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          // A renewal starts a new metering period; the first invoice of a
          // subscription was already reset at checkout.
          await syncFromSubscription(subscription, {
            resetMinutes: invoice.billing_reason === 'subscription_cycle',
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await new SyncSubscription().sync({
          stripeCustomerId: customerIdOf(invoice.customer),
          subscriptionStatus: 'past_due',
        });
        break;
      }

      default:
        // Everything else is acknowledged, not retried. Returning a non-2xx
        // here would make Stripe redeliver unrelated events forever.
        break;
    }

    return new Response('ok', { status: 200 });
  } catch (error) {
    console.error(`[stripe-webhook] failed handling ${event.type}`, error);
    return new Response('Server error', { status: 500 });
  }
}
