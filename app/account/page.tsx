import { auth } from "@/auth"
import Link from "next/link"

export default async function Page() {
  const user = await auth()
  const name = user?.user?.name
  const email = user?.user?.email

  return (
    <main className="max-w-4xl space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.24em] text-[var(--dash-text-muted)]">
          Account
        </p>
        <h1
          className="mt-3 text-3xl font-bold"
          style={{ fontFamily: "var(--font-syne), sans-serif" }}
        >
          Profile & access
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--dash-text-muted)]">
          Review the signed-in user and jump back to the product shell when you
          need to keep working.
        </p>
      </div>

      <section className="dash-card p-6 space-y-4">
        <div className="space-y-1">
          <div className="text-sm text-[var(--dash-text-muted)]">
            Signed in as
          </div>
          <div className="text-lg font-semibold text-[var(--dash-text)]">
            {name ?? email ?? "Unknown user"}
          </div>
          {email && (
            <div className="text-sm text-[var(--dash-text-secondary)]">
              {email}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="dash-btn-gradient px-4 py-2 text-sm"
          >
            Go to Dashboard
          </Link>
          <Link href="/billing" className="dash-btn-ghost px-4 py-2 text-sm">
            Open Billing
          </Link>
        </div>
      </section>
    </main>
  )
}
