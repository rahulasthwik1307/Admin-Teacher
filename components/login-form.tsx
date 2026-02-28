"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"

type Role = "teacher" | "admin"

export function LoginForm() {
  const router = useRouter()
  const [role, setRole] = useState<Role>("teacher")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [isLoading, setIsLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  const placeholderEmail =
    role === "admin" ? "admin@nnrg.edu.in" : "teacher@nnrg.edu.in"

  function validate() {
    const newErrors: { email?: string; password?: string } = {}

    if (!email.trim()) {
      newErrors.email = "Email is required."
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address."
    }

    if (!password.trim()) {
      newErrors.password = "Password is required."
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!validate()) return

    setIsLoading(true)
    setAuthError(null)

    try {
      const supabase = createClient()

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setAuthError(error.message)
        setIsLoading(false)
        return
      }

      // Fetch user role and must_change_password from public.users
      const { data: userRecord, error: userError } = await supabase
        .from("users")
        .select("role, must_change_password")
        .eq("id", data.user.id)
        .single()

      if (userError || !userRecord) {
        console.error("User profile fetch error:", userError)
        setAuthError("Failed to fetch user profile. Please try again.")
        setIsLoading(false)
        return
      }

      // Role-based redirect
      if (userRecord.role === "admin") {
        router.push("/admin/dashboard")
      } else if (userRecord.role === "teacher" && userRecord.must_change_password) {
        router.push("/change-password")
      } else {
        router.push("/teacher/dashboard")
      }
    } catch {
      setAuthError("An unexpected error occurred. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      {/* Role selector pills */}
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-1">
        <button
          type="button"
          onClick={() => setRole("teacher")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all ${
            role === "teacher"
              ? "bg-[#2563EB] text-white shadow-sm"
              : "bg-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Teacher
        </button>
        <button
          type="button"
          onClick={() => setRole("admin")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all ${
            role === "admin"
              ? "bg-[#2563EB] text-white shadow-sm"
              : "bg-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Admin
        </button>
      </div>

      {/* Email */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="email" className="text-foreground">
          Email address
        </Label>
        <div className="relative">
          <Mail
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={18}
            aria-hidden="true"
          />
          <input
            id="email"
            type="email"
            placeholder={placeholderEmail}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }))
            }}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
            className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none dark:bg-muted/50"
          />
        </div>
        {errors.email && (
          <p id="email-error" className="text-sm text-destructive" role="alert">
            {errors.email}
          </p>
        )}
      </div>

      {/* Password */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="password" className="text-foreground">
          Password
        </Label>
        <div className="relative">
          <Lock
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={18}
            aria-hidden="true"
          />
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }))
            }}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "password-error" : undefined}
            className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-11 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none dark:bg-muted/50"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {errors.password && (
          <p id="password-error" className="text-sm text-destructive" role="alert">
            {errors.password}
          </p>
        )}
      </div>

      {/* Submit */}
      <Button
        type="submit"
        disabled={isLoading}
        className="h-11 w-full rounded-lg bg-[#2563EB] text-white font-medium text-sm hover:bg-[#1d4ed8] transition-colors cursor-pointer"
        size="lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="animate-spin" size={18} />
            Signing in...
          </>
        ) : (
          <>
            Sign In
            <ArrowRight size={18} />
          </>
        )}
      </Button>

      {authError && (
        <p className="text-center text-sm text-red-500 font-medium" role="alert">
          {authError}
        </p>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Access is restricted to authorized staff only.
      </p>
    </form>
  )
}
