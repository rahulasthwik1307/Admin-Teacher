"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, UserCheck, ShieldCheck, ShieldAlert } from "lucide-react"
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
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)

  const placeholderEmail =
    role === "admin" ? "admin@nnrg.edu.in" : "teacher@nnrg.edu.in"

  // Read error param from URL (e.g. ?error=disabled set by middleware)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("error") === "disabled") {
      setAuthError("Your account has been disabled. Please contact the admin.")
    }
  }, [])

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

      // Role mismatch — user selected wrong role pill
      if (userRecord.role !== role) {
        setAuthError(
          role === "admin"
            ? "These credentials are not for an admin account."
            : "These credentials are not for a teacher account."
        )
        await supabase.auth.signOut()
        localStorage.removeItem("fa_user_role")
        setIsLoading(false)
        return
      }

      // Disabled teacher account check at login
      if (role === "teacher") {
        const { data: teacherRecord } = await supabase
          .from("teachers")
          .select("is_active")
          .eq("id", data.user.id)
          .maybeSingle()

        if (teacherRecord && teacherRecord.is_active === false) {
          setAuthError("Your account has been disabled. Please contact the admin.")
          await supabase.auth.signOut()
          setIsLoading(false)
          return
        }
      }

      // Role-based redirect
      if (userRecord.role === "admin") {
        localStorage.setItem("fa_user_role", "admin")
        router.push("/admin/dashboard")
      } else if (userRecord.role === "teacher" && userRecord.must_change_password) {
        localStorage.setItem("fa_user_role", "teacher")
        router.push("/change-password")
      } else {
        localStorage.setItem("fa_user_role", "teacher")
        router.push("/teacher/dashboard")
      }
    } catch {
      setAuthError("An unexpected error occurred. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {/* Role Switcher Segmented Control */}
      <div className="relative flex items-center p-1 rounded-xl bg-slate-100/90 border border-slate-200/80 shadow-inner">
        <button
          type="button"
          onClick={() => setRole("teacher")}
          className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            role === "teacher" ? "text-blue-700" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          {role === "teacher" && (
            <motion.div
              layoutId="activeRolePill"
              className="absolute inset-0 rounded-lg bg-white shadow-sm border border-blue-200/60"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <UserCheck className="relative z-10 size-4 text-blue-600" />
          <span className="relative z-10">Teacher Access</span>
        </button>

        <button
          type="button"
          onClick={() => setRole("admin")}
          className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            role === "admin" ? "text-purple-700" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          {role === "admin" && (
            <motion.div
              layoutId="activeRolePill"
              className="absolute inset-0 rounded-lg bg-white shadow-sm border border-purple-200/60"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <ShieldCheck className="relative z-10 size-4 text-purple-600" />
          <span className="relative z-10">Admin Access</span>
        </button>
      </div>

      {/* Email Input */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
          Email address
        </Label>
        <div className="relative group">
          <Mail
            className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors size-4.5 ${
              emailFocused
                ? role === "admin" ? "text-purple-600" : "text-blue-600"
                : "text-slate-400"
            }`}
            aria-hidden="true"
          />
          <input
            id="email"
            type="email"
            placeholder={placeholderEmail}
            value={email}
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
            onChange={(e) => {
              setEmail(e.target.value)
              if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }))
            }}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
            className={`h-11 w-full rounded-xl border bg-slate-50/90 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-200 outline-none ${
              errors.email
                ? "border-red-500 focus:ring-2 focus:ring-red-500/20"
                : "border-slate-200 hover:border-slate-300 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
            }`}
          />
        </div>
        {errors.email && (
          <p id="email-error" className="text-xs text-red-500 font-medium mt-0.5" role="alert">
            {errors.email}
          </p>
        )}
      </div>

      {/* Password Input */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
          Password
        </Label>
        <div className="relative group">
          <Lock
            className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors size-4.5 ${
              passwordFocused
                ? role === "admin" ? "text-purple-600" : "text-blue-600"
                : "text-slate-400"
            }`}
            aria-hidden="true"
          />
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            value={password}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            onChange={(e) => {
              setPassword(e.target.value)
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }))
            }}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "password-error" : undefined}
            className={`h-11 w-full rounded-xl border bg-slate-50/90 pl-10 pr-11 text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-200 outline-none ${
              errors.password
                ? "border-red-500 focus:ring-2 focus:ring-red-500/20"
                : "border-slate-200 hover:border-slate-300 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
            }`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1 cursor-pointer"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
          </button>
        </div>
        {errors.password && (
          <p id="password-error" className="text-xs text-red-500 font-medium mt-0.5" role="alert">
            {errors.password}
          </p>
        )}
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isLoading}
        size="lg"
        className="group relative h-11.5 w-full rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-sm shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-200 cursor-pointer overflow-hidden active:scale-[0.99]"
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          {isLoading ? (
            <>
              <Loader2 className="animate-spin size-4.5" />
              <span>Authenticating...</span>
            </>
          ) : (
            <>
              <span>Sign In to Portal</span>
              <ArrowRight className="size-4.5 group-hover:translate-x-1 transition-transform duration-200" />
            </>
          )}
        </span>
      </Button>

      {/* Error Alert Box */}
      <AnimatePresence>
        {authError && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium"
            role="alert"
          >
            <ShieldAlert className="size-4 shrink-0 text-red-500" />
            <span>{authError}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Security Footer Badge */}
      <div className="flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-500 pt-1 font-medium">
        <ShieldCheck className="size-3.5 text-emerald-600" />
        <span>Secure Staff Access • Factor Attendance Security</span>
      </div>
    </form>
  )
}
