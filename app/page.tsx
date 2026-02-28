"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { QrCode, ScanFace, MapPin } from "lucide-react"
import { FALogo } from "@/components/fa-logo"
import { Button } from "@/components/ui/button"

const features = [
  {
    icon: QrCode,
    title: "Dynamic QR Codes",
    description:
      "Teachers generate rotating QR codes every 15 seconds. Each code is unique, time-bound, and class-specific.",
  },
  {
    icon: ScanFace,
    title: "Face Verification",
    description:
      "Students verify their identity through face recognition on their mobile app. No proxy attendance possible.",
  },
  {
    icon: MapPin,
    title: "Geofence Security",
    description:
      "Students must be physically inside campus to mark attendance. Location is verified automatically.",
  },
]

const stats = [
  { value: "200+", label: "Students" },
  { value: "15+", label: "Teachers" },
  { value: "99%", label: "Accuracy" },
]

export default function HomePage() {
  const heroRef = useRef<HTMLDivElement>(null)
  const featuresRef = useRef<HTMLDivElement>(null)
  const statsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-in")
          }
        })
      },
      { threshold: 0.1 }
    )

    const refs = [heroRef.current, featuresRef.current, statsRef.current]
    refs.forEach((ref) => {
      if (ref) observer.observe(ref)
    })

    return () => observer.disconnect()
  }, [])

  return (
    <div className="flex min-h-svh flex-col bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <FALogo size="sm" variant="blue" />
            <span className="text-lg font-semibold tracking-tight text-foreground">
              Factor Attendance
            </span>
          </div>
          <Button
            asChild
            className="bg-[#2563EB] text-white hover:bg-[#1d4ed8]"
            size="sm"
          >
            <Link href="/login">Sign In</Link>
          </Button>
        </nav>
      </header>

      {/* Hero */}
      <section
        ref={heroRef}
        className="fade-section flex flex-col items-center justify-center px-4 py-20 sm:py-28 md:py-36 text-center"
      >
        <FALogo size="lg" variant="blue" className="mb-8" />
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl text-balance">
          Smart Attendance for NNRG College
        </h1>
        <p className="mt-6 max-w-xl text-base text-muted-foreground sm:text-lg leading-relaxed text-pretty">
          A secure, modern attendance system powered by QR codes, face
          verification, and geofence technology — built for teachers and
          students.
        </p>
        <Button
          asChild
          size="lg"
          className="mt-10 h-12 rounded-lg bg-[#2563EB] px-8 text-base font-medium text-white hover:bg-[#1d4ed8]"
        >
          <Link href="/login">Sign In to Portal</Link>
        </Button>
      </section>

      {/* Features */}
      <section
        ref={featuresRef}
        className="fade-section border-t border-border bg-muted/40 px-4 py-20 sm:py-24"
      >
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-14 text-center text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            How It Works
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group flex flex-col items-center rounded-xl border border-border bg-card p-8 text-center transition-shadow hover:shadow-md"
              >
                <div className="mb-5 flex size-14 items-center justify-center rounded-xl bg-[#2563EB]/10">
                  <feature.icon
                    className="text-[#2563EB]"
                    size={28}
                    strokeWidth={1.5}
                  />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-card-foreground">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section
        ref={statsRef}
        className="fade-section px-4 py-20 sm:py-24"
      >
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-10 sm:flex-row sm:justify-center sm:gap-16 md:gap-24">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-1">
              <span className="text-4xl font-bold text-[#2563EB] sm:text-5xl">
                {stat.value}
              </span>
              <span className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border px-4 py-8">
        <p className="text-center text-sm text-muted-foreground">
          Factor Attendance — NNRG College
        </p>
      </footer>
    </div>
  )
}
