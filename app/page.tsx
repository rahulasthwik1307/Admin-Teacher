"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { useMounted } from "@/hooks/use-mounted"
import { FALogo } from "@/components/fa-logo"
import { LandingSkeleton } from "@/components/landing/landing-skeleton"
import { ShieldCheck } from "lucide-react"

/* ── Dynamic Client Component Imports with SSR Hydration Safety ── */
const CursorGlow = dynamic(
  () => import("@/components/landing/cursor-glow").then((m) => m.CursorGlow),
  { ssr: false }
)

const LandingHeader = dynamic(
  () => import("@/components/landing/landing-header").then((m) => m.LandingHeader),
  {
    ssr: false,
    loading: () => <div className="h-16 w-full bg-transparent" />,
  }
)

const HeroSection = dynamic(
  () => import("@/components/landing/hero-section").then((m) => m.HeroSection),
  {
    ssr: false,
    loading: () => <LandingSkeleton />,
  }
)

const TransitionDivider = dynamic(
  () => import("@/components/landing/transition-divider").then((m) => m.TransitionDivider),
  { ssr: false }
)

const NNRGAboutSection = dynamic(
  () => import("@/components/landing/nnrg-about-section").then((m) => m.NNRGAboutSection),
  { ssr: false }
)

const SecurityLayers = dynamic(
  () => import("@/components/landing/security-layers").then((m) => m.SecurityLayers),
  { ssr: false }
)

const FinalCtaSection = dynamic(
  () => import("@/components/landing/final-cta-section").then((m) => m.FinalCtaSection),
  { ssr: false }
)

export default function HomePage() {
  const mounted = useMounted()

  if (!mounted) {
    return <LandingSkeleton />
  }

  return (
    <div className="flex min-h-svh flex-col bg-[#F9FAFB] text-[#111827] overflow-x-hidden relative selection:bg-[#6D28D9] selection:text-white">
      
      {/* Interactive Radial Glow Following Cursor */}
      <CursorGlow />

      {/* SECTION 1: FULL-WIDTH GLASSMORPHIC STICKY HEADER */}
      <LandingHeader />

      {/* Main Flowing Content */}
      <main className="flex-1 w-full">
        
        {/* SECTION 2: HERO SECTION (COMPACT 1 VIEWPORT) */}
        <HeroSection />

        {/* SECTION 3: FLOATING STATS BAR */}
        <TransitionDivider />

        {/* SECTION 4: ABOUT NNRG COLLEGE ECOSYSTEM */}
        <NNRGAboutSection />

        {/* SECTION 5: THREE SECURITY LAYERS */}
        <SecurityLayers />

        {/* SECTION 6: FINAL CTA SECTION */}
        <FinalCtaSection />

      </main>

      {/* SECTION 7: UNIFIED NNRG FOOTER */}
      <footer className="relative bg-[#1E3A8A] text-white px-4 sm:px-6 md:px-8 py-6 sm:py-7 mt-0 sm:-mt-2 border-t border-blue-900/50">
        <div className="mx-auto max-w-7xl flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between text-center sm:text-left">
          
          {/* Logo & Slogan */}
          <div className="flex items-center justify-center sm:justify-start gap-3">
            <FALogo size="sm" variant="blue" className="bg-white rounded-xl p-1 shadow-md" />
            <div className="flex flex-col">
              <span className="text-sm font-extrabold tracking-tight text-white">Factor Attendance</span>
              <span className="text-xs text-[#38BDF8] font-semibold flex items-center justify-center sm:justify-start gap-1">
                <ShieldCheck className="size-3 text-[#38BDF8]" /> NNRG CAMPUS SECURITY
              </span>
            </div>
          </div>
          
          {/* Nav Links: Overview · About · Security · Sign In */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs sm:text-sm font-extrabold text-white/95">
            <a href="#hero" className="hover:text-[#38BDF8] transition-colors">Overview</a>
            <a href="#about" className="hover:text-[#38BDF8] transition-colors">About</a>
            <a href="#how-it-works" className="hover:text-[#38BDF8] transition-colors">Security</a>
            <Link href="/login" className="text-[#38BDF8] font-extrabold hover:underline">Sign In</Link>
          </div>

          {/* NNRG Branding & Copyright */}
          <div className="flex flex-col text-center sm:text-right text-xs text-white/80 font-medium">
            <span className="font-extrabold text-white">Built for NNRG College</span>
            <span className="text-[11px] text-white/70">Nalla Narasimha Reddy Education Society's Group of Institutions</span>
            <span className="text-[10px] text-white/50 mt-0.5">© 2026 NNRG College — All rights reserved</span>
          </div>

        </div>
      </footer>

    </div>
  )
}