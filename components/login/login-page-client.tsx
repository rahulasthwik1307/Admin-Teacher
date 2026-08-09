"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { FALogo } from "@/components/fa-logo"
import { LoginForm } from "@/components/login-form"
import { SecurityVisualization } from "@/components/login/security-visualization"
import { LoginCursorFollower } from "@/components/login/login-cursor-follower"

type Role = "teacher" | "admin"

export function LoginPageClient() {
  const [activeRole, setActiveRole] = useState<Role>("teacher")

  return (
    <div className="relative flex h-svh max-h-svh min-h-svh flex-col lg:flex-row overflow-y-auto lg:overflow-hidden bg-white font-sans selection:bg-blue-600 selection:text-white">
      {/* Soft desktop cursor follower */}
      <LoginCursorFollower />

      {/* LEFT PANEL — Richer Sky Blue Brand & Security Experience (UNTOUCHED VISUALIZATION) */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col items-center justify-between overflow-hidden bg-linear-to-br from-[#e0f2fe] via-[#bae6fd] to-[#dbeafe] p-6 lg:p-8 border-r border-blue-200/60 shadow-inner h-full">
        {/* Ambient Sky & Cyan Radial Light Glows */}
        <div className="absolute -top-24 -left-24 size-110 rounded-full bg-blue-300/40 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 size-130 rounded-full bg-cyan-300/40 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(#0284c7_1px,transparent_1px)] [background-size:32px_32px] opacity-15 pointer-events-none" />

        {/* Security Visualization Component */}
        <SecurityVisualization />
      </div>

      {/* RIGHT PANEL — Clean White Authentication Panel (No Desktop Scrollbar) */}
      <div className="relative flex flex-1 flex-col items-center justify-center bg-slate-50/50 lg:bg-white px-6 py-6 lg:px-10 z-20 h-full">
        {/* Dynamic Soft Ambient Radial Light Behind Card */}
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-96 rounded-full blur-3xl transition-colors duration-500 pointer-events-none ${
            activeRole === "teacher" ? "bg-blue-100/50" : "bg-purple-100/50"
          }`}
        />

        {/* Mobile-Only Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-5 flex flex-col items-center gap-2 lg:hidden text-center"
        >
          <div className="p-2 rounded-2xl bg-white shadow-md shadow-blue-500/10 border border-blue-100">
            <FALogo size="md" variant="blue" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Factor Attendance
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Smart Attendance for NNRG College
            </p>
          </div>
        </motion.div>

        {/* Physical 3D Depth Card Container */}
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="relative w-full max-w-[390px] sm:max-w-[395px] z-10"
        >
          {/* Enhanced Physical 3D Secondary Offset Backdrop Layer */}
          <div
            className={`absolute inset-0 translate-x-1.5 translate-y-1.5 rounded-3xl blur-[3px] -z-10 transition-colors duration-400 ${
              activeRole === "teacher"
                ? "bg-linear-to-br from-blue-200/50 via-slate-200/60 to-slate-300/60"
                : "bg-linear-to-br from-purple-200/50 via-slate-200/60 to-slate-300/60"
            }`}
          />

          {/* Main Elevated Card with Noticeable Role-Reactive Light Inner Surface Theme */}
          <div
            className={`relative rounded-3xl border transition-all duration-400 px-6 pt-6 pb-5 sm:px-7 sm:pt-6.5 sm:pb-5.5 text-slate-900 ${
              activeRole === "teacher"
                ? "bg-linear-to-b from-blue-100/70 via-blue-50/50 to-sky-50/40 border-blue-300/80 shadow-[0_20px_45px_-12px_rgba(37,99,235,0.16),0_8px_20px_-6px_rgba(37,99,235,0.08)] ring-1 ring-blue-500/20"
                : "bg-linear-to-b from-purple-100/70 via-purple-50/50 to-fuchsia-50/40 border-purple-300/80 shadow-[0_20px_45px_-12px_rgba(147,51,234,0.16),0_8px_20px_-6px_rgba(147,51,234,0.08)] ring-1 ring-purple-500/20"
            }`}
          >
            <LoginForm onRoleChange={(r) => setActiveRole(r)} />
          </div>
        </motion.div>
      </div>
    </div>
  )
}
