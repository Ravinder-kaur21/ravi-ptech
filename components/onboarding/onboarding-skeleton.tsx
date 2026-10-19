import { Skeleton } from "@/components/ui/skeleton"

export function OnboardingSkeleton() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden" style={{ background: "#f7f3ec" }}>
      {/* Background contour lines */}
      <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden="true">
        <svg viewBox="0 0 1600 900" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
          <path d="M1010 105C1120 180 1200 105 1310 160C1410 210 1510 135 1600 185" fill="none" stroke="#ead4c5" strokeWidth="1" />
          <path d="M0 710C180 665 320 742 490 700C640 663 760 730 900 684" fill="none" stroke="#ead4c5" strokeWidth="1" />
        </svg>
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[920px] flex-col px-6 py-12 md:px-16">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-28 rounded-md bg-[#e5dfd5]" />
          </div>
          <Skeleton className="h-3 w-24 rounded-full bg-[#e5dfd5]" />
        </div>

        {/* Progress bar */}
        <div className="mt-8 flex gap-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton
              key={i}
              className={`h-[3px] flex-1 rounded-full ${i === 0 ? "bg-[#d9622b]/50" : "bg-[#e5dfd5]"}`}
            />
          ))}
        </div>

        {/* Main content */}
        <div className="mt-10 flex-1">
          {/* Eyebrow */}
          <div className="mb-8 space-y-3">
            <div className="flex items-center gap-2.5">
              <Skeleton className="size-[7px] shrink-0 rounded-full bg-[#d9622b]/60" />
              <Skeleton className="h-3 w-28 rounded-full bg-[#e5dfd5]" />
              <Skeleton className="h-3 w-36 rounded-full bg-[#e5dfd5]" />
            </div>
            {/* Headline */}
            <Skeleton className="h-12 w-80 rounded-lg bg-[#e5dfd5]" />
            <Skeleton className="h-5 w-96 rounded-md bg-[#e5dfd5]/80" />
          </div>

          {/* Cards options skeleton */}
          <div className="grid gap-3.5 sm:grid-cols-3 pt-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-[#e5dfd5] bg-white/70 p-6 space-y-4 shadow-sm"
              >
                <Skeleton className="size-10 rounded-xl bg-[#e5dfd5]" />
                <Skeleton className="h-5 w-24 rounded-md bg-[#e5dfd5]" />
                <Skeleton className="h-3.5 w-full rounded-sm bg-[#e5dfd5]/70" />
                <Skeleton className="h-3.5 w-3/4 rounded-sm bg-[#e5dfd5]/70" />
              </div>
            ))}
          </div>

          {/* Form input fields preview */}
          <div className="mt-8 space-y-4 max-w-xl">
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-32 rounded-sm bg-[#e5dfd5]" />
              <Skeleton className="h-12 w-full rounded-xl bg-[#e5dfd5]/70" />
            </div>
          </div>
        </div>

        {/* Bottom actions bar */}
        <div className="mt-12 flex items-center justify-between border-t border-[#e5dfd5] pt-6">
          <Skeleton className="h-10 w-24 rounded-full bg-[#e5dfd5]" />
          <Skeleton className="h-11 w-36 rounded-full bg-[#16181d]/30" />
        </div>
      </div>
    </div>
  )
}
