import type { Metadata } from "next"
import { LoginPageClient } from "@/components/login/login-page-client"

export const metadata: Metadata = {
  title: "Sign In — Factor Attendance",
  description: "Sign in to Factor Attendance portal for NNRG College staff.",
}

export default function LoginPage() {
  return <LoginPageClient />
}
