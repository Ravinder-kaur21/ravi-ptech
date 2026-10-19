import { Skeleton } from "@/components/ui/skeleton"

export default function FleetLoading() {
  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-44 rounded-lg" />
          <Skeleton className="mt-2 h-4 w-72 rounded-md" />
        </div>
        <div className="flex gap-2.5">
          <Skeleton className="h-10 w-28 rounded-full" />
          <Skeleton className="h-10 w-32 rounded-full" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-brand-rule pb-2">
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>

      {/* Equipment Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-brand-rule bg-brand-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-28 rounded-md" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-36 rounded-sm" />
              <Skeleton className="h-3.5 w-48 rounded-sm" />
            </div>
            <div className="pt-2 border-t border-brand-rule/60 flex items-center justify-between">
              <Skeleton className="h-4 w-20 rounded-sm" />
              <Skeleton className="h-8 w-16 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
