"use client"

import { useEffect, useState, useRef } from "react"
import { motion, useInView } from "framer-motion"
import { ShieldCheck, RefreshCw, Target } from "lucide-react"

export function TransitionDivider() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-80px" })

  const [accuracy, setAccuracy] = useState(0)
  const [refreshTimer, setRefreshTimer] = useState(0)
  const [proxyIncidents, setProxyIncidents] = useState(100)

  useEffect(() => {
    if (!isInView) return

    // Accuracy 0 -> 99.9%
    let accVal = 0
    const accInterval = setInterval(() => {
      accVal += 3.3
      if (accVal >= 99.9) {
        setAccuracy(99.9)
        clearInterval(accInterval)
      } else {
        setAccuracy(Number(accVal.toFixed(1)))
      }
    }, 30)

    // Refresh 0 -> 15s
    let timeVal = 0
    const timeInterval = setInterval(() => {
      timeVal += 1
      if (timeVal >= 15) {
        setRefreshTimer(15)
        clearInterval(timeInterval)
      } else {
        setRefreshTimer(timeVal)
      }
    }, 70)

    // Proxy Incidents 100 -> 0
    let incidentVal = 100
    const incidentInterval = setInterval(() => {
      incidentVal -= 5
      if (incidentVal <= 0) {
        setProxyIncidents(0)
        clearInterval(incidentInterval)
      } else {
        setProxyIncidents(incidentVal)
      }
    }, 35)

    return () => {
      clearInterval(accInterval)
      clearInterval(timeInterval)
      clearInterval(incidentInterval)
    }
  }, [isInView])

  return (
    <div id="stats" ref={ref} className="hidden lg:block relative z-30 w-full bg-transparent -my-11 lg:-my-14 pointer-events-auto">
      
      {/* Floating Elevated Stats Panel - Bridging Hero & About Sections */}
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-3xl p-4 sm:p-5 shadow-[0_2px_4px_0_rgba(15,23,42,0.04),0_8px_20px_-4px_rgba(15,23,42,0.08),0_20px_44px_-10px_rgba(30,58,138,0.14),0_32px_64px_-16px_rgba(15,23,42,0.08),inset_0_1px_1px_0_#FFFFFF,inset_0_-1px_1px_0_rgba(203,213,225,0.35)] border border-white/95 ring-1 ring-slate-900/6 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 text-center transition-all duration-300 hover:shadow-[0_4px_8px_0_rgba(15,23,42,0.06),0_12px_28px_-6px_rgba(15,23,42,0.1),0_28px_56px_-12px_rgba(30,58,138,0.18),0_44px_88px_-20px_rgba(15,23,42,0.12),inset_0_1px_1px_0_#FFFFFF] hover:-translate-y-0.5"
        >
          {/* Stat 1: 99.9% System Accuracy (Cyan/Blue Accent) */}
          <div className="flex flex-col items-center py-3 px-4 sm:py-3.5 sm:px-6 transition-all duration-200 hover:bg-slate-50/80 rounded-2xl group">
            <div className="mb-2 relative flex size-10 items-center justify-center rounded-xl bg-sky-50 text-[#0284C7] border border-sky-200/80 shadow-2xs group-hover:scale-105 transition-transform">
              <Target size={20} />
              <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-[#0EA5E9] animate-ping" />
            </div>
            <span className="text-2xl sm:text-3xl font-extrabold text-[#111827] font-mono tracking-tight flex items-center gap-1.5">
              <span>🎯</span> {accuracy}%
            </span>
            <span className="mt-0.5 text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-[#0284C7]">
              System Accuracy
            </span>
          </div>

          {/* Stat 2: 15s Dynamic QR Refresh (Purple Accent) */}
          <div className="flex flex-col items-center py-3 px-4 sm:py-3.5 sm:px-6 transition-all duration-200 hover:bg-slate-50/80 rounded-2xl group">
            <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-purple-50 text-[#6D28D9] border border-purple-200/80 shadow-2xs group-hover:scale-105 transition-transform">
              <RefreshCw size={19} className="animate-spin-slow" />
            </div>
            <span className="text-2xl sm:text-3xl font-extrabold text-[#111827] font-mono tracking-tight flex items-center gap-1.5">
              <span>🔄</span> {refreshTimer}s
            </span>
            <span className="mt-0.5 text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-[#6D28D9]">
              Dynamic QR Refresh
            </span>
          </div>

          {/* Stat 3: 0 Proxy Incidents (Emerald Accent) */}
          <div className="flex flex-col items-center py-3 px-4 sm:py-3.5 sm:px-6 transition-all duration-200 hover:bg-slate-50/80 rounded-2xl group">
            <div className="mb-2 relative flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 shadow-2xs group-hover:scale-105 transition-transform">
              <ShieldCheck size={20} />
              <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <span className="text-2xl sm:text-3xl font-extrabold text-[#111827] font-mono tracking-tight flex items-center gap-1.5">
              <span>🛡️</span> {proxyIncidents}
            </span>
            <span className="mt-0.5 text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-emerald-600">
              Proxy Incidents
            </span>
          </div>
        </motion.div>
      </div>

    </div>
  )
}
