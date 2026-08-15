import Stripe from "stripe"
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prismaClientGlobal } from "@/infra/prisma"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string)

/**
 * Opens the Stripe billing portal so the user can change plan, update their
 * card or cancel without us building any of that UI.
 */
export async function POST() {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return new NextResponse("Unauthorized", { status: 401 })

    const user = await prismaClientGlobal.user.findUnique({
      where: { id: userId },
      include: { company: true },
    })

    const customerId = user?.company?.stripeCustomerId
    if (!customerId) {
      return NextResponse.json(
        { ok: false, message: "No billing account yet" },
        { status: 400 },
      )
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_BASE_URL}/billing`,
    })

    return NextResponse.json({ ok: true, url: portalSession.url })
  } catch (error) {
    console.error("[payment/portal]", error)

    const message =
      error instanceof Stripe.errors.StripeError
        ? error.message
        : "Could not open the billing portal."

    return NextResponse.json({ ok: false, message }, { status: 500 })
  }
}
