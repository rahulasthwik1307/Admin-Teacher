"use client"

import { useEffect, useState } from "react"

export function CursorGlow() {
  const [pos, setPos] = useState({ x: -200, y: -200 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  return (
    <div
      className="pointer-events-none fixed inset-0 z-30 overflow-hidden transition-opacity duration-300 hidden md:block"
      aria-hidden="true"
    >
      <div
        className="pointer-events-none absolute size-50 rounded-full blur-3xl opacity-40 transition-transform duration-75 ease-out gpu-accelerated"
        style={{
          transform: `translate3d(${pos.x - 100}px, ${pos.y - 100}px, 0)`,
          background: "radial-gradient(circle, rgba(14,165,233,0.3) 0%, rgba(109,40,217,0.2) 60%, transparent 100%)",
        }}
      />
    </div>
  )
}
