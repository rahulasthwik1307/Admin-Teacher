"use client"

import { useEffect, useState } from "react"

export function LoginCursorFollower() {
  const [pos, setPos] = useState({ x: -200, y: -200 })
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Disable on reduced-motion or touch/mobile screens
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      window.innerWidth < 768
    ) {
      return
    }

    const handleMouseMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY })
      if (!isVisible) setIsVisible(true)
    }

    const handleMouseLeave = () => setIsVisible(false)

    window.addEventListener("mousemove", handleMouseMove)
    document.body.addEventListener("mouseleave", handleMouseLeave)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      document.body.removeEventListener("mouseleave", handleMouseLeave)
    }
  }, [isVisible])

  if (!isVisible) return null

  return (
    <div
      className="pointer-events-none fixed inset-0 z-30 overflow-hidden transition-opacity duration-500 hidden md:block"
      aria-hidden="true"
    >
      <div
        className="pointer-events-none absolute size-44 rounded-full blur-3xl opacity-25 transition-transform duration-100 ease-out gpu-accelerated"
        style={{
          transform: `translate3d(${pos.x - 88}px, ${pos.y - 88}px, 0)`,
          background:
            "radial-gradient(circle, rgba(14,165,233,0.3) 0%, rgba(37,99,235,0.15) 60%, transparent 100%)",
        }}
      />
    </div>
  )
}
