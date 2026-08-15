import { NextResponse } from "next/server"
import { PolarError } from "@polar-sh/sdk/models/errors/polarerror.js"
import { polar } from "@/infra/polar"
import { getSessionUserWithCompany } from "@/lib/auth/session"

/**
 * Opens the Polar customer portal so the user can change plan, update their
 * card, download invoices or cancel — without us building any of that UI.
 *
 * Keyed by our own company id (`externalCustomerId`), so there is no stored
 * provider customer id that can go stale.
 */
export async function POST() {
  try {
    const user = await getSessionUserWithCompany()
    if (!user) return new NextResponse("Unauthorized", { status: 401 })

    const session = await polar.customerSessions.create({
      externalCustomerId: user.companyId,
      returnUrl: `${process.env.NEXT_BASE_URL}/billing`,
    })

    return NextResponse.json({ ok: true, url: session.customerPortalUrl })
  } catch (error) {
    console.error("[payment/portal]", error)

    const message =
      error instanceof PolarError
        ? error.message
        : "Could not open the billing portal."

    return NextResponse.json({ ok: false, message }, { status: 500 })
  }
}
