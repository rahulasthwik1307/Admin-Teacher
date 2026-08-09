"use client"

import { useEffect, useState, useRef } from "react"
import { motion, useInView } from "framer-motion"
import { Star, Shield, Users, CheckCircle, Award, Quote, Check } from "lucide-react"

const testimonials = [
  {
    quote: "This system reduced our proxy attendance by 100% in the very first semester. The triple-layer security is impenetrable.",
    name: "Dr. Sarah Chen",
    role: "Dean of Students",
    institution: "Imperial University",
    initials: "SC",
    color: "#1E3A8A",
  },
  {
    quote: "The QR verification is seamless. Our teachers love how easy it is to start a session without wasting 15 minutes taking roll call.",
    name: "Prof. James Wilson",
    role: "Head of IT Infrastructure",
    institution: "Tech Institute of Science",
    initials: "JW",
    color: "#6D28D9",
  },
  {
    quote: "We've seen a 98.7% accuracy rate since implementation. Students appreciate the quick face scan check-in process.",
    name: "Dr. Michael Roberts",
    role: "Campus Operations Director",
    institution: "National Research Academy",
    initials: "MR",
    color: "#0EA5E9",
  },
]

const institutionLogos = [
  { name: "Oxford Tech", code: "OXF" },
  { name: "MIT Campus", code: "MTC" },
  { name: "Stanford Edu", code: "STE" },
  { name: "Cambridge Sci", code: "CMS" },
  { name: "NNRG College", code: "NNRG" },
]

export function SocialProofSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })

  /* ── Number Counters ── */
  const [students, setStudents] = useState(0)
  const [accuracy, setAccuracy] = useState(0)
  const [incidents, setIncidents] = useState(100)

  useEffect(() => {
    if (!isInView) return

    let sVal = 0
    const sTimer = setInterval(() => {
      sVal += 20
      if (sVal >= 500) {
        setStudents(500)
        clearInterval(sTimer)
      } else {
        setStudents(sVal)
      }
    }, 40)

    let aVal = 0
    const aTimer = setInterval(() => {
      aVal += 2.5
      if (aVal >= 98.7) {
        setAccuracy(98.7)
        clearInterval(aTimer)
      } else {
        setAccuracy(Number(aVal.toFixed(1)))
      }
    }, 35)

    let iVal = 100
    const iTimer = setInterval(() => {
      iVal -= 5
      if (iVal <= 0) {
        setIncidents(0)
        clearInterval(iTimer)
      } else {
        setIncidents(iVal)
      }
    }, 35)

    return () => {
      clearInterval(sTimer)
      clearInterval(aTimer)
      clearInterval(iTimer)
    }
  }, [isInView])

  return (
    <section
      id="social-proof"
      ref={sectionRef}
      className="relative py-20 sm:py-28 px-4 sm:px-6 md:px-8 bg-linear-to-b from-[#F9FAFB] via-[#F3F0FF] to-[#F9FAFB]"
    >
      <div className="mx-auto max-w-7xl">
        
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-[#0EA5E9]/30 bg-[#0EA5E9]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#1E3A8A]">
            <Award size={14} className="text-[#0EA5E9]" />
            Campus Proven Impact
          </div>
          
          <h2 className="text-3xl font-extrabold tracking-tight text-[#111827] sm:text-4xl md:text-5xl">
            Trusted by Leaders in Higher Education
          </h2>
          
          <p className="mt-4 max-w-xl mx-auto text-sm sm:text-base text-slate-600 leading-relaxed">
            See how administrators and faculty members across the globe rely on Factor Attendance 
            to secure their academic classrooms.
          </p>
        </div>

        {/* Institution Logo Badges Bar */}
        <div className="mb-16 flex flex-wrap items-center justify-center gap-4 sm:gap-8 opacity-85">
          {institutionLogos.map((logo) => (
            <div
              key={logo.name}
              className="flex items-center gap-2.5 rounded-2xl border border-slate-200/80 bg-white/70 px-5 py-2.5 shadow-xs transition-all duration-300 hover:border-[#6D28D9]/40 hover:bg-white hover:shadow-md"
            >
              <div className="size-8 rounded-xl bg-[#1E3A8A]/10 text-[#1E3A8A] flex items-center justify-center font-extrabold text-xs">
                {logo.code}
              </div>
              <span className="text-xs sm:text-sm font-bold text-[#111827]">{logo.name}</span>
            </div>
          ))}
        </div>

        {/* Testimonials Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {testimonials.map((t, idx) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, x: idx % 2 === 0 ? -30 : 30 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: idx * 0.15 }}
              className="glass-card rounded-3xl p-8 flex flex-col justify-between border border-white/80 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 relative"
            >
              <Quote className="absolute top-6 right-6 size-10 text-slate-200 pointer-events-none" />

              <div>
                {/* 5-Star Rating & Verified Badge */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-1 text-amber-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={15} fill="currentColor" />
                    ))}
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600">
                    <Check size={12} /> Verified
                  </span>
                </div>

                <p className="text-sm text-slate-700 leading-relaxed italic mb-6">
                  "{t.quote}"
                </p>
              </div>

              {/* Author Details */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-200/60">
                <div
                  className="size-11 rounded-2xl flex items-center justify-center text-white font-extrabold text-sm shadow-md"
                  style={{ backgroundColor: t.color }}
                >
                  {t.initials}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-sm font-bold text-[#111827]">{t.name}</span>
                  <span className="text-xs font-medium text-slate-500">{t.role} • {t.institution}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Statistics Metric Bar */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="glass-card rounded-3xl p-8 border border-white/80 shadow-lg grid grid-cols-1 md:grid-cols-3 gap-8 text-center"
        >
          {/* Metric 1 */}
          <div className="flex items-center justify-center gap-4">
            <div className="size-14 rounded-2xl bg-[#1E3A8A]/10 text-[#1E3A8A] flex items-center justify-center shrink-0">
              <Users size={28} />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-3xl font-extrabold text-[#111827] tracking-tight">
                {students}+
              </span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Students Secured
              </span>
            </div>
          </div>

          {/* Metric 2 */}
          <div className="flex items-center justify-center gap-4 md:border-x border-slate-200/60 md:px-6">
            <div className="size-14 rounded-2xl bg-[#6D28D9]/10 text-[#6D28D9] flex items-center justify-center shrink-0">
              <CheckCircle size={28} />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-3xl font-extrabold text-[#111827] tracking-tight">
                {accuracy}%
              </span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Verification Accuracy
              </span>
            </div>
          </div>

          {/* Metric 3 */}
          <div className="flex items-center justify-center gap-4">
            <div className="size-14 rounded-2xl bg-[#0EA5E9]/10 text-[#0EA5E9] flex items-center justify-center shrink-0">
              <Shield size={28} />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-3xl font-extrabold text-[#111827] tracking-tight">
                {incidents}
              </span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Proxy Incidents
              </span>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  )
}
