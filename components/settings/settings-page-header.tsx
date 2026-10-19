"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Shared hero header for any /settings/* page.
 *
 * Layout:
 *   ← Back to Settings
 *   [Icon]  KICKER LABEL
 *   Big serif H1
 *   One-line description (max 80 chars)
 *   Optional right-side action area (buttons, badges, status)
 *
 * Single source of truth for the look of every Settings sub-page.
 */
export function SettingsPageHeader({
  kicker,
  title,
  description,
  icon: Icon,
  accent = "default",
  children,
}: {
  kicker: string
  title: string
  description: string
  icon: LucideIcon
  /** "default" = brand-ink + brand-accent. "primary" = full accent fill. */
  accent?: "default" | "primary"
  /** Right-aligned action area (badges, buttons). */
  children?: React.ReactNode
}) {
  return (
    <div className="mb-8">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-[12px] text-brand-muted-soft hover:text-brand-ink"
      >
        <ArrowLeft className="size-3.5" />
        Back to Settings
      </Link>
      <div className="mt-4 flex items-end justify-between gap-6 flex-wrap">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex size-12 items-center justify-center rounded-xl shrink-0",
              accent === "primary"
                ? "bg-brand-ink text-brand-cream"
                : "bg-brand-accent-tint text-brand-accent"
            )}
          >
            <Icon className="size-5" strokeWidth={1.6} />
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-brand-muted-soft">
              {kicker}
            </p>
            <h1 className="mt-1 font-serif text-[32px] leading-[1.05] tracking-tight text-brand-ink">
              {title}
            </h1>
            {description && (
              <p className="mt-2 text-[14px] text-brand-ink/80 max-w-2xl">
                {description}
              </p>
            )}
          </div>
        </div>
        {children && <div className="flex items-center gap-2">{children}</div>}
      </div>
    </div>
  )
}
