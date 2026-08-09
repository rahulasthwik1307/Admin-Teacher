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
          
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#1E3A8A] pb-2">
            Three Layers of Iron-Clad Security
          </h2>

          <p className="mt-4 max-w-xl mx-auto text-sm sm:text-base text-slate-600 leading-relaxed font-medium">
            Every attendance check-in must pass dynamic QR validation, facial recognition AI, and physical GPS boundary verification in real time.
          </p>
        </div>

        {/* 3 Horizontal Cards Container */}
        <div ref={containerRef} className="relative grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-6 lg:gap-8 items-stretch">
          
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
              <div className="relative w-full max-w-65 sm:max-w-67.5 aspect-square mx-auto rounded-2xl bg-linear-to-br from-[#E0F2FE] via-[#F0F9FF] to-[#DBEAFE] pt-3.5 pb-2.5 px-3 flex flex-col items-center justify-between overflow-hidden border border-[#38BDF8]/60 shadow-md shadow-sky-400/10">
                {/* QR Subject Box - Laser scan line is BOUNDED ONLY INSIDE THIS QR SUBJECT */}
                <div className="relative rounded-2xl p-2 bg-white border border-sky-300/60 overflow-hidden shadow-lg z-10 my-auto">
                  {/* Laser scan line moving ONLY across the QR code */}
                  <div className="scan-laser-line z-10" />
                  <RealQRCode size={168} seed={qrSeed} darkColor="#1E3A8A" lightColor="#FFFFFF" className="shadow-xs z-0" />
                </div>

                {/* Refresh Countdown Badge - Identical Height (h-7.5), Bottom Alignment & Breathing Room */}
                <div className="h-7.5 px-3.5 flex items-center justify-center gap-1.5 text-[11px] font-mono text-[#0EA5E9] bg-slate-900/90 rounded-full border border-sky-400/40 shadow-xs z-10 shrink-0">
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
              <div className="relative w-full max-w-65 sm:max-w-67.5 aspect-square mx-auto rounded-2xl bg-linear-to-br from-[#F3E8FF] via-[#FAF5FF] to-[#EDE9FE] pt-3.5 pb-2.5 px-3 flex flex-col items-center justify-between overflow-hidden border border-[#C084FC]/60 shadow-md shadow-purple-400/10">
                {/* Face Scanner Frame - Matched Height (195px x 195px) to Horizontally Align with Card 1's QR Box */}
                <div className="relative w-48.75 h-48.75 border-2 border-dashed border-[#6D28D9]/70 rounded-2xl flex flex-col items-center justify-center bg-white/90 p-2 overflow-hidden z-10 my-auto shadow-md">
                  {/* Laser scan line moving ONLY inside face scanner frame */}
                  <div className="scan-laser-line z-20" />

                  {/* Scanning Grid Overlay ONLY on Face Area */}
                  <div className="absolute inset-0 opacity-15 bg-[linear-gradient(to_right,#6D28D9_1px,transparent_1px),linear-gradient(to_bottom,#6D28D9_1px,transparent_1px)] bg-size-[10px_10px]" />

                  {/* Corner Scanning Brackets */}
                  <div className="absolute top-1.5 left-1.5 size-4 border-t-3 border-l-3 border-[#6D28D9] rounded-tl-sm z-10" />
                  <div className="absolute top-1.5 right-1.5 size-4 border-t-3 border-r-3 border-[#6D28D9] rounded-tr-sm z-10" />
                  <div className="absolute bottom-1.5 left-1.5 size-4 border-b-3 border-l-3 border-[#6D28D9] rounded-bl-sm z-10" />
                  <div className="absolute bottom-1.5 right-1.5 size-4 border-b-3 border-r-3 border-[#6D28D9] rounded-br-sm z-10" />

                  {/* Detailed Friendly Vector Student Avatar Face - Enlarged & Centered */}
                  <div className="relative w-38 h-42 flex items-center justify-center z-10 my-auto pt-1">
                    <svg viewBox="0 0 120 130" className="w-full h-full drop-shadow-md">
                      {/* Neck & Purple T-Shirt Collar */}
                      <path d="M 46 95 L 46 110 L 74 110 L 74 95 Z" fill="#FCE7F3" stroke="#F43F5E" strokeWidth="0.5" />
                      <path d="M 28 110 Q 60 128 92 110 L 96 130 L 24 130 Z" fill="#6D28D9" />
                      <path d="M 44 110 Q 60 120 76 110 Q 60 114 44 110 Z" fill="#581C87" />

                      {/* Ears */}
                      <ellipse cx="28" cy="65" rx="7" ry="10" fill="#FDE8E8" stroke="#E11D48" strokeWidth="0.5" />
                      <ellipse cx="28" cy="65" rx="4" ry="6" fill="#FCA5A5" opacity="0.4" />
                      <ellipse cx="92" cy="65" rx="7" ry="10" fill="#FDE8E8" stroke="#E11D48" strokeWidth="0.5" />
                      <ellipse cx="92" cy="65" rx="4" ry="6" fill="#FCA5A5" opacity="0.4" />

                      {/* Face Head Outline */}
                      <path d="M 30 50 C 30 20, 90 20, 90 50 C 90 75, 80 96, 60 96 C 40 96, 30 75, 30 50 Z" fill="#FFF1F2" stroke="#FDA4AF" strokeWidth="0.8" />

                      {/* Hair (Parted Side Bangs) */}
                      <path d="M 27 50 C 26 22, 50 10, 93 30 C 94 48, 86 28, 62 25 C 44 23, 34 38, 27 50 Z" fill="#2E1065" />

                      {/* Eyebrows */}
                      <path d="M 38 48 Q 48 42 56 47" stroke="#2E1065" strokeWidth="3" strokeLinecap="round" fill="none" />
                      <path d="M 64 47 Q 72 42 82 48" stroke="#2E1065" strokeWidth="3" strokeLinecap="round" fill="none" />

                      {/* Large Expressive Eyes */}
                      <ellipse cx="47" cy="58" rx="7" ry="8" fill="#111827" />
                      <ellipse cx="73" cy="58" rx="7" ry="8" fill="#111827" />
                      {/* Pupil Light Reflections */}
                      <circle cx="49" cy="55" r="2.5" fill="#FFFFFF" />
                      <circle cx="75" cy="55" r="2.5" fill="#FFFFFF" />
                      <circle cx="45" cy="60" r="1" fill="#FFFFFF" />
                      <circle cx="71" cy="60" r="1" fill="#FFFFFF" />

                      {/* Nose & Smile */}
                      <path d="M 60 62 Q 58 68 62 68" stroke="#E11D48" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                      <path d="M 48 76 Q 60 84 72 76" stroke="#E11D48" strokeWidth="2.5" strokeLinecap="round" fill="none" />

                      {/* Rosy Cheeks */}
                      <circle cx="38" cy="68" r="4.5" fill="#FDA4AF" opacity="0.5" />
                      <circle cx="82" cy="68" r="4.5" fill="#FDA4AF" opacity="0.5" />
                    </svg>
                  </div>
                </div>

                {/* Confidence Badge - Identical Height (h-7.5), Bottom Alignment & Breathing Room */}
                <div className="h-7.5 px-3.5 flex items-center justify-center gap-1.5 text-[11px] font-mono font-bold text-emerald-300 bg-slate-900/90 rounded-full border border-purple-400/40 shadow-xs z-10 shrink-0">
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
              <div className="relative w-full max-w-65 sm:max-w-67.5 aspect-square mx-auto rounded-2xl bg-linear-to-br from-[#D1FAE5] via-[#F0FDF4] to-[#E0F2FE] pt-3.5 pb-2.5 px-3 flex flex-col items-center justify-between overflow-hidden border border-[#34D399]/60 shadow-md shadow-emerald-400/10">
                {/* Styled 3D Grid Map Background */}
                <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,#059669_1px,transparent_1px),linear-gradient(to_bottom,#059669_1px,transparent_1px)] bg-size-[16px_16px]" />

                {/* Rotating Cyan Radar Sweep Beam */}
                <div className="absolute size-48 rounded-full bg-[conic-gradient(from_0deg_at_50%_50%,rgba(14,165,233,0.35)_0deg,transparent_60deg,transparent_360deg)] animate-spin-slow pointer-events-none" style={{ animationDuration: '6s' }} />

                {/* Pulsing Concentric Radar Rings */}
                <div className="absolute size-48 rounded-full border-2 border-[#059669]/40 animate-ping opacity-60" />
                <div className="absolute size-36 rounded-full border-2 border-[#0EA5E9]/50 bg-emerald-500/10 animate-pulse" />
                <div className="absolute size-24 rounded-full border border-[#059669]/30 bg-emerald-400/10" />

                {/* Outer Orbital Ring with Glowing Nodes */}
                <div className="absolute size-48 rounded-full border border-emerald-400/30">
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 size-2.5 rounded-full bg-cyan-300 shadow-md shadow-cyan-400 animate-ping" />
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 size-2.5 rounded-full bg-emerald-400 shadow-md shadow-emerald-400 animate-ping" />
                  <div className="absolute top-1/2 -left-1 -translate-y-1/2 size-2.5 rounded-full bg-cyan-300 shadow-md shadow-cyan-400 animate-ping" />
                  <div className="absolute top-1/2 -right-1 -translate-y-1/2 size-2.5 rounded-full bg-emerald-400 shadow-md shadow-emerald-400 animate-ping" />
                </div>

                {/* Sleek Vector Map-Pin Teardrop Silhouette with Integrated Security Shield */}
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                  className="relative size-16 flex flex-col items-center justify-center z-10 my-auto drop-shadow-lg"
                >
                  <svg viewBox="0 0 64 80" className="size-full">
                    <defs>
                      <linearGradient id="pinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#0EA5E9" />
                        <stop offset="50%" stopColor="#10B981" />
                        <stop offset="100%" stopColor="#059669" />
                      </linearGradient>
                    </defs>
                    {/* Location Pin Outer Teardrop Silhouette */}
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
                  <ShieldCheck size={18} className="absolute top-4 text-[#059669] drop-shadow-xs" />
                </motion.div>

                {/* Live Synchronized Changing GPS Coordinates - Identical Height (h-7.5), Bottom Alignment & Breathing Room */}
                <div className="h-7.5 px-3.5 flex items-center justify-center gap-1.5 text-[11px] font-mono text-[#34D399] bg-slate-900/90 rounded-full border border-emerald-500/40 shadow-xs font-bold z-10 shrink-0">
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
