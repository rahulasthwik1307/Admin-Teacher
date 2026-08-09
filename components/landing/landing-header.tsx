"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, ShieldCheck } from "lucide-react"
import { FALogo } from "@/components/fa-logo"
import { Button } from "@/components/ui/button"

export function LandingHeader() {
  const [scrollProgress, setScrollProgress] = useState(0)
  const [isVisible, setIsVisible] = useState(true)
  const [isScrolled, setIsScrolled] = useState(false)
  const [prevScrollY, setPrevScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight
      const progress = maxScroll > 0 ? (currentY / maxScroll) * 100 : 0
      setScrollProgress(progress)

      setIsScrolled(currentY > 20)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <>
      {/* 3px Fixed Scroll Progress Bar at very top */}
      <div
        className="fixed top-0 left-0 right-0 h-0.75 z-9999 pointer-events-none transition-[width] duration-150 ease-out"
        style={{
          width: `${scrollProgress}%`,
          background: "linear-gradient(90deg, #1E3A8A 0%, #6D28D9 50%, #0EA5E9 100%)",
        }}
      />

      {/* Sticky Full-Width Header */}
      <header
        className="fixed top-0 left-0 right-0 w-full z-50 transition-all duration-300 translate-y-0"
      >
        <div
          className={`w-full transition-all duration-300 ${
            isScrolled
              ? "bg-white/80 backdrop-blur-xl border-b border-white/30 shadow-lg shadow-[#1E3A8A]/10"
              : "bg-white/60 backdrop-blur-md border-b border-slate-200/60 shadow-xs"
          }`}
        >
          <nav className="max-w-7xl mx-auto flex h-16 sm:h-18 items-center justify-between px-4 sm:px-6 md:px-8 w-full">
            {/* Far Left: Logo & Sub-brand */}
            <Link href="/" className="flex items-center gap-3 group shrink-0">
              <FALogo size="sm" variant="blue" className="transition-transform duration-300 group-hover:scale-105" />
              <div className="flex flex-col">
                <span className="text-base sm:text-lg font-extrabold tracking-tight text-[#111827] group-hover:text-[#1E3A8A] transition-colors">
                  Factor Attendance
                </span>
                <span className="text-[10px] sm:text-[11px] font-bold tracking-wider text-[#0EA5E9] uppercase flex items-center gap-1">
                  <ShieldCheck className="size-3 text-[#0EA5E9]" /> NNRG Campus Security
                </span>
              </div>
            </Link>

            {/* Center Navigation: Overview · About · Security */}
            <div className="hidden md:flex items-center gap-8 text-sm sm:text-base font-bold text-[#111827]">
              <button
                type="button"
                onClick={() => scrollTo("hero")}
                className="relative py-1 transition-colors hover:text-[#6D28D9] after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-[#6D28D9] after:transition-all hover:after:w-full cursor-pointer"
              >
                Overview
              </button>
              <button
                type="button"
                onClick={() => scrollTo("about")}
                className="relative py-1 transition-colors hover:text-[#6D28D9] after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-[#6D28D9] after:transition-all hover:after:w-full cursor-pointer"
              >
                About
              </button>
              <button
                type="button"
                onClick={() => scrollTo("how-it-works")}
                className="relative py-1 transition-colors hover:text-[#6D28D9] after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-[#6D28D9] after:transition-all hover:after:w-full cursor-pointer"
              >
                Security
              </button>
            </div>

            {/* Far Right: Single Sign In Button with Cyan Glow */}
            <div className="flex items-center gap-3 shrink-0">
              <Button
                asChild
                size="sm"
                className="h-10 sm:h-11 rounded-xl bg-linear-to-r from-[#1E3A8A] via-[#6D28D9] to-[#0EA5E9] px-6 text-sm font-bold text-white shadow-md shadow-[#1E3A8A]/20 transition-all duration-300 hover:shadow-xl hover:shadow-[#0EA5E9]/50 hover:scale-[1.04] active:scale-[0.98] group"
              >
                <Link href="/login" className="flex items-center gap-2">
                  <span>Sign In</span>
                  <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          </nav>
        </div>

        {/* Curved Wave / Gradient Transition below Header */}
        <div className="w-full h-3 bg-linear-to-b from-white/40 via-white/10 to-transparent pointer-events-none" />
      </header>
    </>
  )
}
