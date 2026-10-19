import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <Skeleton className="h-8 w-64 rounded-lg" />
        <Skeleton className="mt-2 h-4 w-96 rounded-md" />
      </div>

      {/* KPI metrics row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-5 rounded-xl border border-brand-rule bg-brand-card space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-20 rounded-full" />
              <Skeleton className="size-4 rounded-full" />
            </div>
            <Skeleton className="h-7 w-28 rounded-md" />
            <Skeleton className="h-3 w-36 rounded-sm" />
          </div>
        ))}
      </div>

      {/* Content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-brand-rule bg-brand-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-36 rounded-md" />
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
          <div className="space-y-2.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-lg border border-brand-rule/60 bg-[#fffefb]">
                <Skeleton className="size-3 rounded-full" />
                <Skeleton className="h-4 w-20 rounded-md" />
                <Skeleton className="h-4 flex-1 rounded-md" />
                <Skeleton className="h-4 w-16 rounded-md" />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-brand-rule bg-brand-card p-6 space-y-3">
            <Skeleton className="h-5 w-32 rounded-md" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
          <div className="rounded-xl border border-brand-rule bg-brand-card p-6 space-y-3">
            <Skeleton className="h-5 w-28 rounded-md" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  )
}
