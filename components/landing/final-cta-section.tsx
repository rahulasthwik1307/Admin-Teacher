"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, QrCode, Shield, CheckCircle2, Lock, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

export function FinalCtaSection() {
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
          className="backdrop-blur-xl bg-linear-to-br from-[#1E293B]/90 via-[#0F172A]/95 to-[#1E1B4B]/90 text-white border border-white/20 shadow-2xl shadow-black/40 rounded-3xl p-6 sm:p-9 md:p-10 relative overflow-hidden flex flex-col items-center"
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

          {/* Centered Single Action CTA */}
          <div className="mt-7 flex justify-center w-full">
            <Button
              asChild
              size="lg"
              className="h-12 min-h-12 w-full sm:w-auto min-w-56 max-w-xs rounded-xl bg-linear-to-r from-[#0EA5E9] to-[#6D28D9] hover:from-[#0284C7] hover:to-[#5B21B6] px-8 text-base font-extrabold text-white shadow-lg shadow-[#0EA5E9]/30 transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] group"
            >
              <Link href="/login" className="flex items-center justify-center gap-2 w-full">
                <span>Sign In</span>
                <ArrowRight size={18} className="shrink-0 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
