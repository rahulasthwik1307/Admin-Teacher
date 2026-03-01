"use client"

import { useEffect, useState, useCallback } from "react"
import { QRCodeSVG } from "qrcode.react"

interface QRCodeDisplayProps {
  /** Seconds left until next rotation */
  secondsLeft: number
  /** Total countdown seconds */
  totalSeconds: number
  /** Whether the QR just flashed (rotated) */
  isFlashing: boolean
  /** The current QR token UUID to encode */
  tokenValue: string
}

export function QRCodeDisplay({
  secondsLeft,
  totalSeconds,
  isFlashing,
  tokenValue,
}: QRCodeDisplayProps) {
  return (
    <div
      className={`relative rounded-2xl border-2 border-primary/20 bg-card p-4 shadow-[0_0_40px_-8px] shadow-primary/20 transition-all duration-200 ${
        isFlashing ? "scale-[1.02] shadow-primary/40" : ""
      }`}
    >
      <div className="mx-auto flex items-center justify-center" style={{ width: 280, height: 280 }}>
        <QRCodeSVG
          value={tokenValue || "loading"}
          size={280}
          level="H"
          includeMargin={true}
          bgColor="#ffffff"
          fgColor="#000000"
        />
      </div>

      {isFlashing && (
        <div className="pointer-events-none absolute inset-0 animate-pulse rounded-2xl bg-primary/10" />
      )}
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
          setTimeout(() => setIsFlashing(false), 300)
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
