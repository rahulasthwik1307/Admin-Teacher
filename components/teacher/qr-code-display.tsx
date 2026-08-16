"use client"

import { useEffect, useState, useCallback } from "react"
import { QRCodeSVG } from "qrcode.react"
import { cn } from "@/lib/utils"

interface QRCodeDisplayProps {
  /** Seconds left until next rotation */
  secondsLeft: number
  /** Total countdown seconds */
  totalSeconds: number
  /** Whether the QR just flashed (rotated) */
  isFlashing: boolean
  /** The current QR token UUID to encode */
  tokenValue: string
  /** Display size of QR code */
  size?: number
}

export function QRCodeDisplay({
  secondsLeft,
  totalSeconds,
  isFlashing,
  tokenValue,
  size = 260,
}: QRCodeDisplayProps) {
  const qrPct = totalSeconds > 0 ? (secondsLeft / totalSeconds) * 100 : 0
  const isUrgent = secondsLeft <= 3

  return (
    <div className="relative flex flex-col items-center">
      {/* Outer ambient glow */}
      <div
        className={cn(
          "absolute -inset-2 rounded-3xl bg-linear-to-b from-primary/20 via-sky-500/10 to-transparent blur-xl transition-all duration-500 pointer-events-none",
          isFlashing && "from-primary/40 via-sky-400/30 blur-2xl scale-105",
          isUrgent && "from-amber-500/25 via-amber-500/10"
        )}
      />

      {/* QR Framing Container */}
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border-2 bg-white p-3.5 shadow-xl transition-all duration-300",
          isFlashing
            ? "border-primary scale-[1.015] shadow-2xl shadow-primary/30"
            : isUrgent
            ? "border-amber-400 shadow-lg shadow-amber-500/15"
            : "border-border/80 shadow-lg"
        )}
      >
        {/* Subtle corner markers */}
        <div className="absolute left-1.5 top-1.5 size-3 border-l-2 border-t-2 border-primary/40 rounded-tl-sm pointer-events-none" />
        <div className="absolute right-1.5 top-1.5 size-3 border-r-2 border-t-2 border-primary/40 rounded-tr-sm pointer-events-none" />
        <div className="absolute bottom-1.5 left-1.5 size-3 border-b-2 border-l-2 border-primary/40 rounded-bl-sm pointer-events-none" />
        <div className="absolute bottom-1.5 right-1.5 size-3 border-b-2 border-r-2 border-primary/40 rounded-br-sm pointer-events-none" />

        {/* QR Code */}
        <div
          className="flex items-center justify-center relative z-10"
          style={{ width: size, height: size }}
        >
          <QRCodeSVG
            value={tokenValue || "factor-attendance-loading"}
            size={size}
            level="H"
            includeMargin={true}
            bgColor="#ffffff"
            fgColor="#09090b"
          />
        </div>

        {/* Flash Overlay */}
        {isFlashing && (
          <div className="pointer-events-none absolute inset-0 rounded-2xl bg-linear-to-b from-primary/20 via-sky-400/15 to-transparent animate-[flashPulse_0.35s_ease-out_forwards]" />
        )}
      </div>

      <style jsx>{`
        @keyframes flashPulse {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}

/**
 * Hook that manages the 15-second countdown timer for QR rotation.
 */
export function useQRTimer(isActive: boolean, isPaused: boolean, onRotate?: () => void) {
  const TOTAL = 15
  const [secondsLeft, setSecondsLeft] = useState(TOTAL)
  const [isFlashing, setIsFlashing] = useState(false)
  const [shouldRotate, setShouldRotate] = useState(false)

  const reset = useCallback(() => {
    setSecondsLeft(TOTAL)
  }, [])

  useEffect(() => {
    if (!isActive || isPaused) return

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsFlashing(true)
          setShouldRotate(true)
          setTimeout(() => setIsFlashing(false), 350)
          return TOTAL
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isActive, isPaused])

  // Trigger rotation callback outside of setState to avoid updating parent during render
  useEffect(() => {
    if (shouldRotate) {
      setShouldRotate(false)
      if (onRotate) onRotate()
    }
  }, [shouldRotate, onRotate])

  return { secondsLeft, totalSeconds: TOTAL, isFlashing, reset }
}
