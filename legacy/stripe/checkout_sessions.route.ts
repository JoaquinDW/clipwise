import Stripe from "stripe"
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prismaClientGlobal } from "@/infra/prisma"
import { isAllowedPriceId, TRIAL_DAYS } from "@/lib/plans"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string)

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return new NextResponse("Unauthorized", { status: 401 })

    const user = await prismaClientGlobal.user.findUnique({
      where: { id: userId },
      include: { company: true },
    })

    if (!user?.company) {
      return NextResponse.json(
        { ok: false, message: "User has no company" },
        { status: 400 },
      )
    }

    const data = await request.json()
    const priceId = data.priceId

    if (!priceId) {
      return NextResponse.json(
        { ok: false, message: "Missing priceId" },
        { status: 400 },
      )
    }

    // Never trust a price coming from the client: only our own plans are sellable.
    if (!isAllowedPriceId(priceId)) {
      console.error(
        `[checkout_sessions] priceId ${priceId} is not in the allowlist. ` +
          "Check NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID / NEXT_PUBLIC_STRIPE_PRO_PRICE_ID.",
      )
      return NextResponse.json(
        { ok: false, message: "That plan is not available right now." },
        { status: 400 },
      )
    }

    const company = user.company

    // Reuse the Stripe customer so the billing portal, invoices and payment
    // methods all stay on a single record instead of one per checkout.
    let customerId = company.stripeCustomerId

    // A stored id can be stale: the Stripe account or mode changed, or the
    // customer was deleted. Never trust it without checking, or checkout stays
    // permanently broken with "No such customer".
    if (customerId) {
      try {
        const existing = await stripe.customers.retrieve(customerId)
        if ((existing as Stripe.DeletedCustomer).deleted) customerId = null
      } catch (error) {
        if (
          error instanceof Stripe.errors.StripeError &&
          error.code === "resource_missing"
        ) {
          console.warn(
            `[checkout_sessions] stale stripeCustomerId ${customerId} on company ${company.id}; recreating`,
          )
          customerId = null
        } else {
          throw error
        }
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name ?? company.name,
        metadata: { userId: user.id, companyId: company.id },
      })
      customerId = customer.id
      await prismaClientGlobal.company.update({
        where: { id: company.id },
        data: { stripeCustomerId: customerId },
      })
    }

    // Only the first subscription gets a trial.
    const isFirstSubscription = !company.stripeSubscriptionId

    const checkoutSession: Stripe.Checkout.Session =
      await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        allow_promotion_codes: true,
        // Card is required up-front even during the trial.
        payment_method_collection: "always",
        client_reference_id: company.id,
        success_url: `${process.env.NEXT_BASE_URL}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_BASE_URL}/billing?canceled=true`,
        subscription_data: {
          ...(isFirstSubscription ? { trial_period_days: TRIAL_DAYS } : {}),
          // Metadata must live on the subscription too: later
          // customer.subscription.* and invoice.* events do not carry the
          // session metadata.
          metadata: { userId: user.id, companyId: company.id, priceId },
        },
        metadata: { userId: user.id, companyId: company.id, priceId },
      })

    return NextResponse.json({ result: checkoutSession, ok: true })
  } catch (error) {
    console.error("[checkout_sessions]", error)

    // Surface Stripe's own message. A misconfigured price ID (wrong account,
    // wrong mode) is the common failure here, and a bare 500 makes it invisible.
    const message =
      error instanceof Stripe.errors.StripeError
        ? error.message
        : "Could not start checkout."

    return NextResponse.json({ ok: false, message }, { status: 500 })
  }
}
