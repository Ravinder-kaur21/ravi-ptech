import { Skeleton } from "@/components/ui/skeleton"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"

export default function DashboardLoading() {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "260px",
          "--sidebar-width-icon": "60px",
          "--header-height": "calc(var(--spacing) * 14)",
        } as React.CSSProperties
      }
    >
      <Sidebar collapsible="icon" className="border-r border-sidebar-border">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-2">
            <Skeleton className="size-8 rounded-md" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-2.5 w-24" />
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <div className="space-y-1 px-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 rounded-md px-2 py-2">
                <Skeleton className="size-4" />
                <Skeleton className="h-3.5 flex-1" />
              </div>
            ))}
          </div>
        </SidebarContent>
        <SidebarFooter>
          <div className="space-y-1.5 px-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-background">
        {/* Header skeleton */}
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-brand-rule bg-brand-card px-4 lg:px-6">
          <Skeleton className="size-7 rounded-md" />
          <Skeleton className="h-4 w-24" />
          <div className="ml-auto flex items-center gap-2">
            <Skeleton className="h-9 w-44 rounded-md" />
            <Skeleton className="size-9 rounded-full" />
            <Skeleton className="size-9 rounded-full" />
          </div>
        </div>
        {/* Page content skeleton */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
            <div>
              <Skeleton className="h-8 w-72" />
              <Skeleton className="mt-2 h-4 w-96" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-lg" />
              ))}
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
              <Skeleton className="lg:col-span-2 h-96 rounded-lg" />
              <div className="space-y-4">
                <Skeleton className="h-48 rounded-lg" />
                <Skeleton className="h-48 rounded-lg" />
              </div>
            </div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
