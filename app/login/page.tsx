import type { Metadata } from "next"
import { QrCode, ScanFace, MapPin } from "lucide-react"
import { FALogo } from "@/components/fa-logo"
import { LoginForm } from "@/components/login-form"

export const metadata: Metadata = {
  title: "Sign In — Factor Attendance",
  description: "Sign in to Factor Attendance portal for NNRG College staff.",
}

const features = [
  { icon: QrCode, label: "QR Based Attendance" },
  { icon: ScanFace, label: "Face Verification" },
  { icon: MapPin, label: "Geofence Secured" },
]

export default function LoginPage() {
  return (
    <div className="flex min-h-svh flex-col lg:flex-row">
      {/* Left brand panel — hidden on mobile, shown on lg+ */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center relative overflow-hidden bg-gradient-to-br from-[#2563EB] to-[#1e40af] px-12">
        {/* Subtle decorative circles */}
        <div className="absolute -top-24 -left-24 size-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -right-32 size-[500px] rounded-full bg-white/5" />

        <div className="relative z-10 flex flex-col items-center gap-6 text-center">
          <FALogo size="lg" variant="white" />
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-white text-balance">
              Factor Attendance
            </h1>
            <p className="text-base text-white/60">
              Smart Attendance for NNRG College
            </p>
          </div>
        </div>

        {/* Feature highlights at the bottom */}
        <div className="absolute bottom-10 left-0 right-0 flex items-center justify-center gap-8 px-8">
          {features.map((f) => (
            <div
              key={f.label}
              className="flex items-center gap-2 text-white/50"
            >
              <f.icon size={16} strokeWidth={1.5} />
              <span className="text-xs font-medium">{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-12 lg:px-12">
        {/* Mobile-only header */}
        <div className="mb-8 flex flex-col items-center gap-3 lg:hidden">
          <FALogo size="sm" variant="blue" />
          <span className="text-lg font-semibold text-foreground tracking-tight">
            Factor Attendance
          </span>
        </div>

        {/* Form card */}
        <div className="w-full max-w-sm">
          <div className="rounded-xl border border-border bg-card p-8 shadow-sm dark:shadow-none">
            <div className="mb-6 flex flex-col gap-1">
              <h2 className="text-xl font-semibold text-card-foreground tracking-tight">
                Welcome Back
              </h2>
              <p className="text-sm text-muted-foreground">
                Sign in to your account
              </p>
            </div>

            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  )
}
