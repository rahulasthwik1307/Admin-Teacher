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
    <div id="stats" ref={ref} className="relative z-20 w-full overflow-hidden bg-transparent -mt-8 mb-3 sm:-mt-12 sm:mb-4">
      
      {/* Floating Glassmorphism Bar */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="backdrop-blur-lg bg-white/80 rounded-3xl p-6 sm:p-8 shadow-xl shadow-[#0EA5E9]/15 border border-white/80 grid grid-cols-1 md:grid-cols-3 gap-6 text-center hover:shadow-2xl hover:shadow-[#0EA5E9]/25 transition-all duration-300"
        >
          {/* Stat 1: 99.9% System Accuracy */}
          <div className="flex flex-col items-center p-4 rounded-2xl transition-all duration-300 hover:bg-white/60">
            <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-[#0EA5E9]/10 text-[#0EA5E9] shadow-sm">
              <Target size={26} />
            </div>
            <span className="text-3xl sm:text-4xl font-extrabold text-[#111827] tracking-tight">
              🎯 {accuracy}%
            </span>
            <span className="mt-1 text-xs font-extrabold uppercase tracking-wider text-[#1E3A8A]">
              System Accuracy
            </span>
          </div>

          {/* Stat 2: 15s Dynamic QR Refresh */}
          <div className="flex flex-col items-center p-4 rounded-2xl border-y md:border-y-0 md:border-x border-slate-200/70 transition-all duration-300 hover:bg-white/60">
            <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-[#6D28D9]/10 text-[#6D28D9] shadow-sm">
              <RefreshCw size={24} className="animate-spin-slow" />
            </div>
            <span className="text-3xl sm:text-4xl font-extrabold text-[#111827] tracking-tight">
              🔄 {refreshTimer}s
            </span>
            <span className="mt-1 text-xs font-extrabold uppercase tracking-wider text-[#6D28D9]">
              Dynamic QR Refresh
            </span>
          </div>

          {/* Stat 3: 0 Proxy Incidents */}
          <div className="flex flex-col items-center p-4 rounded-2xl transition-all duration-300 hover:bg-white/60">
            <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 shadow-sm">
              <ShieldCheck size={26} />
            </div>
            <span className="text-3xl sm:text-4xl font-extrabold text-[#111827] tracking-tight">
              🚫 {proxyIncidents}
            </span>
            <span className="mt-1 text-xs font-extrabold uppercase tracking-wider text-emerald-600">
              Proxy Incidents
            </span>
          </div>
        </motion.div>
      </div>

    </div>
  )
}
