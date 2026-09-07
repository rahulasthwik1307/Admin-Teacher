"use client"

import { useEffect, useState, useRef } from "react"
import { usePathname, useSearchParams } from "next/navigation"

export function NavigationProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const loadingRef = useRef(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null)

  // When pathname or searchParams change, complete and fade out
  useEffect(() => {
    if (!loadingRef.current) return
    loadingRef.current = false

    if (timerRef.current) clearInterval(timerRef.current)

    const animFrame = requestAnimationFrame(() => {
      setProgress(100)
    })

    resetTimerRef.current = setTimeout(() => {
      setVisible(false)
      setProgress(0)
    }, 250)

    return () => {
      cancelAnimationFrame(animFrame)
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
    }
  }, [pathname, searchParams])

  // Intercept click on internal links to provide instantaneous 0ms feedback
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a")
      if (!target) return

      const href = target.getAttribute("href")
      if (!href) return

      // Ignore hash links, external links, downloads, target="_blank", mailto/tel
      if (
        href.startsWith("#") ||
        href.startsWith("http://") ||
        href.startsWith("https://") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        target.target === "_blank" ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return
      }

      // Ignore if clicking the link to the current exact path
      const currentUrl = window.location.pathname + window.location.search
      if (href === currentUrl || href === pathname) {
        return
      }

      // Start progress immediately
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
      if (timerRef.current) clearInterval(timerRef.current)

      loadingRef.current = true
      setVisible(true)
      setProgress(15)

      // Increment progress realistically while waiting for the route to load
      let currentProgress = 15
      timerRef.current = setInterval(() => {
        currentProgress += (85 - currentProgress) * 0.15
        setProgress(currentProgress)
      }, 120)
    }

    document.addEventListener("click", handleLinkClick, { capture: true })
    return () => {
      document.removeEventListener("click", handleLinkClick, { capture: true })
      if (timerRef.current) clearInterval(timerRef.current)
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
    }
  }, [pathname])

  if (!visible) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-9999 pointer-events-none h-[2.5px] overflow-hidden"
      aria-hidden="true"
    >
      <div
        className="h-full bg-linear-to-r from-primary via-indigo-500 to-cyan-400 shadow-[0_0_8px_rgba(37,99,235,0.6)]"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
          transition:
            progress === 100
              ? "width 150ms ease-out, opacity 250ms ease-in"
              : "width 200ms ease-out",
        }}
      />
    </div>
  )
}
