import DashboardShell from "@/app/ui/dashboard/dashboard-shell"

export default function Loading() {
  return (
    <DashboardShell showBreadcrumbs>
      <main className="max-w-4xl space-y-6">
        <div className="space-y-3">
          <div className="h-8 w-40 rounded-full bg-white/10" />
          <div className="h-5 w-72 rounded-full bg-white/10" />
        </div>
        <div className="dash-card space-y-4 p-6">
          <div className="h-5 w-48 rounded-full bg-white/10" />
          <div className="h-4 w-full rounded-full bg-white/10" />
          <div className="h-4 w-5/6 rounded-full bg-white/10" />
          <div className="h-10 w-40 rounded-lg bg-white/10" />
        </div>
      </main>
    </DashboardShell>
  )
}
