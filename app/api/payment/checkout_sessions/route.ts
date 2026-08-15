import { NextRequest, NextResponse } from "next/server"
import { PolarError } from "@polar-sh/sdk/models/errors/polarerror.js"
import { polar } from "@/infra/polar"
import { prismaClientGlobal } from "@/infra/prisma"
import { getSessionUserWithCompany } from "@/lib/auth/session"
import { getPlanByProductId, isAllowedProductId, TRIAL_DAYS } from "@/lib/plans"

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUserWithCompany()
    if (!user) return new NextResponse("Unauthorized", { status: 401 })

    const company = await prismaClientGlobal.company.findUnique({
      where: { id: user.companyId },
      select: { id: true, name: true, billingSubscriptionId: true },
    })
    if (!company) {
      return NextResponse.json(
        { ok: false, message: "User has no company" },
        { status: 400 },
      )
    }

    const { productId } = await request.json()

    if (!productId) {
      return NextResponse.json(
        { ok: false, message: "Missing productId" },
        { status: 400 },
      )
    }

    // Never trust a product coming from the client: only our own plans are sellable.
    if (!isAllowedProductId(productId)) {
      console.error(
        `[checkout] productId ${productId} is not in the allowlist. ` +
          "Check NEXT_PUBLIC_POLAR_STARTER_PRODUCT_ID / NEXT_PUBLIC_POLAR_PRO_PRODUCT_ID.",
      )
      return NextResponse.json(
        { ok: false, message: "That plan is not available right now." },
        { status: 400 },
      )
    }

    const plan = getPlanByProductId(productId)

    // Only the first subscription gets a trial.
    const isFirstSubscription = !company.billingSubscriptionId

    const checkout = await polar.checkouts.create({
      products: [productId],
      // Polar keys the customer off our own id, so there is no foreign customer
      // id to store, revalidate, or go stale when the account changes.
      externalCustomerId: company.id,
      customerEmail: user.email,
      customerName: user.name ?? company.name,
      successUrl: `${process.env.NEXT_BASE_URL}/billing?success=true&checkout_id={CHECKOUT_ID}`,
      allowDiscountCodes: true,
      allowTrial: isFirstSubscription,
      ...(isFirstSubscription
        ? { trialInterval: "day" as const, trialIntervalCount: TRIAL_DAYS }
        : {}),
      metadata: {
        companyId: company.id,
        userId: user.id,
        plan: plan?.id ?? "",
      },
    })

    // Same response shape the subscribe button already consumes.
    return NextResponse.json({ ok: true, result: { url: checkout.url, id: checkout.id } })
  } catch (error) {
    console.error("[checkout]", error)

    // Surface Polar's own message. A misconfigured product ID (wrong
    // organization, sandbox vs production) is the common failure here, and a
    // bare 500 makes it invisible.
    const message =
      error instanceof PolarError ? error.message : "Could not start checkout."

    return NextResponse.json({ ok: false, message }, { status: 500 })
  }
}
