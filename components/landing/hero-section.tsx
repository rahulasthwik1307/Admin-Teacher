"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { ScanFace, MapPin, ArrowRight, CheckCircle2, Building2, Lock, Sparkles, Camera, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RealQRCode } from "./real-qr-code"

const typingPhrases = [
  "Securing campuses with QR verification...",
  "Eliminating proxy attendance with Face AI...",
  "Enforcing boundaries with GPS Geofence...",
]

export function HeroSection() {
  /* ── Typewriter Logic (80ms type, 2.5s pause, 50ms delete) ── */
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0)
  const [displayText, setDisplayText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [isFading, setIsFading] = useState(false)

  useEffect(() => {
    const fullText = typingPhrases[currentPhraseIndex]

    let timer: NodeJS.Timeout
    if (!isDeleting) {
      if (displayText.length < fullText.length) {
        timer = setTimeout(() => {
          setDisplayText(fullText.slice(0, displayText.length + 1))
        }, 80)
      } else {
        timer = setTimeout(() => {
          setIsDeleting(true)
        }, 2500)
      }
    } else {
      if (displayText.length > 0) {
        timer = setTimeout(() => {
          setDisplayText(fullText.slice(0, displayText.length - 1))
        }, 50)
      } else {
        setIsFading(true)
        setTimeout(() => {
          setIsDeleting(false)
          setCurrentPhraseIndex((prev) => (prev + 1) % typingPhrases.length)
          setIsFading(false)
        }, 300)
      }
    }
    return () => clearTimeout(timer)
  }, [displayText, isDeleting, currentPhraseIndex])

  /* ── 8-Second Animated Phone Loop (2s per stage) ── */
  const [phoneStage, setPhoneStage] = useState(0)
  const [faceConfidence, setFaceConfidence] = useState(94.0)
  const [qrSeed, setQrSeed] = useState(1)

  useEffect(() => {
    const interval = setInterval(() => {
      setPhoneStage((prev) => (prev + 1) % 4)
    }, 2000) // 2s per stage -> 8s loop

    return () => clearInterval(interval)
  }, [])

  // Rotate QR seed every 15 seconds
  useEffect(() => {
    const qrInterval = setInterval(() => {
      setQrSeed((prev) => prev + 1)
    }, 15000)
    return () => clearInterval(qrInterval)
  }, [])

  // Animate confidence score during stage 2 (Face verification)
  useEffect(() => {
    if (phoneStage === 2) {
      setFaceConfidence(94.0)
      const cInterval = setInterval(() => {
        setFaceConfidence((prev) => {
          if (prev >= 99.8) {
            clearInterval(cInterval)
            return 99.8
          }
          return Number((prev + 1.6).toFixed(1))
        })
      }, 100)
      return () => clearInterval(cInterval)
    }
  }, [phoneStage])

  /* ── 3D Phone Hover Tilt ── */
  const phoneRef = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 })

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!phoneRef.current) return
    const rect = phoneRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left - rect.width / 2
    const y = e.clientY - rect.top - rect.height / 2
    setTilt({
      rotateX: (-y / rect.height) * 6,
      rotateY: (x / rect.width) * 6,
    })
  }

  const handleMouseLeave = () => {
    setTilt({ rotateX: 0, rotateY: 0 })
  }

  return (
    <section id="hero" className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center overflow-hidden px-4 py-10 sm:py-14 md:py-16 gradient-mesh-bg">

      {/* Floating Ambient Geometric Blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ x: [0, 30, -20, 0], y: [0, -30, 20, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-24 left-10 size-72 rounded-full bg-[#6D28D9]/15 blur-3xl gpu-accelerated"
        />
        <motion.div
          animate={{ x: [0, -30, 25, 0], y: [0, 30, -25, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-1/3 right-10 size-80 rounded-full bg-[#0EA5E9]/15 blur-3xl gpu-accelerated"
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-6 items-center my-auto pt-2 sm:pt-4">

        {/* LEFT COLUMN: Text Content (40-50% width) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="lg:col-span-7 flex flex-col items-center text-center lg:items-start lg:text-left my-auto"
        >
          {/* Badge */}
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#0EA5E9]/30 bg-[#0EA5E9]/10 px-3.5 py-1 text-xs font-extrabold text-[#1E3A8A] shadow-xs">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#0EA5E9] opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-[#0EA5E9]" />
            </span>
            <span className="flex items-center gap-1">
              🏛️ NNRG College · Campus Protection
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl font-extrabold tracking-tight text-[#111827] sm:text-4xl md:text-5xl lg:text-5xl leading-[1.12]">
            Smart Attendance for{" "}
            <span className="gradient-text-navy block sm:inline">Modern Campus</span>
          </h1>

          {/* Sub-headline Typing Animation */}
          <div className="mt-3.5 min-h-10.5 flex items-center justify-center lg:justify-start">
            <p className={`text-base sm:text-lg md:text-xl font-extrabold text-[#1E3A8A] transition-opacity duration-300 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
              <span className="font-extrabold text-[#0EA5E9]">{displayText}</span>
              <span className="cursor-underscore text-[#0EA5E9] font-extrabold ml-0.5">_</span>
            </p>
          </div>

          <p className="mt-3.5 max-w-lg text-sm sm:text-base text-slate-600 leading-relaxed font-medium">
            Eliminate proxy attendance completely with multi-factor verification — combining dynamic rotating QR codes, facial recognition AI, and continuous GPS geofence boundaries.
          </p>

          {/* Action Buttons */}
          <div className="mt-6.5 flex flex-col sm:flex-row items-center gap-3.5 w-full sm:w-auto">
            <Button
              asChild
              size="lg"
              className="h-12 min-h-12 w-full sm:w-auto rounded-xl bg-[#1E3A8A] px-7.5 text-sm sm:text-[15px] font-bold text-white shadow-lg shadow-[#1E3A8A]/20 transition-all duration-300 hover:bg-[#6D28D9] hover:shadow-xl hover:shadow-[#6D28D9]/30 hover:scale-[1.03] active:scale-[0.98] group"
            >
              <Link href="/login" className="flex items-center justify-center gap-2">
                <span>Explore The Demo</span>
                <ArrowRight size={17} className="transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </Button>

            <a
              href="#how-it-works"
              className="h-12 min-h-12 w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300/80 bg-white/80 px-6 text-xs sm:text-sm font-bold text-[#111827] shadow-xs backdrop-blur-md transition-all duration-300 hover:border-[#0EA5E9] hover:bg-white hover:text-[#1E3A8A] hover:scale-[1.02]"
            >
              <Sparkles size={16} className="text-[#0EA5E9]" />
              See Security Layers
            </a>
          </div>

          {/* Trust Badge */}
          <div className="mt-6 pt-4 border-t border-slate-200/60 flex items-center justify-center lg:justify-start gap-3 text-xs font-semibold text-slate-600">
            <div className="size-8 rounded-xl bg-[#1E3A8A]/10 text-[#1E3A8A] flex items-center justify-center font-bold shrink-0">
              <Building2 size={16} />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-extrabold text-[#111827]">Built for NNRG College</span>
              <span className="text-[10px] text-slate-500 font-medium">Campus Protection System • 100% Anti-Proxy Guarantee</span>
            </div>
          </div>
        </motion.div>

        {/* RIGHT COLUMN: Compact Vertically Reduced Phone Mockup (25% Height Reduction) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="lg:col-span-5 flex justify-center items-center my-auto py-2"
        >
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            ref={phoneRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
              transform: `perspective(1000px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg)`,
              transition: "transform 0.15s ease-out",
            }}
            className="relative w-full max-w-59 sm:max-w-62.5 aspect-[9/18.2] max-h-115 rounded-[36px] bg-[#111827] p-2 shadow-2xl shadow-[#1E3A8A]/25 border-4 border-slate-700/60 gpu-accelerated my-auto translate-y-3.5"
          >
            {/* Floating Glass Reflection */}
            <div className="pointer-events-none absolute inset-0 rounded-4xl bg-linear-to-tr from-white/20 via-transparent to-transparent z-30" />

            {/* Screen Glow */}
            <div className="pointer-events-none absolute -inset-3 rounded-[40px] bg-linear-to-tr from-[#6D28D9]/30 via-[#0EA5E9]/35 to-[#1E3A8A]/30 blur-lg opacity-70 -z-10 animate-pulse" />

            {/* Phone Screen Display: SKY BLUE BACKGROUND (#E8F4FD) */}
            <div className="relative size-full rounded-3xl bg-[#E8F4FD] overflow-hidden flex flex-col justify-between p-3 border border-blue-200/80 text-[#111827]">

              {/* Status Header */}
              <div className="flex items-center justify-between px-1 pt-0.5 pb-1 border-b border-blue-200/70 text-[9px] font-mono text-[#1E3A8A]">
                <span className="flex items-center gap-1 font-bold">
                  <Lock size={9} className="text-[#0EA5E9]" /> Factor Student
                </span>
                <span className="px-1.5 py-0.5 rounded-full bg-[#0EA5E9]/15 text-[#0EA5E9] font-extrabold text-[8px] border border-[#0EA5E9]/30">
                  GPS ACTIVE
                </span>
              </div>

              {/* Dynamic Screen Stage Switcher */}
              <div className="relative my-auto flex flex-col items-center justify-center min-h-52.5">
                <AnimatePresence mode="wait">

                  {/* PHASE 1 (0-2s): Flutter App Home Screen */}
                  {phoneStage === 0 && (
                    <motion.div
                      key="stage-home"
                      initial={{ opacity: 0, scale: 0.92 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.92 }}
                      transition={{ duration: 0.3 }}
                      className="w-full flex flex-col items-center text-center p-1.5"
                    >
                      <div className="size-11 rounded-xl bg-linear-to-br from-[#1E3A8A] to-[#6D28D9] flex items-center justify-center shadow-md shadow-[#1E3A8A]/30 mb-2">
                        <ScanFace size={24} className="text-white" />
                      </div>
                      <h4 className="text-sm font-extrabold text-[#1E3A8A]">Smart Attendance</h4>
                      <p className="text-[10px] text-[#6D28D9] font-bold mt-0.5">Your Face is Your Key</p>
                      
                      <div className="w-full mt-3 space-y-1.5 text-left">
                        <div className="p-1.5 rounded-lg bg-white/90 border border-blue-200/80 shadow-2xs flex items-center gap-2 text-xs">
                          <div className="size-6 rounded-md bg-[#6D28D9]/10 text-[#6D28D9] flex items-center justify-center shrink-0">
                            <ScanFace size={13} />
                          </div>
                          <div>
                            <div className="font-extrabold text-[#111827] text-[11px]">Face Recognition</div>
                            <div className="text-[8px] text-slate-500 font-semibold">Enrolled & Verified</div>
                          </div>
                        </div>
                        <div className="p-1.5 rounded-lg bg-white/90 border border-blue-200/80 shadow-2xs flex items-center gap-2 text-xs">
                          <div className="size-6 rounded-md bg-[#0EA5E9]/10 text-[#0EA5E9] flex items-center justify-center shrink-0">
                            <MapPin size={13} />
                          </div>
                          <div>
                            <div className="font-extrabold text-[#111827] text-[11px]">GPS Location</div>
                            <div className="text-[8px] text-slate-500 font-semibold">NNRG Campus Zone</div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* PHASE 2 (2-4s): QR Scanning View (REAL QR CODE) */}
                  {phoneStage === 1 && (
                    <motion.div
                      key="stage-qr"
                      initial={{ opacity: 0, scale: 0.92 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.92 }}
                      transition={{ duration: 0.3 }}
                      className="w-full relative flex flex-col items-center justify-center p-2 rounded-xl bg-white/90 border border-blue-200/80 shadow-xs"
                    >
                      <div className="mb-1 text-[9px] font-extrabold text-[#1E3A8A] flex items-center gap-1">
                        <Camera size={11} className="text-[#0EA5E9] animate-pulse" />
                        <span>Scan Teacher QR Code</span>
                      </div>

                      {/* Real QR Code Pattern */}
                      <RealQRCode size={100} seed={qrSeed} darkColor="#1E3A8A" lightColor="#FFFFFF" />

                      <div className="mt-1.5 text-[8px] text-slate-600 font-mono font-bold bg-[#E8F4FD] px-2 py-0.5 rounded-full border border-blue-200">
                        Expires in: <strong className="text-[#1E3A8A] font-extrabold">12s</strong>
                      </div>
                    </motion.div>
                  )}

                  {/* PHASE 3 (4-6s): Face Verification (Laser Bar + Confidence) */}
                  {phoneStage === 2 && (
                    <motion.div
                      key="stage-face"
                      initial={{ opacity: 0, scale: 0.92 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.92 }}
                      transition={{ duration: 0.3 }}
                      className="w-full relative flex flex-col items-center justify-center p-2 rounded-xl bg-white/90 border border-blue-200/80 shadow-xs"
                    >
                      <div className="relative size-24 border-2 border-dashed border-[#0EA5E9] rounded-xl flex items-center justify-center overflow-hidden bg-slate-900/5">
                        <div className="absolute top-0 left-0 size-2 border-t-2 border-l-2 border-[#0EA5E9]" />
                        <div className="absolute top-0 right-0 size-2 border-t-2 border-r-2 border-[#0EA5E9]" />
                        <div className="absolute bottom-0 left-0 size-2 border-b-2 border-l-2 border-[#0EA5E9]" />
                        <div className="absolute bottom-0 right-0 size-2 border-b-2 border-r-2 border-[#0EA5E9]" />

                        {/* Animated Laser Scanning Box */}
                        <div className="scan-laser-line z-10" />

                        <ScanFace size={38} className="text-[#1E3A8A]" />
                      </div>

                      <div className="mt-1.5 flex flex-col items-center">
                        <span className="text-[10px] font-extrabold text-[#111827]">Verifying Biometrics...</span>
                        <span className="text-[11px] font-mono font-bold text-[#6D28D9]">
                          {faceConfidence}% Match
                        </span>
                      </div>
                    </motion.div>
                  )}

                  {/* PHASE 4 (6-8s): Attendance Success Screen */}
                  {phoneStage === 3 && (
                    <motion.div
                      key="stage-success"
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.92 }}
                      transition={{ duration: 0.3 }}
                      className="w-full flex flex-col items-center text-center p-2.5 rounded-xl bg-white/95 border border-emerald-500/40 shadow-xs"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 220, damping: 14 }}
                        className="size-11 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-1 shadow-sm shadow-emerald-500/20"
                      >
                        <CheckCircle2 size={28} />
                      </motion.div>

                      <h4 className="text-xs font-extrabold text-[#1E3A8A]">✅ Attendance Marked</h4>
                      <p className="text-[10px] text-slate-700 font-extrabold mt-0.5">Rahul A. — ECE Dept</p>
                      
                      <div className="mt-2 w-full p-1.5 rounded-lg bg-[#E8F4FD] border border-blue-200 text-[9px] font-mono text-emerald-700 font-bold flex justify-between">
                        <span>STATUS: PRESENT</span>
                        <span>10:15 AM</span>
                      </div>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>

              {/* Bottom Stage Progress Indicator */}
              <div className="flex items-center justify-center gap-1.5 pt-1 border-t border-blue-200/70">
                {[0, 1, 2, 3].map((stg) => (
                  <div
                    key={stg}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      phoneStage === stg ? "w-4 bg-[#0EA5E9]" : "w-1 bg-blue-200"
                    }`}
                  />
                ))}
              </div>

            </div>
          </motion.div>
        </motion.div>

      </div>
    </section>
  )
}
