"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, ShieldCheck, Menu, X, LayoutDashboard, Building2, ChevronRight, Compass } from "lucide-react"
import { FALogo } from "@/components/fa-logo"
import { Button } from "@/components/ui/button"

export function LandingHeader() {
  const [scrollProgress, setScrollProgress] = useState(0)
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
    setMobileMenuOpen(false)
    setTimeout(() => {
      const el = document.getElementById(id)
      if (el) {
        const headerOffset = 80
        const elementPosition = el.getBoundingClientRect().top
        const offsetPosition = elementPosition + window.scrollY - headerOffset
        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth"
        })
      }
    }, 50)
  }

  return (
    <>
      {/* 2.5px Fixed Scroll Progress Bar at top */}
      <div
        className="fixed top-0 left-0 right-0 h-[2.5px] z-9999 pointer-events-none transition-[width] duration-150 ease-out"
        style={{
          width: `${scrollProgress}%`,
          backgroundColor: "#1E3A8A",
        }}
      />

      {/* Sticky Full-Width Header */}
      <header
        className="fixed top-0 left-0 right-0 w-full z-50 transition-all duration-300 translate-y-0"
      >
        <div
          className={`w-full transition-all duration-300 bg-white ${
            isScrolled || mobileMenuOpen
              ? "border-b border-slate-200/90 shadow-[0_4px_14px_-2px_rgba(15,23,42,0.07),0_2px_4px_-2px_rgba(15,23,42,0.04)]"
              : "border-b border-slate-200/80 shadow-[0_1px_3px_0_rgba(15,23,42,0.05),0_1px_2px_-1px_rgba(15,23,42,0.03)]"
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
                <span className="text-[10px] sm:text-[11px] font-bold tracking-wider text-[#0284C7] uppercase flex items-center gap-1">
                  <ShieldCheck className="size-3 text-[#0284C7]" /> NNRG Campus Security
                </span>
              </div>
            </Link>

            {/* Center Navigation: Overview · About · Security (Desktop Only) */}
            <div className="hidden md:flex items-center gap-8 text-sm sm:text-base font-bold text-[#111827]">
              <button
                type="button"
                onClick={() => scrollTo("hero")}
                className="relative py-1 transition-colors hover:text-[#1E3A8A] after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-[#1E3A8A] after:transition-all hover:after:w-full cursor-pointer"
              >
                Overview
              </button>
              <button
                type="button"
                onClick={() => scrollTo("about")}
                className="relative py-1 transition-colors hover:text-[#1E3A8A] after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-[#1E3A8A] after:transition-all hover:after:w-full cursor-pointer"
              >
                About
              </button>
              <button
                type="button"
                onClick={() => scrollTo("how-it-works")}
                className="relative py-1 transition-colors hover:text-[#1E3A8A] after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-[#1E3A8A] after:transition-all hover:after:w-full cursor-pointer"
              >
                Security
              </button>
            </div>

            {/* Far Right: Sign In Button & Mobile Menu Toggle */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <Button
                asChild
                size="sm"
                className="h-9 sm:h-10 rounded-xl bg-[#1E3A8A] hover:bg-[#1e40af] px-4 sm:px-5 text-xs sm:text-sm font-bold text-white shadow-xs border border-blue-900/20 transition-all duration-200 active:scale-[0.98] group"
              >
                <Link href="/login" className="flex items-center gap-1.5 sm:gap-2">
                  <span>Sign In</span>
                  <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-1" />
                </Link>
              </Button>

              {/* Mobile Menu Hamburger Button (Below md:) */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-xl text-slate-700 hover:text-[#1E3A8A] hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </nav>

          {/* Animated Mobile Navigation Dropdown */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="md:hidden overflow-hidden bg-white/98 backdrop-blur-md border-t border-slate-200 shadow-lg"
              >
                <div className="flex flex-col gap-2.5 p-3.5 sm:p-4">
                  {/* Subtle Header/Divider Bar */}
                  <div className="flex items-center justify-between px-1 pb-1 text-[11px] font-mono tracking-wider text-slate-500 uppercase font-extrabold border-b border-slate-100">
                    <span className="flex items-center gap-1.5 text-[#1E3A8A]">
                      <Compass size={13} className="text-[#0EA5E9]" /> NAVIGATION
                    </span>
                    <span className="text-[10px] text-[#0284C7] font-sans font-bold bg-[#0EA5E9]/10 px-2 py-0.5 rounded-full border border-[#0EA5E9]/20">
                      NNRG CAMPUS
                    </span>
                  </div>

                  <motion.div
                    initial="hidden"
                    animate="show"
                    exit="exit"
                    variants={{
                      show: { transition: { staggerChildren: 0.06 } },
                      exit: { transition: { staggerChildren: 0.04, staggerDirection: -1 } }
                    }}
                    className="flex flex-col gap-2 pt-1"
                  >
                    {/* Item 1: Overview */}
                    <motion.button
                      type="button"
                      variants={{
                        hidden: { opacity: 0, y: -6 },
                        show: { opacity: 1, y: 0 },
                        exit: { opacity: 0, y: -4 }
                      }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => scrollTo("hero")}
                      className="group flex items-center justify-between p-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs hover:border-slate-300 transition-all duration-200 cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-xl bg-sky-50 text-[#0284C7] border border-sky-200/80 flex items-center justify-center font-bold shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                          <LayoutDashboard size={18} />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-extrabold text-sm text-[#111827] group-hover:text-[#1E3A8A] transition-colors leading-tight">
                            Overview
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500">
                            System Dashboard & Live Metrics
                          </span>
                        </div>
                      </div>
                      <div className="size-7 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 flex items-center justify-center shadow-2xs group-hover:translate-x-1 group-hover:bg-[#1E3A8A] group-hover:text-white transition-all shrink-0">
                        <ChevronRight size={15} />
                      </div>
                    </motion.button>

                    {/* Item 2: About */}
                    <motion.button
                      type="button"
                      variants={{
                        hidden: { opacity: 0, y: -6 },
                        show: { opacity: 1, y: 0 },
                        exit: { opacity: 0, y: -4 }
                      }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => scrollTo("about")}
                      className="group flex items-center justify-between p-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs hover:border-slate-300 transition-all duration-200 cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-xl bg-purple-50 text-[#6D28D9] border border-purple-200/80 flex items-center justify-center font-bold shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                          <Building2 size={18} />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-extrabold text-sm text-[#111827] group-hover:text-[#6D28D9] transition-colors leading-tight">
                            About
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500">
                            NNRG College Ecosystem & Features
                          </span>
                        </div>
                      </div>
                      <div className="size-7 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 flex items-center justify-center shadow-2xs group-hover:translate-x-1 group-hover:bg-[#6D28D9] group-hover:text-white transition-all shrink-0">
                        <ChevronRight size={15} />
                      </div>
                    </motion.button>

                    {/* Item 3: Security */}
                    <motion.button
                      type="button"
                      variants={{
                        hidden: { opacity: 0, y: -6 },
                        show: { opacity: 1, y: 0 },
                        exit: { opacity: 0, y: -4 }
                      }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => scrollTo("how-it-works")}
                      className="group flex items-center justify-between p-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs hover:border-slate-300 transition-all duration-200 cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center font-bold shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                          <ShieldCheck size={18} />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-extrabold text-sm text-[#111827] group-hover:text-emerald-700 transition-colors leading-tight">
                            Security
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500">
                            3-Factor Anti-Proxy Protection
                          </span>
                        </div>
                      </div>
                      <div className="size-7 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 flex items-center justify-center shadow-2xs group-hover:translate-x-1 group-hover:bg-emerald-600 group-hover:text-white transition-all shrink-0">
                        <ChevronRight size={15} />
                      </div>
                    </motion.button>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>
    </>
  )
}
