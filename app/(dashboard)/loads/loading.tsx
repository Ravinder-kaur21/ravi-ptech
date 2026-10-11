import { Skeleton } from "@/components/ui/skeleton"

export default function LoadsLoading() {
  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="mt-2 h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-32 rounded-full" />
      </div>

      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-lg border border-brand-rule bg-brand-card px-5 py-3"
          >
            <Skeleton className="size-3.5 rounded-full" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 flex-1 max-w-[140px]" />
            <Skeleton className="h-4 flex-1 max-w-[180px]" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-12 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}
