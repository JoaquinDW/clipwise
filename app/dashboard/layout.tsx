import { redirect } from "next/navigation"
import DashboardShell from "@/app/ui/dashboard/dashboard-shell"
import { getSessionUserWithCompany } from "@/lib/auth/session"
import { getCompanyAccess } from "@/lib/billing/access"

export default async function Layout({ children }: { children: React.ReactNode }) {
  // Also repairs a missing company, which the signUp callback can fail to create.
  const user = await getSessionUserWithCompany()
  if (!user) redirect("/login")

  // Everything under /dashboard costs compute, so it needs a live subscription.
  // /billing and /account stay reachable so the user can fix that.
  const access = await getCompanyAccess(user.companyId, user.email)
  if (!access.hasSubscription) redirect("/billing?required=true")

  return <DashboardShell>{children}</DashboardShell>
}
