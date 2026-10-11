"use client"

/**
 * Admin main nav — flat list of links rendered into the shadcn
 * Sidebar primitive. Active state comes from usePathname() inside
 * SidebarMenuButton (via the asChild/render pattern).
 *
 * Why flat (not Collapsible with sub-items) — /admin/* is a small
 * surface (Overview / Users / Workspaces / Appeals / Audit / etc).
 * We don't need the depth that sidebar-07's PlayGround/Models nav
 * provides, and the always-visible list is faster to scan.
 */
import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import type { LucideIcon } from "lucide-react"

export type NavMainItem = {
  title: string
  href: string
  icon: LucideIcon
  /** Optional badge — number renders as a small pill, string verbatim. */
  badge?: number | string
  /** When true, mark as a destructive entry (rendered in destructive color). */
  destructive?: boolean
}

export function NavMain({ items }: { items: NavMainItem[] }) {
  const pathname = usePathname()

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="font-mono text-[10px] uppercase tracking-[0.04em]">
        Console
      </SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname === item.href || pathname.startsWith(`${item.href}/`)
          const Icon = item.icon
          return (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                render={<Link href={item.href} />}
                isActive={isActive}
                tooltip={item.title}
                className={
                  isActive
                    ? "bg-brand-ink text-brand-cream hover:bg-brand-ink-hover hover:text-brand-cream [&>svg]:text-brand-cream"
                    : item.destructive
                      ? "text-brand-accent hover:bg-brand-accent-tint hover:text-brand-accent"
                      : ""
                }
              >
                <Icon className="size-4" />
                <span>{item.title}</span>
                {item.badge !== undefined && (
                  <span
                    className={
                      "ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 font-mono text-[10px] " +
                      (isActive
                        ? "bg-brand-cream/20 text-brand-cream"
                        : "bg-brand-accent-tint text-brand-accent")
                    }
                  >
                    {item.badge}
                  </span>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
