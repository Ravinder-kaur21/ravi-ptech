import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { TooltipProvider } from "@/components/ui/tooltip"
import { QueryProvider } from "@/lib/providers/query-provider"
import { Toaster } from "@/components/ui/sonner"
import { SoundProvider } from "@/components/providers/sound-provider"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Muvx - Transportation Management System",
  description: "Multi-tenant transportation management system for trucking companies",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <QueryProvider>
          <TooltipProvider>
            <SoundProvider>{children}</SoundProvider>
          </TooltipProvider>
          <Toaster position="top-center" richColors />
        </QueryProvider>
      </body>
    </html>
  )
}
