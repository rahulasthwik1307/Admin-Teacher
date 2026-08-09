"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, UserCheck, ShieldCheck, ShieldAlert, GraduationCap, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"

type Role = "teacher" | "admin"

interface LoginFormProps {
  onRoleChange?: (role: Role) => void
}

export function LoginForm({ onRoleChange }: LoginFormProps) {
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

  const handleRoleSelect = (newRole: Role) => {
    setRole(newRole)
    if (onRoleChange) onRoleChange(newRole)
  }

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
    <div className="flex flex-col gap-5">
      {/* Prominent Role Portal Identity Header */}
      <AnimatePresence mode="wait">
        <motion.div
          key={role}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className={`flex items-center justify-between p-2.5 rounded-2xl border transition-colors shadow-xs ${
            role === "teacher"
              ? "bg-blue-50/80 border-blue-200/80"
              : "bg-purple-50/80 border-purple-200/80"
          }`}
        >
          {/* Portal Title & Icon */}
          <div className="flex items-center gap-2">
            <div
              className={`p-1.5 rounded-xl ${
                role === "teacher"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-purple-600 text-white shadow-xs"
              }`}
            >
              {role === "teacher" ? (
                <GraduationCap className="size-4" />
              ) : (
                <Shield className="size-4" />
              )}
            </div>
            <div className="flex flex-col text-left">
              <span
                className={`text-[11px] font-extrabold tracking-wider uppercase ${
                  role === "teacher" ? "text-blue-900" : "text-purple-900"
                }`}
              >
                {role === "teacher" ? "TEACHER PORTAL" : "ADMIN PORTAL"}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                {role === "teacher" ? "Faculty Authentication" : "System Administration"}
              </span>
            </div>
          </div>

          {/* Dynamic Role Status Pill */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-bold tracking-tight shadow-2xs ${
              role === "teacher"
                ? "bg-white border-blue-200 text-blue-700"
                : "bg-white border-purple-200 text-purple-700"
            }`}
          >
            <span
              className={`size-1.5 rounded-full animate-pulse ${
                role === "teacher" ? "bg-blue-500" : "bg-purple-500"
              }`}
            />
            <span>{role === "teacher" ? "TEACHER MODE" : "ADMIN MODE"}</span>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Primary Welcome Title */}
      <div className="flex flex-col gap-0.5 text-left">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Welcome Back
        </h2>
        <p className="text-xs font-medium text-slate-500">
          Secure access to Factor Attendance portal
        </p>
      </div>

      {/* Form Section */}
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3.5">
        {/* Role Switcher Segmented Control Bar */}
        <div className="relative flex items-center p-1 rounded-xl bg-slate-100/90 border border-slate-200/80 shadow-inner">
          <button
            type="button"
            onClick={() => handleRoleSelect("teacher")}
            className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              role === "teacher" ? "text-blue-700" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {role === "teacher" && (
              <motion.div
                layoutId="activeRolePill"
                className="absolute inset-0 rounded-lg bg-white shadow-xs border border-blue-200/80"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <UserCheck className="relative z-10 size-4 text-blue-600" />
            <span className="relative z-10">Teacher Access</span>
          </button>

          <button
            type="button"
            onClick={() => handleRoleSelect("admin")}
            className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              role === "admin" ? "text-purple-700" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {role === "admin" && (
              <motion.div
                layoutId="activeRolePill"
                className="absolute inset-0 rounded-lg bg-white shadow-xs border border-purple-200/80"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <ShieldCheck className="relative z-10 size-4 text-purple-600" />
            <span className="relative z-10">Admin Access</span>
          </button>
        </div>

        {/* Email Input Field */}
        <div className="flex flex-col gap-1">
          <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
            Email address
          </Label>
          <div className="relative group">
            <Mail
              className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors size-4 ${
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
              className={`h-10.5 w-full rounded-xl border bg-white/80 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-200 outline-none ${
                errors.email
                  ? "border-red-500 focus:ring-2 focus:ring-red-500/20"
                  : role === "admin"
                  ? "border-purple-200/90 hover:border-purple-300 focus:bg-white focus:border-purple-600 focus:ring-4 focus:ring-purple-600/10"
                  : "border-blue-200/90 hover:border-blue-300 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
              }`}
            />
          </div>
          {errors.email && (
            <p id="email-error" className="text-xs text-red-500 font-medium mt-0.5" role="alert">
              {errors.email}
            </p>
          )}
        </div>

        {/* Password Input Field */}
        <div className="flex flex-col gap-1">
          <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
            Password
          </Label>
          <div className="relative group">
            <Lock
              className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors size-4 ${
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
              className={`h-10.5 w-full rounded-xl border bg-white/80 pl-10 pr-11 text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-200 outline-none ${
                errors.password
                  ? "border-red-500 focus:ring-2 focus:ring-red-500/20"
                  : role === "admin"
                  ? "border-purple-200/90 hover:border-purple-300 focus:bg-white focus:border-purple-600 focus:ring-4 focus:ring-purple-600/10"
                  : "border-blue-200/90 hover:border-blue-300 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1 cursor-pointer"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
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
          className={`group relative h-11 w-full rounded-xl text-white font-semibold text-sm shadow-md transition-all duration-300 cursor-pointer overflow-hidden active:scale-[0.99] ${
            role === "admin"
              ? "bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-purple-500/20 hover:shadow-purple-500/30"
              : "bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/20 hover:shadow-blue-500/30"
          }`}
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            {isLoading ? (
              <>
                <Loader2 className="animate-spin size-4" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Sign In to Portal</span>
                <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform duration-200" />
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
              className="flex items-center gap-2 p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium"
              role="alert"
            >
              <ShieldAlert className="size-4 shrink-0 text-red-500" />
              <span>{authError}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Compact Premium Security Status Chip */}
        <AnimatePresence mode="wait">
          <motion.div
            key={role}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className={`mx-auto w-fit max-w-full h-8.5 px-4 rounded-full border flex items-center justify-center gap-2 text-[11px] font-semibold tracking-tight shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 cursor-default select-none ${
              role === "teacher"
                ? "bg-blue-100/80 border-blue-300/80 text-blue-950 hover:bg-blue-200/70 hover:border-blue-400 shadow-blue-500/10"
                : "bg-purple-100/80 border-purple-300/80 text-purple-950 hover:bg-purple-200/70 hover:border-purple-400 shadow-purple-500/10"
            }`}
          >
            {role === "teacher" ? (
              <>
                <UserCheck className="size-3.5 shrink-0 text-blue-600" />
                <span className="truncate">
                  Secure Faculty Access
                </span>
              </>
            ) : (
              <>
                <ShieldCheck className="size-3.5 shrink-0 text-purple-600" />
                <span className="truncate">
                  Secure Administrator Access
                </span>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </form>
    </div>
  )
}
