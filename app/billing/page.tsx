import { auth } from "@/auth"
import SubscribeComponent from "../ui/stripe"
import Popup from "../ui/popup"
import Link from "next/link"

export default async function Page({
  searchParams,
}: {
  searchParams: { [key: string]: string }
}) {
  const user = await auth()
  const success = searchParams["success"]
  const canceled = searchParams["canceled"]
  const stripePriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID?.trim()
  const stripePortalUrl = process.env.NEXT_PUBLIC_STRIPE_PORTAL_URL?.trim()

  const redCross = (
    <svg
      className="w-3 h-3 fill-current text-red-500 mr-2 shrink-0"
      viewBox="0 0 12 12"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M11.414 1.414a1 1 0 00-1.414 0L6 5.414 2.414 1.828a1 1 0 00-1.414 1.414L4.586 6.828 1 10.414a1 1 0 001.414 1.414L6 8.242l3.586 3.586a1 1 0 001.414-1.414L7.414 6.828l3.586-3.586a1 1 0 000-1.414z" />
    </svg>
  )
  const greenCheck = (
    <svg
      className="w-3 h-3 fill-current text-green-500 mr-2 shrink-0"
      viewBox="0 0 12 12"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M10.28 2.28L3.989 8.575 1.695 6.28A1 1 0 00.28 7.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 2.28z" />
    </svg>
  )

  return (
    <main className="max-w-5xl space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.24em] text-[var(--dash-text-muted)]">
          Billing
        </p>
        <h1
          className="mt-3 text-3xl font-bold"
          style={{ fontFamily: "var(--font-syne), sans-serif" }}
        >
          Plans & subscriptions
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--dash-text-muted)]">
          Manage your plan, review payment status, and open support without
          leaving the product shell.
        </p>
      </div>

      <Popup
        btnCloseText="Close"
        btnText="Need help?"
        title="Billing Support"
        msg="If you have any question about your billing, please contact us at contact@example.com"
        className=""
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="dash-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-[var(--dash-text)]">
            Subscription Status
          </h2>
          {success === "true" && (
            <div className="rounded-lg border border-green-900/50 bg-green-950/30 px-4 py-3 text-sm text-green-300">
              Thank you {user?.user?.name} for your payment.
            </div>
          )}
          {canceled === "true" && (
            <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
              Sorry {user?.user?.name}, your payment was refused.
            </div>
          )}
          <div className="space-y-2 text-sm text-[var(--dash-text-secondary)]">
            <div className="flex items-center">
              {greenCheck} You are using the Basic version
            </div>
            <div className="flex items-center">
              {redCross} A Pro version adds many additional features and
              capabilities
            </div>
          </div>
        </div>

        <div className="dash-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-[var(--dash-text)]">
            Upgrade Plan
          </h2>
          <p className="text-sm text-[var(--dash-text-secondary)]">
            Subscribe or contact us to learn more.
          </p>
          {stripePriceId ? (
            <SubscribeComponent
              priceId={stripePriceId}
              price="10"
              description="Basic Plan"
            />
          ) : (
            <div className="rounded-lg border border-amber-900/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">
              Set NEXT_PUBLIC_STRIPE_PRICE_ID to enable checkout.
            </div>
          )}
        </div>
      </section>

      <section className="dash-card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-[var(--dash-text)]">
          Customer Portal
        </h2>
        <p className="text-sm text-[var(--dash-text-secondary)]">
          For users with an active subscription, open the Stripe portal to
          manage payment methods or cancel the plan.
        </p>
        {stripePortalUrl ? (
          <Link
            className="dash-btn-gradient px-4 py-2 text-sm w-fit"
            href={stripePortalUrl}
            target="_blank"
          >
            Manage monthly plan
          </Link>
        ) : (
          <p className="text-sm text-[var(--dash-text-secondary)]">
            Set NEXT_PUBLIC_STRIPE_PORTAL_URL to enable the customer portal.
          </p>
        )}
      </section>
    </main>
  )
}
