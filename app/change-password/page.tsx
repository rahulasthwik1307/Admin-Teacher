"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Lock, Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { FALogo } from "@/components/fa-logo"
import { createClient } from "@/lib/supabase/client"

type Strength = "weak" | "fair" | "strong"

function getPasswordStrength(password: string): { strength: Strength; percent: number } {
  if (!password) return { strength: "weak", percent: 0 }

  let score = 0
  if (password.length >= 8) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  if (password.length >= 12) score++

  if (score <= 1) return { strength: "weak", percent: 33 }
  if (score <= 2) return { strength: "fair", percent: 66 }
  return { strength: "strong", percent: 100 }
}

const strengthConfig: Record<Strength, { color: string; barColor: string; label: string }> = {
  weak: { color: "text-red-500", barColor: "bg-red-500", label: "Weak" },
  fair: { color: "text-amber-500", barColor: "bg-amber-500", label: "Fair" },
  strong: { color: "text-emerald-500", barColor: "bg-emerald-500", label: "Strong" },
}

export default function ChangePasswordPage() {
  const router = useRouter()

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [errors, setErrors] = useState<{
    current?: string
    newPw?: string
    confirm?: string
  }>({})

  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  const { strength, percent } = getPasswordStrength(newPassword)
  const cfg = strengthConfig[strength]

  function validate() {
    const newErrors: typeof errors = {}

    if (!currentPassword.trim()) {
      newErrors.current = "Current password is required."
    }

    if (!newPassword.trim()) {
      newErrors.newPw = "New password is required."
    } else if (newPassword.length < 8) {
      newErrors.newPw = "Password must be at least 8 characters."
    }

    if (!confirmPassword.trim()) {
      newErrors.confirm = "Please confirm your new password."
    } else if (newPassword !== confirmPassword) {
      newErrors.confirm = "Passwords do not match."
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

      // Update the user's password in Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) {
        setAuthError(updateError.message)
        setIsLoading(false)
        return
      }

      // Get the current user
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Set must_change_password to false in public.users
        const { error: dbError } = await supabase
          .from("users")
          .update({ must_change_password: false })
          .eq("id", user.id)

        if (dbError) {
          setAuthError("Password updated but failed to update profile. Please contact admin.")
          setIsLoading(false)
          return
        }
      }

      setIsLoading(false)
      setIsSuccess(true)

      setTimeout(() => {
        router.push("/teacher/dashboard")
      }, 1500)
    } catch {
      setAuthError("An unexpected error occurred. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
          {isSuccess ? (
            <div className="flex flex-col items-center gap-4 py-8 text-center animate-in fade-in zoom-in-95 duration-300">
              <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="size-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-semibold text-card-foreground tracking-tight">
                Password Updated
              </h2>
              <p className="text-sm text-muted-foreground">
                Redirecting you to the dashboard...
              </p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="mb-8 flex flex-col items-center gap-4 text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-[#2563EB]/10">
                  <Lock className="size-6 text-[#2563EB]" />
                </div>
                <div className="flex flex-col gap-1">
                  <h1 className="text-xl font-semibold text-card-foreground tracking-tight">
                    Set Your New Password
                  </h1>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Your account was created with a default password. You must
                    set a new password before continuing.
                  </p>
                </div>
              </div>

              <form
                onSubmit={handleSubmit}
                noValidate
                className="flex flex-col gap-5"
              >
                {/* Current Password */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="current-pw" className="text-foreground">
                    Current Password
                  </Label>
                  <div className="relative">
                    <Lock
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      size={18}
                      aria-hidden="true"
                    />
                    <input
                      id="current-pw"
                      type="password"
                      placeholder="Enter current password"
                      value={currentPassword}
                      onChange={(e) => {
                        setCurrentPassword(e.target.value)
                        if (errors.current)
                          setErrors((prev) => ({ ...prev, current: undefined }))
                      }}
                      aria-invalid={!!errors.current}
                      className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                    />
                  </div>
                  {errors.current && (
                    <p className="text-sm text-destructive" role="alert">
                      {errors.current}
                    </p>
                  )}
                </div>

                {/* New Password */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="new-pw" className="text-foreground">
                    New Password
                  </Label>
                  <div className="relative">
                    <Lock
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      size={18}
                      aria-hidden="true"
                    />
                    <input
                      id="new-pw"
                      type={showNew ? "text" : "password"}
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value)
                        if (errors.newPw)
                          setErrors((prev) => ({ ...prev, newPw: undefined }))
                      }}
                      aria-invalid={!!errors.newPw}
                      className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-11 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showNew ? "Hide password" : "Show password"}
                    >
                      {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {/* Strength indicator */}
                  {newPassword.length > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ease-out ${cfg.barColor}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>
                  )}

                  {errors.newPw && (
                    <p className="text-sm text-destructive" role="alert">
                      {errors.newPw}
                    </p>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="confirm-pw" className="text-foreground">
                    Confirm New Password
                  </Label>
                  <div className="relative">
                    <Lock
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      size={18}
                      aria-hidden="true"
                    />
                    <input
                      id="confirm-pw"
                      type={showConfirm ? "text" : "password"}
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value)
                        if (errors.confirm)
                          setErrors((prev) => ({ ...prev, confirm: undefined }))
                      }}
                      aria-invalid={!!errors.confirm}
                      className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-11 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={
                        showConfirm ? "Hide password" : "Show password"
                      }
                    >
                      {showConfirm ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                  {errors.confirm && (
                    <p className="text-sm text-destructive" role="alert">
                      {errors.confirm}
                    </p>
                  )}
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="mt-1 h-11 w-full rounded-lg bg-[#2563EB] text-white font-medium text-sm hover:bg-[#1d4ed8] transition-colors cursor-pointer"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Updating...
                    </>
                  ) : (
                    "Set Password and Continue"
                  )}
                </Button>

                {authError && (
                  <p className="text-center text-sm text-red-500 font-medium" role="alert">
                    {authError}
                  </p>
                )}
              </form>

              <p className="mt-6 text-center text-xs text-muted-foreground leading-relaxed">
                If you did not receive your default password, contact your
                administrator.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
