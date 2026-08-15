"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { ScanFace, MapPin, ArrowRight, CheckCircle2, Building2, Lock, Sparkles, Camera, ShieldCheck, Target, RefreshCw } from "lucide-react"
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

  /* ── Responsive Two-Zone Background Split Calculation ── */
  const sectionRef = useRef<HTMLElement>(null)
  const trustBadgeRef = useRef<HTMLDivElement>(null)
  const [splitOffset, setSplitOffset] = useState<number | null>(null)

  const updateSplit = useCallback(() => {
    if (sectionRef.current && trustBadgeRef.current) {
      const sectionRect = sectionRef.current.getBoundingClientRect()
      const badgeRect = trustBadgeRef.current.getBoundingClientRect()
      const offset = Math.round(badgeRect.top - sectionRect.top)
      setSplitOffset(offset)
    }
  }, [])

  useEffect(() => {
    // Initial rough fallback measurement on mount
    updateSplit()
    window.addEventListener("resize", updateSplit, { passive: true })

    let observer: ResizeObserver | null = null
    if (typeof ResizeObserver !== "undefined" && sectionRef.current) {
      observer = new ResizeObserver(updateSplit)
      observer.observe(sectionRef.current)
      if (trustBadgeRef.current) {
        observer.observe(trustBadgeRef.current)
      }
    }

    return () => {
      window.removeEventListener("resize", updateSplit)
      observer?.disconnect()
    }
  }, [updateSplit])

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="relative z-10 min-h-0 sm:min-h-[calc(100vh-4rem)] flex items-center justify-center overflow-x-clip px-4 pt-21 pb-4 sm:pt-24 sm:pb-10 md:py-16 bg-transparent scroll-mt-24"
    >

      {/* Background Layering: Zone 1 (#E3ECE6), Zone 2 (#F2E4E2), and About Transition (#F5F1E8) */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-visible" aria-hidden="true">
        {/* Base Layer: About Section Cream Tone (#F5F1E8) seamlessly underlying hero bottom and stats card */}
        <div className="absolute inset-0 -bottom-32 bg-[#F5F1E8]" />

        {/* Zone 1: Cool Mineral Sage Mist (Navbar bottom → Trust-badge divider line) */}
        <div
          className="absolute top-0 left-0 right-0 bg-[#E3ECE6]"
          style={{
            height: splitOffset !== null ? `${splitOffset}px` : "70%",
          }}
        />
        {/* Zone 2: Muted Dusty Rose / Soft Terracotta Blush (Trust-badge divider line → Stats card boundary) */}
        <div
          className="absolute left-0 right-0 bottom-0 lg:-bottom-2.5 bg-[#F2E4E2]"
          style={{
            top: splitOffset !== null ? `${splitOffset}px` : "70%",
          }}
        />
      </div>

      <div className="relative z-20 mx-auto max-w-7xl w-full grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-6 items-center my-auto pt-3.5 sm:pt-6.5 md:pt-8">

        {/* LEFT COLUMN: Text Content (40-50% width) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          onAnimationComplete={updateSplit}
          className="lg:col-span-7 flex flex-col items-center text-center lg:items-start lg:text-left my-auto"
        >
          {/* Badge */}
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-blue-50/80 px-3.5 py-1 text-xs font-extrabold text-[#1E3A8A] shadow-2xs">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#0EA5E9] opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-[#0EA5E9]" />
            </span>
            <span className="flex items-center gap-1">
              🏛️ NNRG College · Campus Protection
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.12]">
            <span className="text-[#1E3A8A]">Smart Attendance for</span>{" "}
            <span className="text-[#0284C7]">Modern Campus</span>
          </h1>

          {/* Sub-headline Typing Animation */}
          <div className="mt-2 sm:mt-2.5 min-h-9 sm:min-h-10 flex items-center justify-center lg:justify-start">
            <p className={`text-xl sm:text-2xl font-medium italic text-[#1E3A8A] transition-opacity duration-300 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
              <span>{displayText}</span>
              <span className="cursor-underscore ml-0.5 text-[#0284C7]">_</span>
            </p>
          </div>

          <p className="mt-2.5 sm:mt-3 max-w-lg text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
            Eliminate proxy attendance completely with multi-factor verification — combining dynamic rotating QR codes, facial recognition AI, and continuous GPS geofence boundaries.
          </p>

          {/* Action Buttons — Primary: Sign In →, Secondary: Explore Security → */}
          <div className="mt-4.5 sm:mt-5.5 grid grid-cols-[0.38fr_0.62fr] sm:flex sm:flex-row items-center justify-center lg:justify-start gap-2 sm:gap-3.5 w-full sm:w-auto max-w-full">
            <Button
              asChild
              size="lg"
              className="h-11 min-h-11 sm:h-12 sm:min-h-12 w-full sm:w-auto rounded-xl bg-[#1E3A8A] hover:bg-[#1e40af] px-2 sm:px-7.5 text-xs sm:text-[15px] font-extrabold text-white shadow-xs border border-blue-900/10 transition-all duration-200 active:scale-[0.98] group whitespace-nowrap overflow-hidden"
            >
              <Link href="/login" className="flex items-center justify-center gap-1 sm:gap-2 w-full">
                <span className="truncate">Sign In</span>
                <ArrowRight size={15} className="shrink-0 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
            </Button>

            <button
              type="button"
              onClick={() => {
                const el = document.getElementById("how-it-works")
                if (el) {
                  const headerOffset = 80
                  const elementPosition = el.getBoundingClientRect().top
                  const offsetPosition = elementPosition + window.scrollY - headerOffset
                  window.scrollTo({ top: offsetPosition, behavior: "smooth" })
                }
              }}
              className="h-11 min-h-11 sm:h-12 sm:min-h-12 w-full sm:w-auto inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl border border-slate-200 bg-white px-2 sm:px-6 text-xs sm:text-sm font-bold text-[#111827] shadow-xs transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-[#1E3A8A] cursor-pointer whitespace-nowrap overflow-hidden group"
            >
              <span className="truncate">Explore Security</span>
              <ArrowRight size={15} className="text-[#0284C7] shrink-0 transition-transform duration-200 group-hover:translate-x-1" />
            </button>
          </div>

          {/* Trust Badge */}
          <div ref={trustBadgeRef} className="mt-5.5 sm:mt-6.5 pt-3.5 sm:pt-4 flex items-center justify-center lg:justify-start gap-3 sm:gap-3.5 text-xs font-semibold text-slate-600 w-full">
            <div className="size-9.5 sm:size-10 rounded-xl bg-blue-50 text-[#1E3A8A] border border-blue-100 flex items-center justify-center font-bold shrink-0">
              <Building2 size={20} />
            </div>
            <div className="flex flex-col text-left pt-1">
              <span className="font-extrabold text-[#111827] text-sm sm:text-base leading-snug">Built for NNRG College</span>
              <span className="text-[11px] sm:text-xs text-slate-500 font-medium leading-tight mt-0.5">Campus Protection System • 100% Anti-Proxy Guarantee</span>
            </div>
          </div>
        </motion.div>

        {/* RIGHT COLUMN: Phone Mockup & Responsive Mobile/Tablet Statistics Stack */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="lg:col-span-5 flex flex-col min-[480px]:flex-row lg:flex-col items-center justify-center gap-4 sm:gap-6 my-auto pt-2 sm:pt-4 pb-1"
        >
          {/* Phone Mockup Container */}
          <div className="w-full min-[480px]:w-1/2 lg:w-full flex justify-center shrink-0">
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
              className="relative w-full max-w-49 sm:max-w-62.5 aspect-[8.6/18.2] max-h-100 sm:max-h-115 rounded-[36px] bg-[#0F172A] p-2 shadow-2xl shadow-slate-900/15 border-4 border-slate-800 gpu-accelerated my-auto"
            >
            {/* Floating Glass Reflection */}
            <div className="pointer-events-none absolute inset-0 rounded-4xl bg-linear-to-tr from-white/10 via-transparent to-transparent z-30" />

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

                  {/* PHASE 3 (4-6s): Face Verification (Student Avatar Face + Laser Bar + Match %) */}
                  {phoneStage === 2 && (
                    <motion.div
                      key="stage-face"
                      initial={{ opacity: 0, scale: 0.92 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.92 }}
                      transition={{ duration: 0.3 }}
                      className="w-full relative flex flex-col items-center justify-center p-2 rounded-xl bg-white/95 border border-purple-200/80 shadow-xs"
                    >
                      {/* Biometric Scanning Frame - Matched to Face AI Security Card */}
                      <div className="relative size-24 border-2 border-dashed border-[#6D28D9]/70 rounded-xl flex items-center justify-center overflow-hidden bg-linear-to-br from-[#F3E8FF]/60 via-white to-[#EDE9FE]/60 p-1 z-10 shadow-inner">
                        {/* Bounded Laser Scan Line */}
                        <div className="scan-laser-line z-20" />

                        {/* Corner Scanning Brackets */}
                        <div className="absolute top-1 left-1 size-2.5 border-t-2 border-l-2 border-[#6D28D9] rounded-tl-xs z-10" />
                        <div className="absolute top-1 right-1 size-2.5 border-t-2 border-r-2 border-[#6D28D9] rounded-tr-xs z-10" />
                        <div className="absolute bottom-1 left-1 size-2.5 border-b-2 border-l-2 border-[#6D28D9] rounded-bl-xs z-10" />
                        <div className="absolute bottom-1 right-1 size-2.5 border-b-2 border-r-2 border-[#6D28D9] rounded-br-xs z-10" />

                        {/* Student Avatar Face (Enlarged & Centered, matching Face AI desktop card) */}
                        <div className="relative size-20 flex items-center justify-center z-10 my-auto pt-0.5">
                          <svg viewBox="0 0 120 130" className="w-full h-full drop-shadow-xs">
                            {/* Neck & T-Shirt Collar */}
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

                            {/* Hair */}
                            <path d="M 27 50 C 26 22, 50 10, 93 30 C 94 48, 86 28, 62 25 C 44 23, 34 38, 27 50 Z" fill="#2E1065" />

                            {/* Eyebrows */}
                            <path d="M 38 48 Q 48 42 56 47" stroke="#2E1065" strokeWidth="3" strokeLinecap="round" fill="none" />
                            <path d="M 64 47 Q 72 42 82 48" stroke="#2E1065" strokeWidth="3" strokeLinecap="round" fill="none" />

                            {/* Eyes */}
                            <ellipse cx="47" cy="58" rx="7" ry="8" fill="#111827" />
                            <ellipse cx="73" cy="58" rx="7" ry="8" fill="#111827" />
                            <circle cx="49" cy="55" r="2.5" fill="#FFFFFF" />
                            <circle cx="75" cy="55" r="2.5" fill="#FFFFFF" />

                            {/* Nose & Smile */}
                            <path d="M 60 62 Q 58 68 62 68" stroke="#E11D48" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                            <path d="M 48 76 Q 60 84 72 76" stroke="#E11D48" strokeWidth="2.5" strokeLinecap="round" fill="none" />

                            {/* Rosy Cheeks */}
                            <circle cx="38" cy="68" r="4.5" fill="#FDA4AF" opacity="0.5" />
                            <circle cx="82" cy="68" r="4.5" fill="#FDA4AF" opacity="0.5" />
                          </svg>

                          {/* Biometric Recognition Nodes */}
                          <div className="absolute top-5 left-6 size-1.5 rounded-full bg-[#0EA5E9] animate-ping" />
                          <div className="absolute top-5 right-6 size-1.5 rounded-full bg-[#0EA5E9] animate-ping" />
                          <div className="absolute bottom-6 left-7 size-1.5 rounded-full bg-[#0EA5E9] animate-ping" />
                          <div className="absolute bottom-6 right-7 size-1.5 rounded-full bg-[#0EA5E9] animate-ping" />
                        </div>
                      </div>

                      <div className="mt-1 flex flex-col items-center">
                        <span className="text-[10px] font-extrabold text-[#111827]">Verifying Biometrics...</span>
                        <span className="text-[11px] font-mono font-extrabold text-[#6D28D9]">
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
        </div>

        {/* Mobile/Tablet Compact Statistics Stack (< lg: viewports) */}
        <div className="w-full min-[480px]:w-1/2 lg:hidden flex flex-col gap-2.5 max-w-64 min-[480px]:max-w-none">
          <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center gap-3 transition-all hover:border-sky-300">
            <div className="size-9 rounded-xl bg-sky-50 text-[#0284C7] flex items-center justify-center shrink-0 border border-sky-200/80">
              <Target size={18} />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-base font-extrabold text-[#111827] font-mono tracking-tight">🎯 99.9%</span>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0284C7]">System Accuracy</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center gap-3 transition-all hover:border-purple-300">
            <div className="size-9 rounded-xl bg-purple-50 text-[#6D28D9] flex items-center justify-center shrink-0 border border-purple-200/80">
              <RefreshCw size={17} className="animate-spin-slow" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-base font-extrabold text-[#111827] font-mono tracking-tight">🔄 15s</span>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#6D28D9]">Dynamic QR Refresh</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center gap-3 transition-all hover:border-emerald-300">
            <div className="size-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200/80">
              <ShieldCheck size={18} />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-base font-extrabold text-[#111827] font-mono tracking-tight">🛡️ 0</span>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600">Proxy Incidents</span>
            </div>
          </div>
        </div>
      </motion.div>

    </div>
  </section>
)
}
