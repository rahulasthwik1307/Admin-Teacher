"use client"

import { useEffect } from "react"
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

  // Strip any stale hash from the URL on mount (e.g. browser cache from old hash-based nav)
  useEffect(() => {
    if (window.location.hash) {
      history.replaceState(null, "", window.location.pathname)
    }
  }, [])

  if (!mounted) {
    return <LandingSkeleton />
  }

  return (
    <div className="flex min-h-svh flex-col bg-[#F8FAFC] text-[#111827] overflow-x-hidden relative selection:bg-[#1E3A8A] selection:text-white">
      
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

      {/* SECTION 7: UNIFIED NNRG FOOTER - DISTINCT THIRD LIGHT BLUE/SLATE TONE */}
      <footer className="relative bg-linear-to-b from-[#DCE8F5] via-[#D3E1F0] to-[#CAD9EB] text-slate-700 px-4 sm:px-6 md:px-8 py-7 sm:py-8 mt-0 border-t border-[#8EB1D6] shadow-[0_-6px_24px_-4px_rgba(15,23,42,0.06),inset_0_1px_0_0_rgba(255,255,255,0.9)]">
        <div className="mx-auto max-w-7xl flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between text-center sm:text-left">
          
          {/* Logo & Slogan */}
          <div className="flex items-center justify-center sm:justify-start gap-3">
            <FALogo size="sm" variant="blue" className="bg-white rounded-xl p-1 border border-slate-200/90 shadow-2xs" />
            <div className="flex flex-col">
              <span className="text-sm font-extrabold tracking-tight text-slate-900">Factor Attendance</span>
              <span className="text-xs text-[#0284C7] font-bold flex items-center justify-center sm:justify-start gap-1">
                <ShieldCheck className="size-3 text-[#0284C7]" /> NNRG CAMPUS SECURITY
              </span>
            </div>
          </div>
          
          {/* Nav Links: Overview · About · Security · Sign In */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs sm:text-sm font-bold text-slate-700">
            <button
              type="button"
              onClick={() => document.getElementById("hero")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="hover:text-[#1E3A8A] transition-colors cursor-pointer"
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => document.getElementById("about")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="hover:text-[#1E3A8A] transition-colors cursor-pointer"
            >
              About
            </button>
            <button
              type="button"
              onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="hover:text-[#1E3A8A] transition-colors cursor-pointer"
            >
              Security
            </button>
            <Link href="/login" className="text-[#1E3A8A] font-extrabold hover:text-[#0284C7] hover:underline">Sign In</Link>
          </div>

          {/* NNRG Branding & Copyright */}
          <div className="flex flex-col text-center sm:text-right text-xs text-slate-700 font-medium">
            <span className="font-bold text-slate-900">Built for NNRG College</span>
            <span className="text-[11px] text-slate-600">Nalla Narasimha Reddy Education Society's Group of Institutions</span>
            <span className="text-[10px] text-slate-500 mt-0.5">© 2026 NNRG College — All rights reserved</span>
          </div>

        </div>
      </footer>

    </div>
  )
}