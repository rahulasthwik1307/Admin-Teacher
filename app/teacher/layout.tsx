"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"
import { TeacherSidebar } from "@/components/teacher-sidebar"
import { Button } from "@/components/ui/button"

const pageTitles: Record<string, string> = {
  "/teacher/dashboard": "Dashboard",
  "/teacher/students": "Students",
  "/teacher/face-approval": "Face Approval",
  "/teacher/qr-attendance": "QR Attendance",
  "/teacher/missed-attendance": "Missed Attendance",
  "/teacher/attendance-history": "Attendance History",
  "/teacher/analytics": "Analytics",
}

function formatDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const pageTitle = pageTitles[pathname] || "Dashboard"

  // Block browser back/forward buttons inside teacher portal
  useEffect(() => {
    // Push a new state so there is always a forward entry
    window.history.pushState(null, "", window.location.href)

    const handlePopState = () => {
      // Whenever back/forward is pressed, push the same state again
      window.history.pushState(null, "", window.location.href)
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [pathname])

  useEffect(() => {
    // Check stored role matches teacher portal
    const storedRole = localStorage.getItem("fa_user_role")
    if (storedRole && storedRole !== "teacher") {
      // Role mismatch — clear and redirect to login
      localStorage.removeItem("fa_user_role")
      window.location.href = "/login"
    }
  }, [])

  return (
    <div className="flex h-svh overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:shrink-0">
        <div className="w-64 fixed inset-y-0 left-0 z-30">
          <TeacherSidebar />
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile sidebar drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-200 ease-in-out lg:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <TeacherSidebar onClose={() => setSidebarOpen(false)} />
        <button
          className="absolute right-3 top-5 rounded-md p-1 text-muted-foreground hover:text-foreground"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
        >
          <X className="size-5" />
        </button>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top header bar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-4 lg:px-8">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <Button
              variant="ghost"
              size="icon-sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu className="size-5" />
            </Button>
            <h1 className="text-lg font-semibold text-foreground">
              {pageTitle}
            </h1>
          </div>

          <span className="hidden text-sm text-muted-foreground sm:block">
            {formatDate()}
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
