// Loading animation
const shimmer =
  "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent"

export function StatCardSkeleton() {
  return (
    <div
      className={`${shimmer} relative overflow-hidden rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#15161a] p-5`}
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-[10px] bg-white/10" />
        <div className="h-4 w-24 rounded-md bg-white/10" />
      </div>
      <div className="mt-4 h-8 w-16 rounded-md bg-white/10" />
      <div className="mt-2 h-3 w-20 rounded-md bg-white/10" />
    </div>
  )
}

export function VideoCardSkeleton() {
  return (
    <div
      className={`${shimmer} relative overflow-hidden rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#15161a]`}
    >
      <div className="aspect-video bg-white/5" />
      <div className="p-4">
        <div className="h-5 w-3/4 rounded-md bg-white/10" />
        <div className="mt-3 flex items-center justify-between">
          <div className="h-3 w-12 rounded-md bg-white/10" />
          <div className="h-3 w-16 rounded-md bg-white/10" />
        </div>
      </div>
    </div>
  )
}

export default function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-2 md:py-2">
      {/* Header */}
      <div className={`${shimmer} relative mb-8 overflow-hidden`}>
        <div className="h-8 w-64 rounded-md bg-white/10" />
        <div className="mt-3 h-4 w-80 rounded-md bg-white/10" />
      </div>
      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
      {/* Recent videos */}
      <div className={`${shimmer} relative mb-4 h-6 w-36 overflow-hidden rounded-md bg-white/10`} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        <VideoCardSkeleton />
        <VideoCardSkeleton />
        <VideoCardSkeleton />
      </div>
    </div>
  )
}

export function TableRowSkeleton() {
  return (
    <tr className="w-full border-b border-white/8 last-of-type:border-none [&:first-child>td:first-child]:rounded-tl-lg [&:first-child>td:last-child]:rounded-tr-lg [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg">
      {/* Customer Name and Image */}
      <td className="relative overflow-hidden whitespace-nowrap py-3 pl-6 pr-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-white/10"></div>
          <div className="h-6 w-24 rounded bg-white/10"></div>
        </div>
      </td>
      {/* Email */}
      <td className="whitespace-nowrap px-3 py-3">
        <div className="h-6 w-32 rounded bg-white/10"></div>
      </td>
      {/* Amount */}
      <td className="whitespace-nowrap px-3 py-3">
        <div className="h-6 w-16 rounded bg-white/10"></div>
      </td>
      {/* Date */}
      <td className="whitespace-nowrap px-3 py-3">
        <div className="h-6 w-16 rounded bg-white/10"></div>
      </td>
      {/* Status */}
      <td className="whitespace-nowrap px-3 py-3">
        <div className="h-6 w-16 rounded bg-white/10"></div>
      </td>
      {/* Actions */}
      <td className="whitespace-nowrap py-3 pl-6 pr-3">
        <div className="flex justify-end gap-3">
          <div className="h-[38px] w-[38px] rounded bg-white/10"></div>
          <div className="h-[38px] w-[38px] rounded bg-white/10"></div>
        </div>
      </td>
    </tr>
  )
}

export function InvoicesMobileSkeleton() {
  return (
    <div className="mb-2 w-full rounded-md border border-[rgba(255,255,255,0.08)] bg-[#15161a] p-4">
      <div className="flex items-center justify-between border-b border-white/8 pb-8">
        <div className="flex items-center">
          <div className="mr-2 h-8 w-8 rounded-full bg-white/10"></div>
          <div className="h-6 w-16 rounded bg-white/10"></div>
        </div>
        <div className="h-6 w-16 rounded bg-white/10"></div>
      </div>
      <div className="flex w-full items-center justify-between pt-4">
        <div>
          <div className="h-6 w-16 rounded bg-white/10"></div>
          <div className="mt-2 h-6 w-24 rounded bg-white/10"></div>
        </div>
        <div className="flex justify-end gap-2">
          <div className="h-10 w-10 rounded bg-white/10"></div>
          <div className="h-10 w-10 rounded bg-white/10"></div>
        </div>
      </div>
    </div>
  )
}

export function InvoicesTableSkeleton() {
  return (
    <div className="mt-6 flow-root">
      <div className="inline-block min-w-full align-middle">
        <div className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#111215] p-2 md:pt-0">
          <div className="md:hidden">
            <InvoicesMobileSkeleton />
            <InvoicesMobileSkeleton />
            <InvoicesMobileSkeleton />
            <InvoicesMobileSkeleton />
            <InvoicesMobileSkeleton />
            <InvoicesMobileSkeleton />
          </div>
          <table className="hidden min-w-full text-[var(--dash-text)] md:table">
            <thead className="rounded-lg text-left text-sm font-normal">
              <tr>
                <th scope="col" className="px-4 py-5 font-medium sm:pl-6">
                  Customer
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Email
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Amount
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Date
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Status
                </th>
                <th
                  scope="col"
                  className="relative pb-4 pl-3 pr-6 pt-2 sm:pr-6"
                >
                  <span className="sr-only">Edit</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-[#0e0f11]">
              <TableRowSkeleton />
              <TableRowSkeleton />
              <TableRowSkeleton />
              <TableRowSkeleton />
              <TableRowSkeleton />
              <TableRowSkeleton />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
