"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { QrCode, ScanFace, MapPin, ArrowRight, Shield, Zap, Lock } from "lucide-react"
import { FALogo } from "@/components/fa-logo"
import { Button } from "@/components/ui/button"

/* ── Typewriter hook ── */
function useTypewriter(words: string[], speed = 80, pause = 2200) {
  const [display, setDisplay] = useState("")
  const [wordIndex, setWordIndex] = useState(0)
  const [charIndex, setCharIndex] = useState(0)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const current = words[wordIndex % words.length]
    const timeout = setTimeout(() => {
      if (!deleting) {
        setDisplay(current.slice(0, charIndex + 1))
        if (charIndex + 1 === current.length) {
          setTimeout(() => setDeleting(true), pause)
        } else {
          setCharIndex(c => c + 1)
        }
      } else {
        setDisplay(current.slice(0, charIndex - 1))
        if (charIndex - 1 === 0) {
          setDeleting(false)
          setWordIndex(w => w + 1)
          setCharIndex(0)
        } else {
          setCharIndex(c => c - 1)
        }
      }
    }, deleting ? speed / 2 : speed)
    return () => clearTimeout(timeout)
  }, [charIndex, deleting, wordIndex, words, speed, pause])

  return display
}

/* ── Scroll reveal ── */
function RevealSection({ children, className = "", delay = 0 }: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.1 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  return (
    <div ref={ref} className={className} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(28px)",
      transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
    }}>
      {children}
    </div>
  )
}

/* ── Animated border feature card ── */
function FeatureCard({ icon: Icon, title, description, delay }: {
  icon: React.ElementType
  title: string
  description: string
  delay: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [hovered, setHovered] = useState(false)
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.15 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(32px)",
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
    >
      <div
        className="relative overflow-hidden rounded-2xl bg-card p-px"
        style={{
          background: hovered
            ? "linear-gradient(135deg, #2563EB 0%, #7c3aed 50%, #0ea5e9 100%)"
            : "linear-gradient(135deg, #e2e8f0 0%, #e2e8f0 100%)",
          transition: "background 0.4s ease",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div
          className="relative flex flex-col items-center rounded-2xl bg-card p-8 text-center"
          style={{
            transform: hovered ? "translateY(-2px)" : "translateY(0)",
            transition: "transform 0.3s ease",
          }}
        >
          <div
            className="mb-5 flex size-16 items-center justify-center rounded-2xl transition-all duration-300"
            style={{
              background: hovered ? "rgba(37,99,235,0.15)" : "rgba(37,99,235,0.08)",
              transform: hovered ? "scale(1.1)" : "scale(1)",
            }}
          >
            <Icon className="text-[#2563EB]" size={30} strokeWidth={1.5} />
          </div>
          <h3 className="mb-3 text-lg font-bold text-card-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  )
}

const features = [
  {
    icon: QrCode,
    title: "Dynamic QR Codes",
    description: "Teachers generate rotating QR codes every 15 seconds. Each code is unique, time-bound, and class-specific. Zero proxy attendance.",
  },
  {
    icon: ScanFace,
    title: "Face Verification",
    description: "Students verify identity through face recognition on the mobile app. AI-powered biometrics ensure only the real student can mark attendance.",
  },
  {
    icon: MapPin,
    title: "Geofence Security",
    description: "Students must be physically inside campus to mark attendance. Precise GPS boundary enforcement — verified automatically in real time.",
  },
]

const pillFeatures = [
  { icon: Shield, label: "Secure by default" },
  { icon: Zap, label: "Real-time sync" },
  { icon: Lock, label: "Role-based access" },
]

export default function HomePage() {
  const typed = useTypewriter(["NNRG College", "Smart Classrooms", "Modern Campus"])

  return (
    <div className="flex min-h-svh flex-col bg-background overflow-x-hidden">

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <FALogo size="sm" variant="blue" />
            <span className="text-lg font-bold tracking-tight text-foreground">
              Factor Attendance
            </span>
          </div>
          <Button asChild size="sm" className="gap-1.5 bg-[#2563EB] text-white hover:bg-[#1d4ed8]">
            <Link href="/login" className="flex items-center gap-1.5">
              Sign In <ArrowRight size={14} />
            </Link>
          </Button>
        </nav>
      </header>

      {/* ── Hero ── */}
      <section className="relative flex flex-col items-center justify-center overflow-hidden px-4 py-24 sm:py-32 md:py-44 text-center">

        {/* Floating orbs */}
        <div className="pointer-events-none absolute -top-48 -left-48 size-150 rounded-full bg-[#2563EB]/8 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 size-125 rounded-full bg-[#7c3aed]/6 blur-3xl" />
        <div className="pointer-events-none absolute top-1/3 left-1/2 size-75 -translate-x-1/2 rounded-full bg-[#0ea5e9]/5 blur-3xl" />

        {/* Dot grid */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(37,99,235,0.08) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center" style={{
          animation: "heroEnter 0.9s cubic-bezier(0.16,1,0.3,1) both",
        }}>
          {/* Pills */}
          <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
            {pillFeatures.map((p, i) => (
              <div
                key={p.label}
                className="flex items-center gap-1.5 rounded-full border border-[#2563EB]/20 bg-[#2563EB]/5 px-3 py-1.5 text-xs font-semibold text-[#2563EB]"
                style={{ animation: `pillEnter 0.5s ease ${200 + i * 100}ms both` }}
              >
                <p.icon size={11} />
                {p.label}
              </div>
            ))}
          </div>

          {/* Heading */}
          <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl leading-[1.1]">
            Smart Attendance
            <br />
            <span className="text-[#2563EB]">
              for{" "}
              <span>{typed}</span>
              <span style={{
                display: "inline-block",
                animation: "blink 1s step-end infinite",
                fontWeight: 300,
                marginLeft: 2,
              }}>|</span>
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-base text-muted-foreground sm:text-lg leading-relaxed">
            A secure, modern attendance system powered by QR codes,
            face verification, and geofence technology — built for the future of education.
          </p>

          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-13 rounded-xl bg-[#2563EB] px-9 text-base font-semibold text-white shadow-lg shadow-[#2563EB]/30 transition-all duration-300 hover:bg-[#1d4ed8] hover:shadow-[#2563EB]/40 hover:scale-[1.02]"
            >
              <Link href="/login" className="flex items-center gap-2">
                Sign In to Portal <ArrowRight size={16} />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="relative border-t border-border bg-muted/30 px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <RevealSection className="mb-14 text-center">
            <div className="mx-auto mb-4 flex w-fit items-center gap-2 rounded-full border border-[#2563EB]/20 bg-[#2563EB]/5 px-4 py-1.5 text-xs font-bold text-[#2563EB] uppercase tracking-widest">
              How It Works
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Three layers of security
            </h2>
            <p className="mt-3 text-muted-foreground max-w-lg mx-auto text-sm sm:text-base">
              Every attendance mark goes through QR verification, face recognition, and geofence check simultaneously.
            </p>
          </RevealSection>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => (
              <FeatureCard
                key={feature.title}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                delay={i * 120}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="px-4 py-20 sm:py-24">
        <RevealSection>
          <div className="mx-auto max-w-4xl">
            <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-[#2563EB] via-[#1d4ed8] to-[#1e40af] px-8 py-16 text-center shadow-2xl shadow-[#2563EB]/25">
              {/* Inner orbs */}
              <div className="pointer-events-none absolute -top-16 -right-16 size-64 rounded-full bg-white/8 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-16 -left-16 size-48 rounded-full bg-white/8 blur-3xl" />

              <div className="relative z-10">
                <h2 className="text-3xl font-bold text-white sm:text-4xl">
                  Ready to modernize attendance?
                </h2>
                <p className="mt-4 text-white/70 max-w-md mx-auto text-sm sm:text-base">
                  Sign in to your admin or teacher portal and start managing attendance intelligently.
                </p>
                <Button
                  asChild
                  size="lg"
                  className="mt-8 h-12 rounded-xl bg-white px-8 text-base font-bold text-[#2563EB] hover:bg-white/90 shadow-lg transition-all duration-300 hover:scale-[1.02]"
                >
                  <Link href="/login" className="flex items-center gap-2">
                    Get Started <ArrowRight size={16} />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </RevealSection>
      </section>

      {/* ── Footer ── */}
      <footer className="mt-auto border-t border-border px-4 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2.5">
            <FALogo size="sm" variant="blue" />
            <span className="text-sm font-bold text-foreground">Factor Attendance</span>
          </div>
          <p className="text-sm text-muted-foreground">NNRG College — Smart Attendance System</p>
        </div>
      </footer>

      {/* ── Global animations ── */}
      <style>{`
        @keyframes heroEnter {
          from { opacity: 0; transform: translateY(28px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pillEnter {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}