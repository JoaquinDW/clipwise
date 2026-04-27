import SideNav from "@/app/ui/dashboard/sidenav"
import Breadcrumbs from "@/app/ui/breadcrumbs"
import { Syne, DM_Sans } from "next/font/google"

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  weight: ["400", "700", "800"],
  display: "swap",
})

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["300", "400", "500"],
  display: "swap",
})

type DashboardShellProps = {
  children: React.ReactNode
  showBreadcrumbs?: boolean
}

export default function DashboardShell({
  children,
  showBreadcrumbs = false,
}: DashboardShellProps) {
  return (
    <div
      className={`${syne.variable} ${dmSans.variable} flex h-screen flex-col md:flex-row md:overflow-hidden`}
      style={{
        background:
          "radial-gradient(circle at top, rgba(255, 59, 92, 0.08), transparent 28%), linear-gradient(180deg, #101114 0%, #090a0c 100%)",
        color: "var(--dash-text)",
        fontFamily: "var(--font-dm-sans), sans-serif",
      }}
    >
      <div className="w-full flex-none md:w-64">
        <SideNav />
      </div>
      <div className="flex-grow md:overflow-y-auto md:p-6">
        {showBreadcrumbs && <Breadcrumbs />}
        <div className="animate-fadeIn">{children}</div>
      </div>
    </div>
  )
}
