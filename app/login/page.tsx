"use client"

import { LoginForm } from "@/components/login-form"
import Link from "next/link"

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-brand-cream flex flex-col">
      {/* Top bar */}
      <header className="w-full bg-[#fbf8f3]">
        <div className="mx-auto flex max-w-[1440px] items-center gap-10 px-6 py-[22px] md:px-16">
          <Link href="/" className="flex items-center">
            <span className="font-serif text-[30px] font-medium leading-none tracking-[-0.015em] text-brand-ink">
              Muvx<span className="text-[#e8602b]">TMS</span>
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-6">
            <span className="hidden sm:block font-geist-mono text-[10px] font-medium tracking-[0.04em] text-brand-muted-soft">
              WELCOME BACK
            </span>
            <Link
              href="/signup"
              className="font-geist text-sm font-medium text-[#4a4e57] hover:text-brand-ink transition-colors"
            >
              Create account
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12 md:px-16">
        <LoginForm />
      </main>
    </div>
  )
}
