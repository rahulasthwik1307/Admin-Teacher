"use client"

import { useMemo } from "react"

interface RealQRCodeProps {
  size?: number
  seed?: number
  className?: string
  darkColor?: string
  lightColor?: string
}

// Generate a deterministic 21x21 QR code matrix based on seed
function generateQRMatrix(seed: number = 0): boolean[][] {
  const N = 21
  const matrix: boolean[][] = Array.from({ length: N }, () => Array(N).fill(false))

  // Helper to draw Finder Pattern (7x7)
  const drawFinder = (row: number, col: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (
          r === 0 || r === 6 || col + c === col || col + c === col + 6 ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        ) {
          matrix[row + r][col + c] = true
        } else {
          matrix[row + r][col + c] = false
        }
      }
    }
  }

  // Draw 3 Corner Finder Patterns
  drawFinder(0, 0)
  drawFinder(0, N - 7)
  drawFinder(N - 7, 0)

  // Separators (white spaces around finders)
  const isFinderArea = (r: number, c: number) => {
    if (r < 8 && c < 8) return true
    if (r < 8 && c >= N - 8) return true
    if (r >= N - 8 && c < 8) return true
    return false
  }

  // Timing patterns (Row 6 and Col 6)
  for (let i = 8; i < N - 8; i++) {
    if (i % 2 === 0) {
      matrix[6][i] = true
      matrix[i][6] = true
    }
  }

  // Alignment pattern at (16, 16) for Version 2/standard look
  const drawAlignment = (row: number, col: number) => {
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        if (Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0)) {
          matrix[row + r][col + c] = true
        }
      }
    }
  }
  drawAlignment(14, 14)

  // Pseudo-random data modules based on seed
  let pseudoRandom = seed * 1664525 + 1013904223
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (isFinderArea(r, c)) continue
      if (r === 6 || c === 6) continue
      if (Math.abs(r - 14) <= 2 && Math.abs(c - 14) <= 2) continue

      pseudoRandom = (pseudoRandom * 1664525 + 1013904223) % 4294967296
      // Set module to dark if pseudoRandom mod 100 > 45
      matrix[r][c] = pseudoRandom % 100 > 45
    }
  }

  return matrix
}

export function RealQRCode({
  size = 140,
  seed = 1,
  className = "",
  darkColor = "#111827",
  lightColor = "#FFFFFF",
}: RealQRCodeProps) {
  const matrix = useMemo(() => generateQRMatrix(seed), [seed])
  const N = matrix.length
  const cellSize = 100 / N

  return (
    <div
      className={`relative inline-block rounded-xl overflow-hidden shadow-md p-2 border border-slate-200/80 transition-all duration-500 ${className}`}
      style={{ backgroundColor: lightColor, width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        shapeRendering="crispEdges"
      >
        <rect width="100" height="100" fill={lightColor} />
        {matrix.map((row, r) =>
          row.map((cell, c) =>
            cell ? (
              <rect
                key={`${r}-${c}`}
                x={c * cellSize}
                y={r * cellSize}
                width={cellSize}
                height={cellSize}
                fill={darkColor}
                rx={0.2}
              />
            ) : null
          )
        )}
      </svg>
    </div>
  )
}
