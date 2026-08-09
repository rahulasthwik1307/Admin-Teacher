"use client"

import { useRef, useState, useEffect } from "react"
import { motion, useInView, AnimatePresence } from "framer-motion"
import { Laptop, Smartphone, QrCode, ScanFace, MapPin, CheckCircle2, Building2, ShieldCheck, Activity, BarChart3, Lock, Zap, Wifi, Layers } from "lucide-react"
import Link from "next/link"
import { RealQRCode } from "./real-qr-code"

const webPortalFeatures = [
  "Dynamic QR Generator",
  "Classroom Geofence Control",
  "Live Check-in Monitoring",
  "Automated Reports",
]

const flutterAppFeatures = [
  "AI Biometric Face Verification",
  "Dynamic QR Code Scanning",
  "GPS Geofence Verification",
  "Instant Attendance Marking",
]

export function NNRGAboutSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })

  /* ── Card 1 Animations: Dashboard Numbers Counting Up & Active Session Timer ── */
  const [checkedInCount, setCheckedInCount] = useState(12)
  const [sessionTimer, setSessionTimer] = useState(14)

  useEffect(() => {
    if (!isInView) return
    const countInterval = setInterval(() => {
      setCheckedInCount((prev) => (prev >= 48 ? 48 : prev + 3))
    }, 150)
    const timerInterval = setInterval(() => {
      setSessionTimer((prev) => (prev <= 1 ? 15 : prev - 1))
    }, 1000)
    return () => {
      clearInterval(countInterval)
      clearInterval(timerInterval)
    }
  }, [isInView])

  /* ── Card 2 Animations: Phone Screen Transitions (0: Scan -> 1: Face -> 2: Verified) ── */
  const [card2Stage, setCard2Stage] = useState(0)
  useEffect(() => {
    if (!isInView) return
    const stageInterval = setInterval(() => {
      setCard2Stage((prev) => (prev + 1) % 3)
    }, 2200)
    return () => clearInterval(stageInterval)
  }, [isInView])

  return (
    <section
      id="about"
      ref={sectionRef}
      className="relative py-12 sm:py-16 px-4 sm:px-6 md:px-8 bg-linear-to-b from-[#F9FAFB] via-[#F3F0FF]/40 to-[#F9FAFB] overflow-hidden"
    >
      {/* Background Overlapping Blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-20 size-72 rounded-full bg-[#6D28D9]/10 blur-3xl" />
        <div className="absolute bottom-10 -right-20 size-80 rounded-full bg-[#0EA5E9]/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl">

        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-16">
          <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-[#1E3A8A]/20 bg-[#1E3A8A]/10 px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest text-[#1E3A8A]">
            <Building2 size={14} className="text-[#1E3A8A]" />
            🏛️ NNRG College Ecosystem
          </div>
          
          <h2 className="text-3xl font-extrabold tracking-tight text-[#111827] sm:text-4xl md:text-5xl">
            Built Exclusively for NNRG College
          </h2>
          <p className="mt-2 text-xs sm:text-sm font-bold text-[#6D28D9]">
            Nalla Narasimha Reddy Education Society’s Group of Institutions
          </p>
          
          <p className="mt-4 max-w-3xl mx-auto text-sm sm:text-base text-slate-600 leading-relaxed font-medium">
            Factor Attendance is an integrated campus security ecosystem engineered exclusively for NNRG College. It unites the Web Management Portal for faculty with a native Mobile Application for students, ensuring zero proxy attendance through dynamic QR codes, facial recognition AI, and physical GPS boundary enforcement.
          </p>
        </div>

        {/* Two Visually Different Cards Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch mb-12">

          {/* CARD 1: Web Portal (Next.js) - Square 1:1 Aspect Ratio Animation Area */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="glass-card rounded-3xl p-6 sm:p-8 border border-white/80 flex flex-col justify-between hover:-translate-y-2 hover:shadow-2xl hover:shadow-[#1E3A8A]/25 transition-all duration-300 group"
          >
            <div>
              {/* Header Badge & Title */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="size-14 rounded-2xl bg-[#1E3A8A] text-white flex items-center justify-center shadow-lg shadow-[#1E3A8A]/30 group-hover:scale-105 transition-transform">
                    <Laptop size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-extrabold text-[#111827]">Web Portal (Next.js)</h3>
                    <p className="text-xs font-bold text-[#0EA5E9]">For Teachers & Administrators</p>
                  </div>
                </div>
                <span className="hidden sm:inline-flex rounded-full bg-[#1E3A8A]/10 px-3 py-1 text-xs font-extrabold text-[#1E3A8A] border border-[#1E3A8A]/20">
                  Faculty Console
                </span>
              </div>

              {/* Square 1:1 Aspect Ratio Animation Area for Web Portal */}
              <div className="relative w-full aspect-square rounded-2xl bg-linear-to-br from-[#1E3A8A] via-[#111827] to-[#1E3A8A] p-4 sm:p-5 mb-6 overflow-hidden border border-blue-900 shadow-xl text-white flex flex-col justify-between">
                
                {/* Header bar inside animation area */}
                <div className="flex items-center justify-between border-b border-blue-800/80 pb-2 text-[11px] font-mono text-[#0EA5E9]">
                  <span className="flex items-center gap-1.5 font-bold">
                    <Activity size={13} className="animate-pulse" /> FACULTY LIVE CONSOLE
                  </span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Wifi size={12} className="animate-pulse" /> ONLINE ({sessionTimer}s)
                  </span>
                </div>

                {/* 3 Mini Cards inside Square Animation Area */}
                <div className="grid grid-cols-1 gap-3 my-auto">

                  {/* Mini Card 1: QR Broadcast (ONLY THIS HAS SCANNING ANIMATION LINE) */}
                  <div className="relative rounded-xl bg-slate-900/90 border border-blue-700/70 p-3 overflow-hidden flex items-center justify-between shadow-xs">
                    {/* Vertical scanning line ONLY inside Mini Card 1 */}
                    <div className="scan-laser-line z-10" />

                    <div className="flex items-center gap-3 z-10">
                      <div className="p-1 rounded-lg bg-white shrink-0">
                        <RealQRCode size={36} seed={sessionTimer} darkColor="#1E3A8A" lightColor="#FFFFFF" />
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-extrabold text-white">QR Broadcast</div>
                        <div className="text-[10px] text-[#0EA5E9] font-mono font-extrabold animate-pulse">
                          ROTATING (15s)
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-[#0EA5E9]/20 text-[#0EA5E9] text-[9px] font-mono font-extrabold border border-[#0EA5E9]/40 z-10">
                      BEAM LIVE
                    </span>
                  </div>

                  {/* Mini Card 2: Class Geofence (Radar Rings Expanding, NO Scanning Line) */}
                  <div className="relative rounded-xl bg-slate-900/90 border border-purple-700/70 p-3 overflow-hidden flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-3 z-10">
                      <div className="relative size-9 rounded-lg bg-[#6D28D9]/30 border border-[#6D28D9] flex items-center justify-center shrink-0">
                        {/* Radar ring expanding */}
                        <div className="absolute size-7 rounded-full border border-purple-400 animate-ping opacity-60" />
                        <MapPin size={18} className="text-purple-300 z-10" />
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-extrabold text-white">Class Geofence</div>
                        <div className="text-[10px] text-emerald-400 font-mono font-bold">100m LOCKED</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-mono font-bold border border-emerald-500/30 z-10">
                      BOUNDS OK
                    </span>
                  </div>

                  {/* Mini Card 3: Live Check-ins (Numbers Updating, NO Scanning Line) */}
                  <div className="relative rounded-xl bg-slate-900/90 border border-emerald-700/60 p-3 overflow-hidden flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-3 z-10">
                      <div className="size-9 rounded-lg bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center shrink-0 text-emerald-400">
                        <BarChart3 size={18} />
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-extrabold text-white">Live Check-ins</div>
                        <div className="text-[10px] text-slate-300 font-mono font-bold flex items-center gap-1">
                          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Students Logging In
                        </div>
                      </div>
                    </div>
                    <div className="text-right z-10">
                      <span className="text-sm font-mono font-extrabold text-emerald-400 block">{checkedInCount} / 50</span>
                      <span className="text-[8px] text-slate-400 font-mono">96% PRESENT</span>
                    </div>
                  </div>

                </div>

                {/* Animated Data Progress Bar */}
                <div className="w-full bg-slate-900/80 rounded-full h-2 p-0.5 border border-blue-800/50 mt-1">
                  <motion.div
                    animate={{ width: ["20%", "80%", "96%"] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="h-full bg-linear-to-r from-[#0EA5E9] via-[#6D28D9] to-emerald-400 rounded-full"
                  />
                </div>

              </div>

              {/* Features List with Staggered Checkmarks */}
              <div className="space-y-2.5">
                {webPortalFeatures.map((feature, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.4, delay: 0.1 * idx }}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-white/80 border border-slate-200/70 text-xs sm:text-sm font-bold text-[#111827]"
                  >
                    <div className="size-6 rounded-lg bg-[#0EA5E9]/15 text-[#0EA5E9] flex items-center justify-center shrink-0">
                      <CheckCircle2 size={16} />
                    </div>
                    <span>{feature}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-200/60 flex items-center justify-between text-xs font-bold text-slate-600">
              <span>Next.js 16 Web Management</span>
              <Link href="/login" className="text-[#1E3A8A] font-extrabold hover:text-[#6D28D9] underline">
                Sign In to Admin Portal →
              </Link>
            </div>
          </motion.div>

          {/* CARD 2: Flutter Mobile App - Square 1:1 Aspect Ratio Animation Area */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="glass-card rounded-3xl p-6 sm:p-8 border border-white/80 flex flex-col justify-between hover:-translate-y-2 hover:shadow-2xl hover:shadow-[#6D28D9]/25 transition-all duration-300 group"
          >
            <div>
              {/* Header Badge & Title */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="size-14 rounded-2xl bg-[#6D28D9] text-white flex items-center justify-center shadow-lg shadow-[#6D28D9]/30 group-hover:scale-105 transition-transform">
                    <Smartphone size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-extrabold text-[#111827]">Flutter Mobile App</h3>
                    <p className="text-xs font-bold text-[#6D28D9]">For Students</p>
                  </div>
                </div>
                <span className="hidden sm:inline-flex rounded-full bg-[#6D28D9]/10 px-3 py-1 text-xs font-extrabold text-[#6D28D9] border border-[#6D28D9]/20">
                  Student Mobile
                </span>
              </div>

              {/* Square 1:1 Aspect Ratio Animation Area for Flutter Mobile App */}
              <div className="relative w-full aspect-square rounded-2xl bg-linear-to-br from-[#6D28D9] via-[#1E3A8A] to-[#111827] p-4 sm:p-5 mb-6 overflow-hidden border border-purple-900 shadow-xl text-white flex flex-col justify-between">
                
                <div className="flex items-center justify-between border-b border-purple-800/80 pb-2 text-[11px] font-mono text-[#0EA5E9]">
                  <span className="flex items-center gap-1.5 font-bold">
                    <ScanFace size={13} className="animate-pulse" /> STUDENT MOBILE VERIFICATION
                  </span>
                  <span className="text-emerald-300 font-bold">● LIVE SCORE</span>
                </div>

                {/* Sleek Mini Phone Screen displaying 3 States */}
                <div className="relative my-auto w-full max-w-[210px] sm:max-w-[220px] mx-auto aspect-[9/16] max-h-[220px] rounded-2xl bg-[#111827] p-1.5 border-2 border-slate-700 shadow-2xl flex flex-col justify-between overflow-hidden">
                  <AnimatePresence mode="wait">

                    {/* STATE 1: QR Scanning with beam */}
                    {card2Stage === 0 && (
                      <motion.div
                        key="stg-qr"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.3 }}
                        className="w-full h-full rounded-xl bg-slate-950 p-2.5 flex flex-col items-center justify-between border border-blue-500/30 relative overflow-hidden text-center"
                      >
                        {/* Scanning beam line */}
                        <div className="scan-laser-line" />
                        <div className="text-[10px] font-extrabold text-[#0EA5E9]">State 1: QR Scanning</div>
                        <RealQRCode size={65} seed={sessionTimer} darkColor="#0EA5E9" lightColor="#090D16" />
                        <div className="text-[9px] font-mono text-cyan-300 font-bold bg-slate-900 px-2 py-0.5 rounded-full border border-blue-800">
                          SCANNING BEAM ACTIVE
                        </div>
                      </motion.div>
                    )}

                    {/* STATE 2: Face Verification with scanning grid ONLY on face area */}
                    {card2Stage === 1 && (
                      <motion.div
                        key="stg-face"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.3 }}
                        className="w-full h-full rounded-xl bg-slate-950 p-2.5 flex flex-col items-center justify-between border border-purple-500/30 relative overflow-hidden text-center"
                      >
                        <div className="text-[10px] font-extrabold text-[#6D28D9]">State 2: Face AI Match</div>
                        
                        <div className="relative size-20 rounded-xl border border-dashed border-[#0EA5E9] flex items-center justify-center bg-slate-900/60 overflow-hidden">
                          {/* Scanning Grid Overlay ONLY on Face Area */}
                          <div className="absolute inset-0 opacity-40 bg-[linear-gradient(to_right,#0EA5E9_1px,transparent_1px),linear-gradient(to_bottom,#0EA5E9_1px,transparent_1px)] bg-[size:8px_8px]" />
                          <ScanFace size={34} className="text-[#0EA5E9] animate-pulse relative z-10" />
                        </div>

                        <div className="text-[9px] font-mono text-emerald-400 font-extrabold bg-slate-900 px-2 py-0.5 rounded-full border border-purple-800">
                          99.8% Live Match Score
                        </div>
                      </motion.div>
                    )}

                    {/* STATE 3: GPS Verification with radar pulse */}
                    {card2Stage === 2 && (
                      <motion.div
                        key="stg-gps"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.3 }}
                        className="w-full h-full rounded-xl bg-slate-950 p-2.5 flex flex-col items-center justify-between border border-emerald-500/30 relative overflow-hidden text-center"
                      >
                        <div className="text-[10px] font-extrabold text-emerald-400">State 3: GPS Boundary</div>
                        <div className="relative size-18 rounded-full border border-emerald-500/40 flex items-center justify-center">
                          <div className="absolute size-14 rounded-full border border-emerald-400 animate-ping opacity-50" />
                          <MapPin size={26} className="text-emerald-400 z-10" />
                        </div>
                        <div className="text-[9px] font-mono text-emerald-300 font-extrabold bg-slate-900 px-2 py-0.5 rounded-full border border-emerald-800">
                          GPS BOUNDARY LOCKED
                        </div>
                      </motion.div>
                    )}

                  </AnimatePresence>
                </div>

                {/* Bottom Stage Progress Indicator */}
                <div className="flex items-center justify-center gap-1.5 pt-1 border-t border-purple-800/60">
                  {[0, 1, 2].map((stg) => (
                    <div
                      key={stg}
                      className={`h-1 rounded-full transition-all duration-300 ${
                        card2Stage === stg ? "w-4 bg-[#0EA5E9]" : "w-1 bg-purple-900"
                      }`}
                    />
                  ))}
                </div>

              </div>

              {/* Features List with Staggered Checkmarks */}
              <div className="space-y-2.5">
                {flutterAppFeatures.map((feature, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: 10 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.4, delay: 0.1 * idx }}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-white/80 border border-slate-200/70 text-xs sm:text-sm font-bold text-[#111827]"
                  >
                    <div className="size-6 rounded-lg bg-[#6D28D9]/15 text-[#6D28D9] flex items-center justify-center shrink-0">
                      <CheckCircle2 size={16} />
                    </div>
                    <span>{feature}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-200/60 flex items-center justify-between text-xs font-bold text-slate-600">
              <span>Flutter Native Cross-Platform</span>
              <span className="inline-flex items-center gap-1 text-emerald-600 font-extrabold">
                <CheckCircle2 size={14} /> Student Verified
              </span>
            </div>
          </motion.div>

        </div>

        {/* Section Footer */}
        <div className="p-6 rounded-3xl backdrop-blur-md bg-white/80 border border-white/90 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <Zap size={22} />
            </div>
            <div>
              <span className="text-sm font-extrabold text-[#111827] block">⚡ Zero Proxy Attendance Guaranteed</span>
              <span className="text-xs font-medium text-slate-500">Multi-factor security ensures 100% genuine check-ins.</span>
            </div>
          </div>
          <div className="px-4 py-2 rounded-2xl bg-[#1E3A8A]/10 border border-[#1E3A8A]/20 text-xs font-extrabold text-[#1E3A8A]">
            500+ Students · 50+ Faculty · 100% Accuracy
          </div>
        </div>

      </div>
    </section>
  )
}
