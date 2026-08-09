"use client"

import { useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, Play, QrCode, Shield, CheckCircle2, X, Lock, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export function FinalCtaSection() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleDemoVideoClick = () => {
    toast.info("🎬 Coming Soon!", {
      description: "The official NNRG College Factor Attendance walkthrough video will be published shortly.",
    })
    setIsModalOpen(true)
  }

  return (
    <section id="final-cta" className="relative py-10 sm:py-14 -mt-4 sm:-mt-6 px-4 sm:px-6 md:px-8 overflow-hidden bg-linear-to-br from-[#0F172A] via-[#1E1B4B] to-[#1E3A8A]">
      
      {/* Floating Parallax Background Elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Soft Ambient Radial Glows */}
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 size-72 rounded-full bg-[#0EA5E9]/15 blur-3xl" />
        <div className="absolute top-1/2 right-1/4 -translate-y-1/2 size-72 rounded-full bg-[#6D28D9]/20 blur-3xl" />

        <motion.div
          animate={{ y: [0, -25, 0], rotate: [0, 12, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-10 left-12 text-white/10"
        >
          <QrCode size={48} />
        </motion.div>

        <motion.div
          animate={{ y: [0, 35, 0], rotate: [0, -15, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-12 left-1/4 text-white/15"
        >
          <Shield size={36} />
        </motion.div>

        <motion.div
          animate={{ y: [0, -20, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-1/3 right-16 text-white/10"
        >
          <CheckCircle2 size={40} />
        </motion.div>

        <motion.div
          animate={{ y: [0, 30, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 3 }}
          className="absolute bottom-16 right-1/3 text-white/10"
        >
          <Lock size={28} />
        </motion.div>
      </div>

      {/* Main Container */}
      <div className="relative z-10 mx-auto max-w-4xl text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="backdrop-blur-xl bg-linear-to-br from-[#1E293B]/90 via-[#0F172A]/95 to-[#1E1B4B]/90 text-white border border-white/20 shadow-2xl shadow-black/40 rounded-3xl p-6 sm:p-9 md:p-10 relative overflow-hidden"
        >
          {/* Badge */}
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest text-white backdrop-blur-md">
            <Sparkles size={13} className="text-[#0EA5E9]" />
            NNRG Campus Security Platform
          </div>

          <h2 className="text-4xl sm:text-5xl font-bold tracking-wider text-white leading-tight">
            Ready to Revolutionize Campus Security?
          </h2>

          <p className="mt-3 max-w-xl mx-auto text-sm sm:text-base md:text-lg text-white/85 font-medium leading-relaxed">
            Built for NNRG College — Secure your campus with smart attendance
          </p>

          {/* Action CTAs — 65% / 35% Grid Ratio on Mobile */}
          <div className="mt-7 grid grid-cols-[0.65fr_0.35fr] sm:flex sm:flex-row items-center justify-center gap-2.5 sm:gap-5 w-full sm:w-auto max-w-full">
            <Button
              asChild
              size="lg"
              className="h-11 min-h-11 sm:h-12 sm:min-h-12 w-full sm:w-auto rounded-xl bg-linear-to-r from-[#0EA5E9] to-[#6D28D9] hover:from-[#0284C7] hover:to-[#5B21B6] px-3 sm:px-8 text-xs sm:text-base font-extrabold text-white shadow-lg shadow-[#0EA5E9]/30 transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] group whitespace-nowrap overflow-hidden"
            >
              <Link href="/login" className="flex items-center justify-center gap-1.5 sm:gap-2 w-full">
                <span className="truncate">Sign In</span>
                <ArrowRight size={16} className="shrink-0 transition-transform duration-300 group-hover:translate-x-1 hidden sm:inline-block" />
              </Link>
            </Button>

            <button
              type="button"
              onClick={handleDemoVideoClick}
              className="h-11 min-h-11 sm:h-12 sm:min-h-12 w-full sm:w-auto inline-flex items-center justify-center gap-1.5 sm:gap-2.5 rounded-xl border border-white/25 bg-white/10 hover:bg-white/20 px-2 sm:px-7 text-xs sm:text-base font-bold text-white shadow-md backdrop-blur-md transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer whitespace-nowrap overflow-hidden"
            >
              <span className="relative flex size-6 sm:size-7 items-center justify-center rounded-full bg-white/20 text-white shrink-0">
                <Play size={11} className="fill-white translate-x-0.5 sm:size-3.5" />
              </span>
              <span className="truncate">
                <span className="hidden sm:inline">Watch Demo Video ▶</span>
                <span className="sm:hidden">Watch Demo</span>
              </span>
            </button>
          </div>
        </motion.div>
      </div>

      {/* Demo Video Modal Placeholder */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-700 p-6 sm:p-8 text-white shadow-2xl"
            >
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 rounded-full bg-slate-800 p-2 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-2 mb-4">
                <Play className="text-[#0EA5E9]" size={20} />
                <h3 className="text-xl font-bold">NNRG Factor Attendance Video Tour</h3>
              </div>

              {/* Video Player Mockup */}
              <div className="relative aspect-video rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center text-center p-6 overflow-hidden">
                <div className="scan-laser-line" />
                
                <div className="size-16 rounded-full bg-[#1E3A8A]/60 border border-[#0EA5E9]/60 flex items-center justify-center text-[#0EA5E9] mb-3 shadow-xl animate-pulse">
                  <Play size={28} className="fill-[#0EA5E9] translate-x-0.5" />
                </div>
                
                <h4 className="text-base font-extrabold text-white">🎬 Demo Video Coming Soon!</h4>
                <p className="text-xs text-slate-400 max-w-sm mt-2 leading-relaxed">
                  Experience real-time dynamic QR generation, biometric AI verification, and campus GPS geofence checks live on the NNRG Web Portal.
                </p>

                <Button
                  asChild
                  size="sm"
                  className="mt-5 bg-[#0EA5E9] hover:bg-[#6D28D9] text-white rounded-xl font-bold px-5"
                >
                  <Link href="/login">Go to Sign In →</Link>
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
