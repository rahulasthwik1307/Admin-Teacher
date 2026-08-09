"use client"

import { useRef, useState, useEffect } from "react"
import { motion, useInView } from "framer-motion"
import { Laptop, Smartphone, CheckCircle2, Building2, Activity, Zap } from "lucide-react"
import Link from "next/link"

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

  /* ── Card 1 Animations: Dashboard Numbers Counting Up ── */
  const [checkedInCount, setCheckedInCount] = useState(12)

  useEffect(() => {
    if (!isInView) return
    const countInterval = setInterval(() => {
      setCheckedInCount((prev) => (prev >= 48 ? 48 : prev + 3))
    }, 150)
    return () => {
      clearInterval(countInterval)
    }
  }, [isInView])

  return (
    <section
      id="about"
      ref={sectionRef}
      className="relative pt-6 sm:pt-8 pb-12 sm:pb-16 px-4 sm:px-6 md:px-8 bg-linear-to-b from-[#F9FAFB] via-[#F3F0FF]/40 to-[#F9FAFB] overflow-hidden"
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
        <div className="mx-auto max-w-[1060px] w-full grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-7 items-stretch mb-12">

          {/* CARD 1: Web Portal (Next.js) */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="glass-card rounded-3xl p-5 sm:p-7 border border-white/80 flex flex-col justify-between hover:-translate-y-2 hover:shadow-2xl hover:shadow-[#1E3A8A]/25 transition-all duration-300 group"
          >
            <div>
              {/* Header Badge & Title */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="size-13 rounded-2xl bg-[#1E3A8A] text-white flex items-center justify-center shadow-lg shadow-[#1E3A8A]/30 group-hover:scale-105 transition-transform">
                    <Laptop size={26} />
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

              {/* Inner Animation Area for Web Portal (Faculty Live Console - Content Driven Height) */}
              <div className="relative w-full max-w-[96%] mx-auto rounded-2xl bg-linear-to-br from-[#F0F9FF] via-[#E0F2FE]/50 to-[#F8FAFC] p-3.5 sm:p-4 mb-5 overflow-hidden border border-blue-200/90 shadow-xs text-[#111827] flex flex-col space-y-3">
                
                {/* Header bar inside panel */}
                <div className="flex items-center justify-between border-b border-blue-200/80 pb-2 text-[11px] font-mono text-[#1E3A8A]">
                  <span className="flex items-center gap-1.5 font-extrabold">
                    <Activity size={13} className="text-[#0EA5E9] animate-pulse" /> FACULTY LIVE CONSOLE
                  </span>
                  <span className="text-emerald-700 font-extrabold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[10px]">
                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse" /> ONLINE
                  </span>
                </div>

                {/* Active Class & Live Attendance Card */}
                <div className="space-y-2.5">
                  
                  {/* Active Class Highlight Box */}
                  <div className="rounded-xl bg-white border border-blue-200/80 p-3 shadow-2xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono font-extrabold text-[#0EA5E9] uppercase tracking-wider">Current Period • Room 304</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-mono font-extrabold border border-emerald-200 flex items-center gap-1">
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-ping" /> LIVE SESSION
                      </span>
                    </div>
                    <div className="text-sm font-extrabold text-[#111827]">CSE-A • Data Structures</div>
                    <div className="text-[11px] text-slate-500 font-medium mt-0.5">10:00 AM — 10:50 AM</div>

                    {/* Attendance Stats Bar */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 font-mono uppercase font-semibold block">Real-time Present</span>
                        <span className="text-base font-extrabold font-mono text-emerald-600">{checkedInCount} / 50</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 font-mono uppercase font-semibold block">Attendance Rate</span>
                        <span className="text-base font-extrabold font-mono text-[#1E3A8A]">{Math.round((checkedInCount / 50) * 100)}%</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden border border-slate-200/60">
                      <motion.div
                        animate={{ width: `${(checkedInCount / 50) * 100}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="h-full bg-linear-to-r from-[#0EA5E9] to-[#1E3A8A] rounded-full"
                      />
                    </div>
                  </div>

                  {/* Today's Schedule Mini-Table */}
                  <div className="rounded-xl bg-white/90 border border-blue-100 p-2.5 space-y-1.5 text-xs font-medium shadow-2xs">
                    <div className="text-[10px] font-mono font-extrabold text-slate-500 uppercase tracking-wider mb-1">Today's Faculty Schedule</div>
                    
                    <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 border border-slate-200/60 text-[11px]">
                      <span className="font-mono text-slate-500 font-semibold">09:00 AM</span>
                      <span className="font-bold text-slate-700">Mathematics IV</span>
                      <span className="text-emerald-600 font-mono font-extrabold text-[10px]">✓ COMPLETED</span>
                    </div>

                    <div className="flex items-center justify-between p-1.5 rounded-lg bg-[#0EA5E9]/10 border border-[#0EA5E9]/30 text-[11px]">
                      <span className="font-mono text-[#1E3A8A] font-bold">10:00 AM</span>
                      <span className="font-extrabold text-[#111827]">Data Structures</span>
                      <span className="text-emerald-600 font-mono font-extrabold text-[10px] flex items-center gap-1">
                        ● IN PROGRESS
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 border border-slate-200/60 text-[11px]">
                      <span className="font-mono text-slate-500 font-semibold">11:00 AM</span>
                      <span className="font-medium text-slate-600">Computer Networks</span>
                      <span className="text-slate-500 font-mono text-[10px]">UPCOMING</span>
                    </div>
                  </div>

                </div>

                {/* Footer Bar inside animation area */}
                <div className="flex items-center justify-between border-t border-blue-200/80 pt-2 text-[10px] font-mono text-slate-500">
                  <span>Automated Class Roster</span>
                  <span className="text-[#1E3A8A] font-bold">NNRG CSE DEPT</span>
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

            <div className="mt-7 pt-4 border-t border-slate-200/60 flex items-center justify-between text-xs font-bold text-slate-600">
              <span>Next.js 16 Web Management</span>
              <Link href="/login" className="text-[#1E3A8A] font-extrabold hover:text-[#6D28D9] underline">
                Sign In to Admin Portal →
              </Link>
            </div>
          </motion.div>

          {/* CARD 2: Flutter Mobile App */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="glass-card rounded-3xl p-5 sm:p-7 border border-white/80 flex flex-col justify-between hover:-translate-y-2 hover:shadow-2xl hover:shadow-[#6D28D9]/25 transition-all duration-300 group"
          >
            <div>
              {/* Header Badge & Title */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="size-13 rounded-2xl bg-[#6D28D9] text-white flex items-center justify-center shadow-lg shadow-[#6D28D9]/30 group-hover:scale-105 transition-transform">
                    <Smartphone size={26} />
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

              {/* Inner Animation Area for Flutter Mobile App (Student Mobile Dashboard - LIGHT LAVENDER THEME) */}
              <div className="relative w-full max-w-[96%] mx-auto rounded-2xl bg-linear-to-br from-[#F5F3FF] via-[#EDE9FE]/50 to-[#F8FAFC] p-3.5 sm:p-4 mb-5 overflow-hidden border border-purple-200/90 shadow-xs text-[#111827] flex flex-col space-y-3">
                
                {/* Header bar inside animation area */}
                <div className="flex items-center justify-between border-b border-purple-200/80 pb-2 text-[11px] font-mono text-[#6D28D9]">
                  <span className="flex items-center gap-1.5 font-extrabold">
                    <Smartphone size={13} className="text-[#6D28D9]" /> STUDENT DASHBOARD
                  </span>
                  <span className="text-emerald-700 font-extrabold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[10px]">
                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse" /> NNRG APP ACTIVE
                  </span>
                </div>

                {/* Student Profile & Attendance Overview */}
                <div className="space-y-2.5">

                  {/* Student Profile Header */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-purple-200/80 shadow-2xs">
                    <div>
                      <div className="text-xs font-extrabold text-[#111827] flex items-center gap-1">
                        Good Morning, Rahul 👋
                      </div>
                      <div className="text-[10px] text-[#6D28D9] font-mono font-semibold">217R1A0588 • CSE-A • Semester VI</div>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-mono font-extrabold border border-emerald-200">
                        ELIGIBLE
                      </span>
                    </div>
                  </div>

                  {/* Overall Attendance Rate Metric (Refined Light Gradient Card) */}
                  <div className="rounded-xl bg-linear-to-r from-purple-50/90 via-indigo-50/80 to-blue-50/90 border border-purple-300/70 p-3 text-center relative overflow-hidden shadow-2xs">
                    <div className="text-[10px] font-mono font-extrabold text-[#6D28D9] uppercase tracking-wider">Overall Semester Attendance</div>
                    <div className="text-2xl font-black font-mono mt-0.5 tracking-tight flex items-center justify-center gap-1">
                      <span className="bg-linear-to-r from-[#6D28D9] to-[#0EA5E9] bg-clip-text text-transparent">92.4%</span>
                    </div>
                    <div className="w-full bg-white rounded-full h-1.5 mt-2 overflow-hidden p-0.5 border border-purple-200/80">
                      <div className="h-full bg-linear-to-r from-[#6D28D9] to-emerald-500 rounded-full w-[92.4%]" />
                    </div>
                  </div>

                  {/* Today's Attendance Log */}
                  <div className="rounded-xl bg-white border border-purple-100 p-2.5 space-y-1.5 text-xs font-medium shadow-2xs">
                    <div className="text-[10px] font-mono font-extrabold text-slate-500 uppercase tracking-wider mb-1">Today's Class Status</div>
                    
                    <div className="flex items-center justify-between p-1.5 rounded-lg bg-emerald-50/70 border border-emerald-200/70 text-[11px]">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={13} className="text-emerald-600" />
                        <span className="font-bold text-slate-800">Mathematics IV</span>
                      </div>
                      <span className="text-emerald-700 font-mono font-extrabold text-[10px]">PRESENT</span>
                    </div>

                    <div className="flex items-center justify-between p-1.5 rounded-lg bg-emerald-50/70 border border-emerald-200/70 text-[11px]">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={13} className="text-emerald-600" />
                        <span className="font-extrabold text-[#111827]">Data Structures</span>
                      </div>
                      <span className="text-emerald-700 font-mono font-extrabold text-[10px]">PRESENT</span>
                    </div>

                    <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 border border-slate-200/60 text-[11px]">
                      <div className="flex items-center gap-2">
                        <div className="size-3 rounded-full border border-slate-400" />
                        <span className="font-medium text-slate-600">Computer Networks</span>
                      </div>
                      <span className="text-slate-500 font-mono text-[10px]">NEXT CLASS</span>
                    </div>
                  </div>

                </div>

                {/* Footer Bar inside animation area */}
                <div className="flex items-center justify-between border-t border-purple-200/80 pt-2 text-[10px] font-mono text-slate-500">
                  <span>Recent: Present • Present • Present</span>
                  <span className="text-emerald-700 font-bold">100% VERIFIED</span>
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
