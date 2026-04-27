import NavLinks from "@/app/ui/dashboard/nav-links"
import { PlusIcon, PowerIcon } from "@heroicons/react/24/outline"
import { signOut, auth } from "@/auth"
import Link from "next/link"

export default async function SideNav() {
  const user = await auth()
  const name = user?.user?.name || user?.user?.email
  return (
    <div
      className="flex h-full flex-col px-3 py-4 md:px-2 border-r"
      style={{ background: '#0d0d0d', borderColor: '#1a1a1a' }}
    >
      <Link href="/dashboard" className="mb-6 flex items-center gap-2 px-2 py-2">
        <span
          className="grad-text"
          style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 22, fontWeight: 800, letterSpacing: '-0.01em' }}
        >
          Clipwise
        </span>
      </Link>

      <div className="flex grow flex-row justify-between space-x-2 md:flex-col md:space-x-0 md:space-y-1">
        <NavLinks />
        <div className="hidden h-auto w-full grow md:block" />

        <Link
          href="mailto:contact@example.com"
          className="dash-nav-footer-btn"
        >
          <PlusIcon className="w-5 flex-none" aria-hidden="true" />
          <span className="hidden md:block">Feedback</span>
        </Link>

        <form
          action={async () => {
            "use server"
            await signOut()
          }}
        >
          {!!user && (
            <button
              className="dash-nav-footer-btn"
              aria-label="Sign Out"
              title={name ?? undefined}
            >
              <PowerIcon className="w-5 flex-none" aria-hidden="true" />
              <span className="hidden md:block" aria-hidden="true">Sign Out</span>
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
