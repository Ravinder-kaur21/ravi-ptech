import { Skeleton } from "@/components/ui/skeleton"

export default function SettingsLoading() {
  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-5xl mx-auto">
      <div>
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="mt-2 h-4 w-72 rounded-md" />
      </div>

      {/* Settings tabs */}
      <div className="flex gap-2 border-b border-brand-rule pb-2">
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="h-8 w-28 rounded-lg" />
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="h-8 w-32 rounded-lg" />
      </div>

      <div className="rounded-xl border border-brand-rule bg-brand-card p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-5 w-40 rounded-md" />
          <Skeleton className="h-4 w-80 rounded-sm" />
        </div>

        <div className="space-y-4 max-w-xl">
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-24 rounded-sm" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-32 rounded-sm" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-28 rounded-sm" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        </div>

        <div className="pt-4 border-t border-brand-rule">
          <Skeleton className="h-10 w-32 rounded-full" />
        </div>
      </div>
    </div>
  )
}
