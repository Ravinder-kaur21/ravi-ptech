import { Skeleton } from "@/components/ui/skeleton"

export default function InvoicesLoading() {
  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-40 rounded-lg" />
          <Skeleton className="mt-2 h-4 w-64 rounded-md" />
        </div>
        <Skeleton className="h-10 w-36 rounded-full" />
      </div>

      {/* KPI stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-brand-rule bg-brand-card p-5 space-y-3">
            <Skeleton className="h-3 w-20 rounded-full" />
            <Skeleton className="h-7 w-28 rounded-md" />
            <Skeleton className="h-3 w-32 rounded-sm" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl border border-brand-rule bg-brand-card p-6 space-y-4">
        <div className="flex items-center justify-between pb-2">
          <Skeleton className="h-9 w-64 rounded-lg" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-24 rounded-md" />
          </div>
        </div>

        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-lg border border-brand-rule/60 bg-[#fffefb]">
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="h-4 flex-1 max-w-[160px] rounded-md" />
              <Skeleton className="h-4 flex-1 max-w-[140px] rounded-md" />
              <Skeleton className="h-4 w-20 rounded-md" />
              <Skeleton className="h-5 w-24 rounded-full ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
