"use client"

import { motion } from "framer-motion"
import { QrCode, ScanFace, MapPin, ShieldCheck, Sparkles, CheckCircle2, Lock } from "lucide-react"
import { FALogo } from "@/components/fa-logo"

const statusBadges = [
  {
    id: "live-sec",
    label: "LIVE SECURITY",
    subtext: "256-bit Encrypted",
    icon: ShieldCheck,
    color: "text-blue-700 bg-white/95 border-blue-200 shadow-blue-500/10",
    initialY: 0,
    animateY: [-3, 3, -3],
    duration: 5.5,
  },
  {
    id: "bio-match",
    label: "99.8% MATCH",
    subtext: "Biometric Liveness",
    icon: ScanFace,
    color: "text-purple-700 bg-white/95 border-purple-200 shadow-purple-500/10",
    initialY: 0,
    animateY: [3, -3, 3],
    duration: 6,
  },
  {
    id: "geofence",
    label: "GEOFENCE LOCKED",
    subtext: "Campus Boundary",
    icon: MapPin,
    color: "text-emerald-700 bg-white/95 border-emerald-200 shadow-emerald-500/10",
    initialY: 0,
    animateY: [-4, 2, -4],
    duration: 6.5,
  },
]

export function SecurityVisualization() {
  return (
    <div className="relative flex flex-col items-center justify-between w-full h-full max-w-lg mx-auto py-4 px-4 text-slate-800 select-none">
      {/* Brand Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex flex-col items-center gap-2.5 text-center z-20"
      >
        <div className="p-3 rounded-2xl bg-white shadow-md shadow-blue-500/10 border border-blue-100">
          <FALogo size="lg" variant="blue" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Factor Attendance
          </h1>
          <p className="text-sm font-medium text-slate-600 mt-0.5">
            Smart Attendance for NNRG College
          </p>
        </div>
      </motion.div>

      {/* Central Light Glass Shield Visualization (Shifted Upward for Breathing Space) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
        className="relative my-4 sm:my-6 w-full max-w-[310px] aspect-square flex items-center justify-center z-10"
      >
        {/* Soft Background Radial Light */}
        <div className="absolute inset-0 rounded-full bg-radial from-blue-400/25 via-cyan-300/15 to-transparent blur-2xl pointer-events-none" />

        {/* Outer Delicate Rotating Ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
          className="absolute inset-2 sm:inset-4 rounded-full border border-dashed border-blue-300/50 pointer-events-none"
        />

        {/* Central White Glass Shield Panel */}
        <div className="relative size-44 sm:size-48 rounded-3xl bg-white/85 backdrop-blur-xl border border-white shadow-xl shadow-blue-600/15 flex flex-col items-center justify-center p-5 overflow-hidden">
          {/* Gentle Subtle Laser Scan Beam */}
          <motion.div
            animate={{ y: [-80, 80, -80], opacity: [0.25, 0.65, 0.25] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute left-0 right-0 h-0.5 bg-linear-to-r from-transparent via-cyan-500 to-transparent shadow-[0_0_10px_#0ea5e9] pointer-events-none z-20"
          />

          {/* Internal Shield Content */}
          <div className="relative z-10 flex flex-col items-center justify-center gap-2.5 text-center">
            <div className="relative p-3 rounded-2xl bg-linear-to-br from-blue-50 to-cyan-50 border border-blue-200/70 shadow-sm">
              <ShieldCheck className="size-9 text-blue-600" />
              <Sparkles className="absolute -top-1 -right-1 size-3.5 text-cyan-500 animate-pulse" />
            </div>

            <div className="flex flex-col items-center">
              <span className="text-[11px] font-bold tracking-wider text-blue-900 uppercase">
                Triple Layer Protection
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5 font-medium">
                QR • Face AI • GPS
              </span>
            </div>
          </div>
        </div>

        {/* 3 Non-Repetitive Floating Telemetry Badges */}
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-1 z-20">
          {/* Top Left Badge: LIVE SECURITY */}
          <motion.div
            initial={{ y: statusBadges[0].initialY }}
            animate={{ y: statusBadges[0].animateY }}
            transition={{ duration: statusBadges[0].duration, repeat: Infinity, ease: "easeInOut" }}
            className="self-start -mt-2 -ml-3 hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border backdrop-blur-md shadow-md text-xs font-semibold text-blue-900 bg-white/95 border-blue-100"
          >
            <div className="p-1 rounded-md bg-blue-50 text-blue-600">
              <Lock className="size-3.5" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                {statusBadges[0].label}
                <CheckCircle2 className="size-3 text-emerald-500" />
              </span>
              <span className="text-[9px] text-slate-500 font-medium">
                {statusBadges[0].subtext}
              </span>
            </div>
          </motion.div>

          {/* Middle Right Badge: 99.8% MATCH */}
          <motion.div
            initial={{ y: statusBadges[1].initialY }}
            animate={{ y: statusBadges[1].animateY }}
            transition={{ duration: statusBadges[1].duration, repeat: Infinity, ease: "easeInOut" }}
            className="self-end -mr-4 hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border backdrop-blur-md shadow-md text-xs font-semibold text-purple-900 bg-white/95 border-purple-100"
          >
            <div className="p-1 rounded-md bg-purple-50 text-purple-600">
              <ScanFace className="size-3.5" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                {statusBadges[1].label}
                <CheckCircle2 className="size-3 text-emerald-500" />
              </span>
              <span className="text-[9px] text-slate-500 font-medium">
                {statusBadges[1].subtext}
              </span>
            </div>
          </motion.div>

          {/* Bottom Left Badge: GEOFENCE LOCKED */}
          <motion.div
            initial={{ y: statusBadges[2].initialY }}
            animate={{ y: statusBadges[2].animateY }}
            transition={{ duration: statusBadges[2].duration, repeat: Infinity, ease: "easeInOut" }}
            className="self-start -mb-2 -ml-2 hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border backdrop-blur-md shadow-md text-xs font-semibold text-emerald-900 bg-white/95 border-emerald-100"
          >
            <div className="p-1 rounded-md bg-emerald-50 text-emerald-600">
              <MapPin className="size-3.5" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                {statusBadges[2].label}
                <CheckCircle2 className="size-3 text-emerald-500" />
              </span>
              <span className="text-[9px] text-slate-500 font-medium">
                {statusBadges[2].subtext}
              </span>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Bottom Compact Security Status Strip (Separated with breathing room) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
        className="w-full mt-4 z-20"
      >
        <div className="grid grid-cols-3 gap-2 p-2 rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-md">
          <div className="flex flex-col items-center gap-0.5 text-center p-1.5 rounded-xl bg-blue-50/70 border border-blue-100">
            <div className="flex items-center gap-1 text-blue-700">
              <QrCode className="size-3.5" />
              <span className="text-[11px] font-semibold">QR Check</span>
            </div>
            <div className="flex items-center gap-1 text-[9px] font-medium text-emerald-600">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>ACTIVE</span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-0.5 text-center p-1.5 rounded-xl bg-purple-50/70 border border-purple-100">
            <div className="flex items-center gap-1 text-purple-700">
              <ScanFace className="size-3.5" />
              <span className="text-[11px] font-semibold">Face AI</span>
            </div>
            <div className="flex items-center gap-1 text-[9px] font-medium text-emerald-600">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>ACTIVE</span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-0.5 text-center p-1.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
            <div className="flex items-center gap-1 text-emerald-700">
              <MapPin className="size-3.5" />
              <span className="text-[11px] font-semibold">GPS Secure</span>
            </div>
            <div className="flex items-center gap-1 text-[9px] font-medium text-emerald-600">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>ACTIVE</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
