import DashboardShell from "@/app/ui/dashboard/dashboard-shell"

export default function Layout({ children }: { children: React.ReactNode }) {
  return <DashboardShell showBreadcrumbs>{children}</DashboardShell>
}
