import { redirect } from "next/navigation"
import SubscribeComponent from "../ui/stripe"
import ManageBillingButton from "../ui/manage-billing-button"
import Popup from "../ui/popup"
import { getSessionUserWithCompany } from "@/lib/auth/session"
import { getCompanyAccess } from "@/lib/billing/access"
import { ALL_PLANS, SUPPORT_EMAIL, TRIAL_DAYS } from "@/lib/plans"

const STATUS_LABELS: Record<string, string> = {
  trialing: "Free trial",
  active: "Active",
  past_due: "Payment failed",
  canceled: "Canceled",
  incomplete: "Incomplete",
}

function daysUntil(date: Date | null): number | null {
  if (!date) return null
  const diff = date.getTime() - Date.now()
  if (diff <= 0) return 0
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function formatDate(date: Date | null): string {
  if (!date) return "—"
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

export default async function Page({
  searchParams,
}: {
  searchParams: { [key: string]: string }
}) {
  const user = await getSessionUserWithCompany()
  if (!user) redirect("/login")

  const access = await getCompanyAccess(user.companyId, user.email)

  const success = searchParams["success"] === "true"
  const canceled = searchParams["canceled"] === "true"
  const required = searchParams["required"] === "true"
  const highlightedPlan = searchParams["plan"]

  const trialDaysLeft = access.status === "trialing" ? daysUntil(access.trialEndsAt) : null
  const usagePercent =
    access.minutesLimit > 0
      ? Math.min(100, Math.round((access.minutesUsed / access.minutesLimit) * 100))
      : 0

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
          Plans &amp; subscriptions
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--dash-text-muted)]">
          Manage your plan, track how many video minutes you have left, and update
          your payment details.
        </p>
      </div>

      {required && !access.hasSubscription && (
        <div className="rounded-lg border border-amber-900/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">
          Pick a plan to start your {TRIAL_DAYS}-day free trial and unlock the dashboard.
          We will not charge you until the trial ends.
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-green-900/50 bg-green-950/30 px-4 py-3 text-sm text-green-300">
          You are all set{user.name ? `, ${user.name}` : ""}. Your subscription is active.
        </div>
      )}
      {canceled && (
        <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          Checkout was canceled — nothing was charged.
        </div>
      )}
      {access.status === "past_due" && (
        <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          Your last payment failed. Update your card to keep processing videos.
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="dash-card space-y-4 p-6">
          <h2 className="text-lg font-semibold text-[var(--dash-text)]">
            Current subscription
          </h2>

          {access.bypassed ? (
            <p className="text-sm text-[var(--dash-text-secondary)]">
              Billing checks are bypassed for this account.
            </p>
          ) : access.hasSubscription ? (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-[var(--dash-text-muted)]">Plan</dt>
                <dd className="font-medium text-[var(--dash-text)]">
                  {access.planName ?? "—"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--dash-text-muted)]">Status</dt>
                <dd className="font-medium text-[var(--dash-text)]">
                  {STATUS_LABELS[access.status ?? ""] ?? access.status}
                </dd>
              </div>
              {trialDaysLeft !== null && (
                <div className="flex justify-between">
                  <dt className="text-[var(--dash-text-muted)]">Trial ends in</dt>
                  <dd className="font-medium text-[var(--dash-text)]">
                    {trialDaysLeft} {trialDaysLeft === 1 ? "day" : "days"}
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-[var(--dash-text-muted)]">
                  {access.status === "canceled" ? "Access until" : "Renews on"}
                </dt>
                <dd className="font-medium text-[var(--dash-text)]">
                  {formatDate(access.currentPeriodEnd)}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-[var(--dash-text-secondary)]">
              You do not have an active subscription. Choose a plan to start your{" "}
              {TRIAL_DAYS}-day free trial.
            </p>
          )}

          {access.hasSubscription && !access.bypassed && (
            <ManageBillingButton />
          )}
        </div>

        <div className="dash-card space-y-4 p-6">
          <h2 className="text-lg font-semibold text-[var(--dash-text)]">Usage</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--dash-text-muted)]">Video minutes</span>
              <span className="font-medium text-[var(--dash-text)]">
                {access.minutesUsed.toFixed(1)} / {access.minutesLimit}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${usagePercent}%`,
                  background:
                    usagePercent >= 90
                      ? "#ef4444"
                      : "linear-gradient(135deg,#FF3B5C,#FF8C00)",
                }}
              />
            </div>
            <p className="text-sm text-[var(--dash-text-muted)]">
              {access.minutesRemaining.toFixed(1)} minutes remaining
              {access.status === "trialing" ? " in your trial" : " this period"}.
            </p>
          </div>
          <p className="text-xs text-[var(--dash-text-muted)]">
            Minutes reset at the start of each billing period. Unused minutes do not
            roll over.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[var(--dash-text)]">
          {access.hasSubscription ? "Change plan" : "Choose a plan"}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {ALL_PLANS.map(plan => {
            const isCurrent = access.planId === plan.id
            const isHighlighted = highlightedPlan === plan.id

            return (
              <div
                key={plan.id}
                className={`space-y-3 rounded-xl border p-4 ${
                  isCurrent || isHighlighted
                    ? "border-[#FF3B5C]/50 bg-[#FF3B5C]/5"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <div>
                  <h3 className="text-base font-semibold text-[var(--dash-text)]">
                    {plan.name}
                    {isCurrent && (
                      <span className="ml-2 rounded-full bg-[#FF3B5C]/20 px-2 py-0.5 text-xs font-medium text-[#FF3B5C]">
                        Current
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-[var(--dash-text-secondary)]">
                    {plan.minutesPerMonth} min/month · up to {plan.maxClipsPerVideo} clips
                    per video
                  </p>
                </div>
                <p className="text-2xl font-bold text-[var(--dash-text)]">
                  ${plan.priceMonthly}
                  <span className="text-sm font-normal text-[var(--dash-text-muted)]">
                    /mo
                  </span>
                </p>

                {!plan.stripePriceId ? (
                  <div className="rounded-lg border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-200">
                    Set the Stripe price ID for {plan.name} to enable checkout.
                  </div>
                ) : isCurrent ? (
                  <ManageBillingButton label="Change or cancel" />
                ) : (
                  <SubscribeComponent
                    priceId={plan.stripePriceId}
                    buttonLabel={
                      access.hasSubscription
                        ? `Switch to ${plan.name}`
                        : `Start ${TRIAL_DAYS}-day trial`
                    }
                  />
                )}
              </div>
            )
          })}
        </div>
      </section>

      <Popup
        btnCloseText="Close"
        btnText="Need help?"
        title="Billing Support"
        msg={`If you have any question about your billing, please contact us at ${SUPPORT_EMAIL}`}
        className=""
      />
    </main>
  )
}
