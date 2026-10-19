import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"

export function LoginSkeleton() {
  return (
    <>
      <header className="w-full bg-[#fbf8f3]">
        <div className="mx-auto flex max-w-[1440px] items-center gap-10 px-6 py-[22px] md:px-16">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-28 rounded-md" />
          </div>
          <div className="ml-auto flex items-center gap-6">
            <Skeleton className="hidden sm:block h-3 w-24 rounded-full" />
            <Skeleton className="h-4 w-28 rounded-md" />
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12 md:px-16">
        <div className="w-full max-w-[480px]">
          {/* Eyebrow */}
          <div className="mb-6 flex items-center gap-2.5">
            <Skeleton className="size-[7px] shrink-0 rounded-full bg-brand-accent/40" />
            <Skeleton className="h-3 w-32 rounded-full" />
            <Skeleton className="h-3 w-28 rounded-full" />
          </div>

          {/* Headline */}
          <Skeleton className="h-12 w-64 rounded-lg mb-2" />
          <Skeleton className="h-4 w-80 rounded-md mb-8" />

          {/* Card */}
          <Card className="border-brand-rule bg-[#fffefb] shadow-[0_10px_30px_rgba(58,46,30,0.06)]">
            <div className="p-7 space-y-5">
              {/* Google Button */}
              <Skeleton className="h-11 w-full rounded-full" />

              {/* Divider */}
              <div className="relative my-6 flex items-center justify-center">
                <div className="w-full border-t border-brand-rule" />
                <div className="absolute bg-[#fffefb] px-3">
                  <Skeleton className="h-3 w-6 rounded-sm" />
                </div>
              </div>

              {/* Email Label + Input */}
              <div className="space-y-2">
                <Skeleton className="h-3 w-20 rounded-sm" />
                <Skeleton className="h-11 w-full rounded-xl" />
              </div>

              {/* Submit Button */}
              <Skeleton className="h-11 w-full rounded-full mt-2" />

              {/* Password option */}
              <div className="pt-2 flex justify-center">
                <Skeleton className="h-3 w-40 rounded-sm" />
              </div>
            </div>
          </Card>

          {/* Footer note */}
          <div className="mt-8 flex items-center justify-center gap-4">
            <Skeleton className="h-3 w-36 rounded-sm" />
          </div>
        </div>
      </main>
    </>
  )
}
