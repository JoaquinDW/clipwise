import NavLinks from "@/app/ui/dashboard/nav-links"
import FeedbackDialog from "@/app/ui/dashboard/feedback-dialog"
import UserAvatar from "@/app/ui/dashboard/user-avatar"
import { ArrowRightStartOnRectangleIcon } from "@heroicons/react/24/outline"
import { signOut, auth } from "@/auth"
import Link from "next/link"
import Image from "next/image"
import Logo from "@/app/(landing-page)/public/images/logo-horizontal.png"

export default async function SideNav() {
  const session = await auth()
  const name = session?.user?.name || session?.user?.email
  const email = session?.user?.email
  const image = session?.user?.image
  const initial = (name || "?").charAt(0).toUpperCase()

  return (
    <div
      className="flex h-full flex-col px-3 py-4 md:px-2 border-r"
      style={{ background: '#0d0d0d', borderColor: '#1a1a1a' }}
    >
      <Link
        href="/dashboard"
        aria-label="Momentreel"
        className="mb-6 flex items-center gap-2 px-2 py-2"
      >
        <Image
          src={Logo}
          alt="Momentreel"
          width={1288}
          height={220}
          priority
          className="h-7 w-auto"
        />
      </Link>

      <div className="flex grow flex-row justify-between space-x-2 md:flex-col md:space-x-0 md:space-y-1">
        <NavLinks />
        <div className="hidden h-auto w-full grow md:block" />

        <FeedbackDialog />

        {!!session && (
          <div
            className="hidden items-center gap-3 rounded-lg border p-2 md:flex"
            style={{ borderColor: '#1a1a1a', background: 'rgba(255,255,255,0.02)' }}
          >
            <UserAvatar image={image} initial={initial} name={name} />
            <div className="min-w-0 flex-grow">
              <p className="dash-text-primary truncate text-sm font-medium">{name}</p>
              {email && name !== email && (
                <p className="dash-text-muted truncate text-xs">{email}</p>
              )}
            </div>
            <form
              action={async () => {
                "use server"
                await signOut()
              }}
            >
              <button
                className="dash-nav-footer-btn !h-8 !w-8 justify-center !p-0"
                aria-label="Sign Out"
                title="Sign Out"
              >
                <ArrowRightStartOnRectangleIcon className="w-5 flex-none" aria-hidden="true" />
              </button>
            </form>
          </div>
        )}

        {/* Mobile sign-out (user chip hidden below md) */}
        {!!session && (
          <form
            className="md:hidden"
            action={async () => {
              "use server"
              await signOut()
            }}
          >
            <button className="dash-nav-footer-btn" aria-label="Sign Out">
              <ArrowRightStartOnRectangleIcon className="w-5 flex-none" aria-hidden="true" />
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
