# Stripe integration (archived)

Working Stripe implementation, retired on 2026-08-15 in favour of **Polar**.

## Why it was retired

It was never the code that failed — it was the geography. Stripe supports direct
payouts in 46 countries and **Argentina is not one of them**. The account we had
(`acct_1R8OBaCesy88DXOF`) was registered as `country: US`, so activating it would
have required a US entity or US person: EIN or SSN/ITIN, a US address and a US
bank account. In practice that meant incorporating a Delaware LLC through Stripe
Atlas (~US$500 plus annual upkeep and US tax filings) before earning the first
dollar.

Polar is a merchant of record: it is the legal seller, handles VAT/sales tax, and
pays out through Stripe Connect Express, which does cover Argentina.

## When to bring this back

If Stripe adds support for your country — check <https://stripe.com/global> — this
becomes cheaper: 2.9% + 30¢ versus Polar's 5% + 50¢ (plus 1.5% on non-US cards).
On a $15/mo subscription that is roughly $0.74 versus $1.48 per charge.

## What is here

| File | Original path |
|---|---|
| `checkout_sessions.route.ts` | `app/api/payment/checkout_sessions/route.ts` |
| `webhook.route.ts` | `app/api/payment/webhook/route.ts` |
| `portal.route.ts` | `app/api/payment/portal/route.ts` |
| `infra-stripe.ts` | `infra/stripe.ts` (client-side `loadStripe` wrapper — was already unused) |
| `SubscribeComponent.tsx` | `app/ui/stripe.tsx` (now `app/ui/subscribe-button.tsx`, provider-agnostic) |

These files are excluded from the build via `exclude` in `tsconfig.json` and via
`.eslintignore`, so they will not typecheck against the current schema. That is
expected — they are a reference, not live code.

## Environment variables it used

```bash
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_...
STRIPE_SECRET_KEY=sk_...
STRIPE_SECRET_WEBHOOK_KEY=whsec_...
NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID=price_...   # Starter, $15/mo
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=price_...       # Pro, $29/mo
NEXT_BASE_URL=https://momentreel.app            # still used by Polar
```

## How to reactivate

1. `pnpm add stripe @stripe/stripe-js`
2. Move the three route files back to their original paths and delete the Polar
   ones. `infra-stripe.ts` can stay archived — nothing imported it.
3. Rename the billing fields back in the code. The `Company` columns are now
   provider-neutral, so **no database migration is needed**:

   | Column | Holds for Stripe |
   |---|---|
   | `billingProvider` | `'stripe'` |
   | `billingCustomerId` | `cus_…` |
   | `billingSubscriptionId` | `sub_…` |
   | `billingProductId` | `price_…` |

   `plan`, `subscriptionStatus`, `trialEndsAt` and `currentPeriodEnd` are already
   shared: Polar and Stripe use the same status vocabulary (`trialing`, `active`,
   `past_due`, `canceled`, `incomplete`, `unpaid`).
4. In `lib/plans.ts`, point `polarProductId` back at the Stripe price env vars
   (or rename the field).
5. Recreate the products/prices in Stripe and register a webhook at
   `/api/payment/webhook` for `checkout.session.*`, `customer.subscription.*`,
   `invoice.paid` and `invoice.payment_failed`.

Everything else — `lib/billing/access.ts`, `lib/billing/guard.ts`,
`lib/billing/metering.ts`, the dashboard gate and the `/billing` UI — is
provider-agnostic and needs no changes in either direction.

## Two bugs worth not reintroducing

- **Opaque errors.** The routes originally returned a bare `500` with no body, so
  a misconfigured price ID surfaced in the UI as a button that did nothing. Both
  routes now return Stripe's own message. Keep that.
- **Stale customer.** The checkout route persisted `stripeCustomerId` *before*
  the session was created, so a later failure left the company pointing at a
  customer that did not exist, permanently breaking checkout with
  `No such customer`. The fix was to verify the stored customer and recreate it on
  `resource_missing`. The Polar version sidesteps this entirely by using
  `externalCustomerId = company.id` instead of storing a foreign id.
