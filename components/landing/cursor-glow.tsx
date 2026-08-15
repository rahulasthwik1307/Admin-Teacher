"use client"

import { useEffect, useState } from "react"

export function CursorGlow() {
  const [pos, setPos] = useState({ x: -200, y: -200 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener("mousemove", handleMouseMove, { passive: true })
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  return (
    <div
      className="pointer-events-none fixed inset-0 z-30 overflow-hidden transition-opacity duration-300 hidden md:block"
      aria-hidden="true"
    >
      {/* Layer 1: Slower-Following Outer Halo (Soft Royal Violet with 500ms easing lag for parallax depth) */}
      <div
        className="pointer-events-none absolute top-0 left-0 transition-transform duration-500 ease-out gpu-accelerated"
        style={{
          transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
        }}
      >
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 size-80 sm:size-96 rounded-full blur-3xl opacity-40"
          style={{
            background: "radial-gradient(circle, rgba(109,40,217,0.18) 0%, rgba(147,51,234,0.06) 45%, transparent 70%)",
          }}
        />
      </div>

      {/* Layer 2: Fast-Following Bright Core (Luminous Sky Blue with 100ms response) */}
      <div
        className="pointer-events-none absolute top-0 left-0 transition-transform duration-100 ease-out gpu-accelerated"
        style={{
          transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
        }}
      >
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 size-28 sm:size-32 rounded-full blur-xl opacity-65"
          style={{
            background: "radial-gradient(circle, rgba(14,165,233,0.35) 0%, rgba(56,189,248,0.12) 50%, transparent 75%)",
          }}
        />
      </div>
    </div>
  )
}

