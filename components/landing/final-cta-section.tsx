"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, QrCode, Shield, CheckCircle2, Lock, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

export function FinalCtaSection() {
  return (
    <section
      id="final-cta"
      className="relative py-14 sm:py-18 -mt-4 sm:-mt-6 px-4 sm:px-6 md:px-8 overflow-hidden bg-linear-to-b from-[#ABC8E6] via-[#BDD6F0] to-[#A3C4E4] border-t border-[#8FB4D9] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.85),inset_0_16px_36px_-10px_rgba(30,58,138,0.07),inset_0_-16px_36px_-10px_rgba(30,58,138,0.07)]"
    >
      
      {/* Multi-Zone Radial Lighting & Ambient Depth */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Soft Center Radial Spotlight directly behind the elevated card */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-full max-h-125 rounded-full bg-radial from-white/60 via-white/20 to-transparent blur-3xl" />
        
        {/* Subtle Ambient Flank Vignettes */}
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-[#7CA2CE]/20 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-[#7CA2CE]/20 blur-3xl" />

        {/* Floating Parallax Icons */}
        <motion.div
          animate={{ y: [0, -20, 0], rotate: [0, 10, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-10 left-12 text-[#1E3A8A]/20 drop-shadow-xs"
        >
          <QrCode size={48} />
        </motion.div>

        <motion.div
          animate={{ y: [0, 25, 0], rotate: [0, -12, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-12 left-1/4 text-[#1E3A8A]/20 drop-shadow-xs"
        >
          <Shield size={36} />
        </motion.div>

        <motion.div
          animate={{ y: [0, -18, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-1/3 right-16 text-[#1E3A8A]/20 drop-shadow-xs"
        >
          <CheckCircle2 size={40} />
        </motion.div>

        <motion.div
          animate={{ y: [0, 22, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 3 }}
          className="absolute bottom-16 right-1/3 text-[#1E3A8A]/20 drop-shadow-xs"
        >
          <Lock size={28} />
        </motion.div>
      </div>

      {/* Main Container */}
      <div className="relative z-10 mx-auto max-w-4xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          viewport={{ once: true }}
          className="bg-[radial-gradient(ellipse_at_top,#FFFFFF_0%,#FBFCFE_50%,#F0F5FA_100%)] text-slate-900 border border-white/90 ring-1 ring-slate-900/8 shadow-[0_3px_6px_-1px_rgba(15,23,42,0.08),0_12px_24px_-4px_rgba(15,23,42,0.12),0_32px_64px_-12px_rgba(30,58,138,0.22),0_48px_96px_-24px_rgba(15,23,42,0.12),inset_0_1px_2px_0_#FFFFFF,inset_0_-1px_1px_0_rgba(203,213,225,0.4)] rounded-3xl p-6 sm:p-9 md:p-11 relative overflow-hidden flex flex-col items-center hover:shadow-[0_5px_10px_-2px_rgba(15,23,42,0.1),0_18px_32px_-6px_rgba(15,23,42,0.14),0_40px_76px_-14px_rgba(30,58,138,0.26),0_58px_110px_-28px_rgba(15,23,42,0.15),inset_0_1px_2px_0_#FFFFFF] transition-all duration-300"
        >
          {/* Badge */}
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200/90 bg-blue-50/90 px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest text-[#1E3A8A] shadow-2xs">
            <Sparkles size={13} className="text-[#0284C7]" />
            NNRG Campus Security Platform
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#1E3A8A] leading-tight">
            Ready to Revolutionize Campus Security?
          </h2>

          <p className="mt-3 max-w-xl mx-auto text-sm sm:text-base md:text-lg text-slate-600 font-medium leading-relaxed">
            Built for NNRG College — Secure your campus with smart attendance
          </p>

          {/* Centered Single Action CTA */}
          <div className="mt-7 flex justify-center w-full">
            <Button
              asChild
              size="lg"
              className="h-12 min-h-12 w-full sm:w-auto min-w-56 max-w-xs rounded-xl bg-linear-to-r from-[#0284C7] to-[#1E3A8A] hover:from-[#0369A1] hover:to-[#172554] px-8 text-base font-extrabold text-white shadow-md shadow-blue-900/20 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 group"
            >
              <Link href="/login" className="flex items-center justify-center gap-2 w-full">
                <span>Sign In</span>
                <ArrowRight size={18} className="shrink-0 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
