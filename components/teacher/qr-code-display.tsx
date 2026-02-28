"use client"

import { useEffect, useState, useCallback } from "react"

/**
 * Generates a deterministic grid-based QR-like pattern from a seed.
 * This is purely visual — not a real scannable QR code.
 */
function generateQRPattern(seed: number): boolean[][] {
  const size = 25
  const grid: boolean[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => false)
  )

  // Draw finder patterns (3 corners)
  const drawFinder = (row: number, col: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isOuter = r === 0 || r === 6 || c === 0 || c === 6
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4
        grid[row + r][col + c] = isOuter || isInner
      }
    }
  }

  drawFinder(0, 0)
  drawFinder(0, size - 7)
  drawFinder(size - 7, 0)

  // Timing patterns
  for (let i = 7; i < size - 7; i++) {
    grid[6][i] = i % 2 === 0
    grid[i][6] = i % 2 === 0
  }

  // Pseudorandom data modules from seed
  let rng = seed
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      // Skip finder + timing regions
      if (
        (r < 8 && c < 8) ||
        (r < 8 && c >= size - 8) ||
        (r >= size - 8 && c < 8) ||
        r === 6 ||
        c === 6
      )
        continue
      rng = (rng * 1103515245 + 12345) & 0x7fffffff
      grid[r][c] = rng % 3 !== 0
    }
  }

  return grid
}

interface QRCodeDisplayProps {
  /** Seconds left until next rotation */
  secondsLeft: number
  /** Total countdown seconds */
  totalSeconds: number
  /** Whether the QR just flashed (rotated) */
  isFlashing: boolean
}

export function QRCodeDisplay({
  secondsLeft,
  totalSeconds,
  isFlashing,
}: QRCodeDisplayProps) {
  const [seed, setSeed] = useState(() => Date.now())

  // Regenerate pattern when timer resets
  useEffect(() => {
    if (secondsLeft === totalSeconds) {
      setSeed(Date.now())
    }
  }, [secondsLeft, totalSeconds])

  const pattern = generateQRPattern(seed)

  return (
    <div
      className={`relative rounded-2xl border-2 border-primary/20 bg-card p-4 shadow-[0_0_40px_-8px] shadow-primary/20 transition-all duration-200 ${
        isFlashing ? "scale-[1.02] shadow-primary/40" : ""
      }`}
    >
      <svg
        viewBox="0 0 250 250"
        className="mx-auto size-[280px] max-w-full"
        role="img"
        aria-label="Rotating QR code for attendance"
      >
        <rect width="250" height="250" fill="white" rx="4" />
        {pattern.map((row, r) =>
          row.map(
            (cell, c) =>
              cell && (
                <rect
                  key={`${r}-${c}`}
                  x={r * 10}
                  y={c * 10}
                  width="10"
                  height="10"
                  fill="#111827"
                  rx="1"
                />
              )
          )
        )}
      </svg>

      {isFlashing && (
        <div className="pointer-events-none absolute inset-0 animate-pulse rounded-2xl bg-primary/10" />
      )}
    </div>
  )
}

/**
 * Hook that manages the 15-second countdown timer for QR rotation.
 */
export function useQRTimer(isActive: boolean, isPaused: boolean) {
  const TOTAL = 15
  const [secondsLeft, setSecondsLeft] = useState(TOTAL)
  const [isFlashing, setIsFlashing] = useState(false)

  const reset = useCallback(() => {
    setSecondsLeft(TOTAL)
  }, [])

  useEffect(() => {
    if (!isActive || isPaused) return

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          // Flash then reset
          setIsFlashing(true)
          setTimeout(() => setIsFlashing(false), 300)
          return TOTAL
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isActive, isPaused])

  return { secondsLeft, totalSeconds: TOTAL, isFlashing, reset }
}
