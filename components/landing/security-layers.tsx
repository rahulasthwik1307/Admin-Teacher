"use client"

import { useState, useEffect, useRef } from "react"
import { motion, useInView } from "framer-motion"
import { QrCode, ScanFace, MapPin, CheckCircle2, ShieldCheck, Timer, Compass, Layers, Navigation } from "lucide-react"
import { RealQRCode } from "./real-qr-code"

export function SecurityLayers() {
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true, margin: "-100px" })
  const [hoveredCard, setHoveredCard] = useState<number | null>(null)

  /* ── 15s Countdown Ring Timer & QR Seed for Card 1 ── */
  const [countdown, setCountdown] = useState(12)
  const [qrSeed, setQrSeed] = useState(10)

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setQrSeed((s) => s + 1)
          return 15
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  /* ── Card 2 Face Confidence Countup ── */
  const [faceScore, setFaceScore] = useState(94.2)
  useEffect(() => {
    if (!isInView) return
    const interval = setInterval(() => {
      setFaceScore((prev) => {
        if (prev >= 99.8) {
          return 99.8
        }
        return Number((prev + 0.4).toFixed(1))
      })
    }, 200)
    return () => clearInterval(interval)
  }, [isInView])

  /* ── Live GPS Coordinates Ticker for Card 3 ── */
  const [lat, setLat] = useState(17.4487)
  const [lng, setLng] = useState(78.3907)
  useEffect(() => {
    const interval = setInterval(() => {
      setLat((prev) => Number((17.4487 + (Math.random() * 0.0004 - 0.0002)).toFixed(4)))
      setLng((prev) => Number((78.3907 + (Math.random() * 0.0004 - 0.0002)).toFixed(4)))
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  /* ── 3D Tilt Hook for Cards ── */
  const [tilts, setTilts] = useState<Record<number, { rx: number; ry: number }>>({})

  const handleMouseMoveCard = (idx: number, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left - rect.width / 2
    const y = e.clientY - rect.top - rect.height / 2
    setTilts((prev) => ({
      ...prev,
      [idx]: {
        rx: (-y / rect.height) * 4,
        ry: (x / rect.width) * 4,
      },
    }))
  }

  const handleMouseLeaveCard = (idx: number) => {
    setTilts((prev) => ({
      ...prev,
      [idx]: { rx: 0, ry: 0 },
    }))
  }

  return (
    <section id="how-it-works" className="relative pt-4 sm:pt-5 pb-10 sm:pb-12 px-4 sm:px-6 md:px-8 bg-transparent">
      
      {/* Background Subtle Glow */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-150 rounded-full bg-[#0EA5E9]/5 blur-3xl -z-10" />

      <div className="mx-auto max-w-7xl">
        
        {/* Section Header */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-[#6D28D9]/20 bg-[#6D28D9]/10 px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest text-[#6D28D9]">
            <Layers size={13} />
            Triple Verification Defense
          </div>
          
          <h2 className="text-3xl font-extrabold tracking-tight text-[#111827] sm:text-4xl md:text-5xl">
            Three Layers of Iron-Clad Security
          </h2>
          
          <div className="mt-3 mx-auto h-1.5 w-28 rounded-full bg-linear-to-r from-[#1E3A8A] via-[#6D28D9] to-[#0EA5E9]" />

          <p className="mt-4 max-w-xl mx-auto text-sm sm:text-base text-slate-600 leading-relaxed font-medium">
            Every attendance check-in must pass dynamic QR validation, facial recognition AI, and physical GPS boundary verification in real time.
          </p>
        </div>

        {/* 3 Horizontal Cards Container */}
        <div ref={containerRef} className="relative grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          
          {/* Flow Line 1 -> 2 -> 3 (Desktop Animated Dashed Line) */}
          <div className="hidden lg:block pointer-events-none absolute inset-0 z-0 top-1/2 -translate-y-1/2">
            <svg className="w-full h-12" fill="none">
              <path
                d="M 32% 24 L 68% 24"
                stroke="#0EA5E9"
                strokeWidth="2.5"
                className="animated-dash-flow opacity-90"
              />
            </svg>
          </div>

          {/* CARD 1: DYNAMIC QR CODES (Resembles Phone QR Scanning Animation) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            onMouseEnter={() => setHoveredCard(1)}
            onMouseLeave={() => {
              setHoveredCard(null)
              handleMouseLeaveCard(1)
            }}
            onMouseMove={(e) => handleMouseMoveCard(1, e)}
            style={{
              transform: `perspective(1000px) rotateX(${tilts[1]?.rx || 0}deg) rotateY(${tilts[1]?.ry || 0}deg)`,
              transition: "transform 0.1s ease-out, filter 0.3s ease, opacity 0.3s ease",
            }}
            className={`glass-card rounded-3xl p-6 flex flex-col justify-between border border-white/80 transition-all duration-300 relative z-10 ${
              hoveredCard !== null && hoveredCard !== 1 ? "blur-[2px] opacity-60 scale-[0.98]" : "opacity-100 scale-100 hover:-translate-y-2 hover:shadow-2xl hover:shadow-[#1E3A8A]/20"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="size-13 rounded-2xl bg-[#1E3A8A] text-white flex items-center justify-center shadow-lg shadow-[#1E3A8A]/30">
                  <QrCode size={26} />
                </div>
                {/* Circular Security Score Indicator */}
                <div className="flex items-center gap-1.5 rounded-full bg-[#1E3A8A]/10 border border-[#1E3A8A]/20 px-3 py-1 text-xs font-extrabold text-[#1E3A8A]">
                  <ShieldCheck size={14} className="text-[#0EA5E9]" /> Score: 99.9%
                </div>
              </div>

              <h3 className="text-xl font-extrabold text-[#111827] mb-1.5">
                1. Dynamic QR Codes
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-5 font-medium">
                Teachers broadcast a dynamic QR code that continuously rotates every 15 seconds. Prevents screenshots and static proxy sharing.
              </p>

              {/* Image Container - Soft Light Cyan / Ice-Blue Tinted Background */}
              <div className="relative w-full max-w-[260px] sm:max-w-[270px] aspect-square mx-auto rounded-2xl bg-linear-to-br from-[#E0F2FE] via-[#F0F9FF] to-[#DBEAFE] p-3.5 flex flex-col items-center justify-center overflow-hidden border border-[#38BDF8]/60 shadow-md shadow-sky-400/10">
                {/* QR Subject Box - Laser scan line is BOUNDED ONLY INSIDE THIS QR SUBJECT */}
                <div className="relative rounded-2xl p-2.5 bg-white border border-sky-300/60 overflow-hidden shadow-lg z-10 my-auto">
                  {/* Laser scan line moving ONLY across the QR code */}
                  <div className="scan-laser-line z-10" />
                  <RealQRCode size={175} seed={qrSeed} darkColor="#1E3A8A" lightColor="#FFFFFF" className="shadow-xs z-0" />
                </div>

                {/* Refresh Countdown Badge - Positioned Down with Comfortable Breathing Space */}
                <div className="mt-auto mb-0.5 z-10 flex items-center gap-1.5 text-[11px] font-mono text-[#0EA5E9] bg-slate-900/90 px-3.5 py-1 rounded-full border border-sky-400/40 shadow-xs">
                  <Timer size={13} className="animate-spin-slow text-[#0EA5E9]" />
                  <span>Refresh in: <strong className="text-white text-xs">{countdown}s</strong></span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3.5 border-t border-slate-200/60 flex items-center justify-between text-xs font-bold text-[#1E3A8A]">
              <span>Dynamic Session Token</span>
              <CheckCircle2 size={16} className="text-emerald-500" />
            </div>
          </motion.div>

          {/* Mobile Flow Connector 1 -> 2 */}
          <div className="lg:hidden flex justify-center py-1 text-[#0EA5E9]">
            <svg className="w-6 h-8" fill="none">
              <path d="M 12 0 L 12 32" stroke="#0EA5E9" strokeWidth="2.5" className="animated-dash-flow" />
            </svg>
          </div>

          {/* CARD 2: FACE AI VERIFICATION (Scanning Grid ONLY on Image Area) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            onMouseEnter={() => setHoveredCard(2)}
            onMouseLeave={() => {
              setHoveredCard(null)
              handleMouseLeaveCard(2)
            }}
            onMouseMove={(e) => handleMouseMoveCard(2, e)}
            style={{
              transform: `perspective(1000px) rotateX(${tilts[2]?.rx || 0}deg) rotateY(${tilts[2]?.ry || 0}deg)`,
              transition: "transform 0.1s ease-out, filter 0.3s ease, opacity 0.3s ease",
            }}
            className={`glass-card rounded-3xl p-6 flex flex-col justify-between border border-white/80 transition-all duration-300 relative z-10 ${
              hoveredCard !== null && hoveredCard !== 2 ? "blur-[2px] opacity-60 scale-[0.98]" : "opacity-100 scale-100 hover:-translate-y-2 hover:shadow-2xl hover:shadow-[#6D28D9]/20"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="size-13 rounded-2xl bg-[#6D28D9] text-white flex items-center justify-center shadow-lg shadow-[#6D28D9]/30">
                  <ScanFace size={26} />
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-[#6D28D9]/10 border border-[#6D28D9]/20 px-3 py-1 text-xs font-extrabold text-[#6D28D9]">
                  <ShieldCheck size={14} className="text-[#0EA5E9]" /> Score: 99.8%
                </div>
              </div>

              <h3 className="text-xl font-extrabold text-[#111827] mb-1.5">
                2. Face AI Verification
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-5 font-medium">
                Instant biometric face matching via mobile camera. AI models verify live student identity against enrolled campus records.
              </p>

              {/* Image Container - Soft Light Lavender / Violet Tinted Background */}
              <div className="relative w-full max-w-[260px] sm:max-w-[270px] aspect-square mx-auto rounded-2xl bg-linear-to-br from-[#F3E8FF] via-[#FAF5FF] to-[#EDE9FE] p-3.5 flex flex-col items-center justify-center overflow-hidden border border-[#C084FC]/60 shadow-md shadow-purple-400/10">
                {/* Face Scanner Frame - Laser scan line is BOUNDED ONLY INSIDE THIS FRAME */}
                <div className="relative size-44 border-2 border-dashed border-[#6D28D9] rounded-2xl flex flex-col items-center justify-center bg-white/85 p-2 overflow-hidden z-10 my-auto shadow-md">
                  {/* Laser scan line moving ONLY inside face scanner frame */}
                  <div className="scan-laser-line z-10" />

                  {/* Scanning Grid Overlay ONLY on Face Area */}
                  <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,#6D28D9_1px,transparent_1px),linear-gradient(to_bottom,#6D28D9_1px,transparent_1px)] bg-[size:10px_10px]" />

                  <div className="absolute top-0 left-0 size-3.5 border-t-2 border-l-2 border-[#6D28D9]" />
                  <div className="absolute top-0 right-0 size-3.5 border-t-2 border-r-2 border-[#6D28D9]" />
                  <div className="absolute bottom-0 left-0 size-3.5 border-b-2 border-l-2 border-[#6D28D9]" />
                  <div className="absolute bottom-0 right-0 size-3.5 border-b-2 border-r-2 border-[#6D28D9]" />

                  {/* Cartoon Student Avatar Face with AI Biometric Facial Nodes */}
                  <div className="relative size-28 flex items-center justify-center z-10 my-auto">
                    {/* Vector Avatar SVG */}
                    <svg viewBox="0 0 100 100" className="size-full drop-shadow-md">
                      {/* Head Outline */}
                      <path d="M 25 38 C 25 15, 75 15, 75 38 C 75 42, 78 50, 75 62 C 70 78, 30 78, 25 62 Z" fill="#F3E8FF" stroke="#6D28D9" strokeWidth="3" />
                      {/* Hair Style */}
                      <path d="M 23 35 C 25 18, 50 12, 77 24 C 75 35, 68 25, 55 25 C 40 25, 30 35, 23 35 Z" fill="#6D28D9" />
                      {/* Ears */}
                      <circle cx="23" cy="48" r="5" fill="#E9D5FF" stroke="#6D28D9" strokeWidth="2.5" />
                      <circle cx="77" cy="48" r="5" fill="#E9D5FF" stroke="#6D28D9" strokeWidth="2.5" />
                      {/* Eyes */}
                      <circle cx="40" cy="46" r="3.5" fill="#1E3A8A" />
                      <circle cx="60" cy="46" r="3.5" fill="#1E3A8A" />
                      <circle cx="41.5" cy="44.5" r="1" fill="#FFFFFF" />
                      <circle cx="61.5" cy="44.5" r="1" fill="#FFFFFF" />
                      {/* Eyebrows */}
                      <path d="M 35 39 Q 40 37 45 40" stroke="#6D28D9" strokeWidth="2" strokeLinecap="round" fill="none" />
                      <path d="M 55 40 Q 60 37 65 39" stroke="#6D28D9" strokeWidth="2" strokeLinecap="round" fill="none" />
                      {/* Smile */}
                      <path d="M 42 60 Q 50 66 58 60" stroke="#6D28D9" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                    </svg>

                    {/* Biometric AI Facial Recognition Nodes (Pulsing Cyan Points) */}
                    <div className="absolute top-8 left-9 size-2 rounded-full bg-[#0EA5E9] shadow-xs animate-ping" />
                    <div className="absolute top-8 right-9 size-2 rounded-full bg-[#0EA5E9] shadow-xs animate-ping" />
                    <div className="absolute bottom-9 left-10 size-2 rounded-full bg-[#0EA5E9] shadow-xs animate-ping" />
                    <div className="absolute bottom-9 right-10 size-2 rounded-full bg-[#0EA5E9] shadow-xs animate-ping" />
                  </div>
                </div>

                <div className="mt-auto mb-0.5 z-10 flex items-center gap-1.5 text-[11px] font-mono font-bold text-emerald-300 bg-slate-900/90 px-3.5 py-1 rounded-full border border-purple-400/40 shadow-xs">
                  <CheckCircle2 size={13} className="text-emerald-400" />
                  <span>Confidence: <strong className="text-white">99.8%</strong></span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3.5 border-t border-slate-200/60 flex items-center justify-between text-xs font-bold text-[#6D28D9]">
              <span>Biometric Anti-Spoofing</span>
              <CheckCircle2 size={16} className="text-emerald-500" />
            </div>
          </motion.div>

          {/* Mobile Flow Connector 2 -> 3 */}
          <div className="lg:hidden flex justify-center py-1 text-[#0EA5E9]">
            <svg className="w-6 h-8" fill="none">
              <path d="M 12 0 L 12 32" stroke="#0EA5E9" strokeWidth="2.5" className="animated-dash-flow" />
            </svg>
          </div>

          {/* CARD 3: GEOFENCE SECURITY (Vector Location Pin Silhouette in Light Mint-Teal Container) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
            onMouseEnter={() => setHoveredCard(3)}
            onMouseLeave={() => {
              setHoveredCard(null)
              handleMouseLeaveCard(3)
            }}
            onMouseMove={(e) => handleMouseMoveCard(3, e)}
            style={{
              transform: `perspective(1000px) rotateX(${tilts[3]?.rx || 0}deg) rotateY(${tilts[3]?.ry || 0}deg)`,
              transition: "transform 0.1s ease-out, filter 0.3s ease, opacity 0.3s ease",
            }}
            className={`glass-card rounded-3xl p-6 flex flex-col justify-between border border-white/80 transition-all duration-300 relative z-10 ${
              hoveredCard !== null && hoveredCard !== 3 ? "blur-[2px] opacity-60 scale-[0.98]" : "opacity-100 scale-100 hover:-translate-y-2 hover:shadow-2xl hover:shadow-[#0EA5E9]/20"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="size-13 rounded-2xl bg-[#0EA5E9] text-white flex items-center justify-center shadow-lg shadow-[#0EA5E9]/30">
                  <MapPin size={26} />
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-[#0EA5E9]/10 border border-[#0EA5E9]/20 px-3 py-1 text-xs font-extrabold text-[#0EA5E9]">
                  <ShieldCheck size={14} className="text-[#0EA5E9]" /> Score: 99.8%
                </div>
              </div>

              <h3 className="text-xl font-extrabold text-[#111827] mb-1.5">
                3. Geofence Security
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-5 font-medium">
                Students must physically reside inside designated classroom GPS boundaries to mark attendance. Remote check-ins are blocked.
              </p>

              {/* Image Container - Soft Light Mint / Teal-White Tinted Background */}
              <div className="relative w-full max-w-[260px] sm:max-w-[270px] aspect-square mx-auto rounded-2xl bg-linear-to-br from-[#D1FAE5] via-[#F0FDF4] to-[#E0F2FE] p-3.5 flex flex-col items-center justify-center overflow-hidden border border-[#34D399]/60 shadow-md shadow-emerald-400/10">
                {/* Styled 3D Grid Map Background */}
                <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,#059669_1px,transparent_1px),linear-gradient(to_bottom,#059669_1px,transparent_1px)] bg-[size:16px_16px]" />

                {/* Pulsing Concentric Radar Rings & Sweep Line */}
                <div className="absolute size-48 rounded-full border-2 border-[#059669]/40 animate-ping opacity-60" />
                <div className="absolute size-36 rounded-full border-2 border-[#0EA5E9]/50 bg-emerald-500/10 animate-pulse" />
                <div className="absolute size-24 rounded-full border border-[#059669]/30 bg-emerald-400/10" />

                {/* Vector Map-Pin Silhouette with Integrated Security Shield */}
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                  className="relative size-16 flex flex-col items-center justify-center z-10 my-auto drop-shadow-md"
                >
                  <svg viewBox="0 0 64 80" className="size-full">
                    <defs>
                      <linearGradient id="pinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#0EA5E9" />
                        <stop offset="50%" stopColor="#10B981" />
                        <stop offset="100%" stopColor="#059669" />
                      </linearGradient>
                    </defs>
                    {/* Location Pin Outer Silhouette */}
                    <path
                      d="M 32 4 C 17 4, 5 16, 5 31 C 5 48, 28 72, 32 76 C 36 72, 59 48, 59 31 C 59 16, 47 4, 32 4 Z"
                      fill="url(#pinGradient)"
                      stroke="#FFFFFF"
                      strokeWidth="2.5"
                    />
                    {/* Inner White Security Circle */}
                    <circle cx="32" cy="30" r="13" fill="#FFFFFF" />
                  </svg>

                  {/* Security Shield Icon inside Map Pin Center */}
                  <ShieldCheck size={17} className="absolute top-4 text-[#059669] drop-shadow-xs" />
                </motion.div>

                {/* Live Synchronized Changing GPS Coordinates */}
                <div className="mt-auto mb-0.5 z-10 flex items-center gap-1.5 text-[11px] font-mono text-[#34D399] bg-slate-900/90 px-3.5 py-1.5 rounded-full border border-emerald-500/40 shadow-xs font-bold">
                  <span className="size-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>GPS: {lat}° N, {lng}° E</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3.5 border-t border-slate-200/60 flex items-center justify-between text-xs font-bold text-[#0EA5E9]">
              <span>Real-Time GPS Boundary</span>
              <CheckCircle2 size={16} className="text-emerald-500" />
            </div>
          </motion.div>

        </div>

      </div>
    </section>
  )
}
