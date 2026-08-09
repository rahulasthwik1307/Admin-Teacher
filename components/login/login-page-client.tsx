"use client"

import { motion } from "framer-motion"
import { FALogo } from "@/components/fa-logo"
import { LoginForm } from "@/components/login-form"
import { SecurityVisualization } from "@/components/login/security-visualization"
import { LoginCursorFollower } from "@/components/login/login-cursor-follower"

export function LoginPageClient() {
  return (
    <div className="relative flex min-h-svh flex-col lg:flex-row overflow-hidden bg-white font-sans selection:bg-blue-600 selection:text-white">
      {/* Soft desktop cursor follower */}
      <LoginCursorFollower />

      {/* LEFT PANEL — Richer Sky Blue Brand & Security Experience */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col items-center justify-between overflow-hidden bg-linear-to-br from-[#e0f2fe] via-[#bae6fd] to-[#dbeafe] p-8 lg:p-12 border-r border-blue-200/60 shadow-inner">
        {/* Ambient Sky & Cyan Radial Light Glows */}
        <div className="absolute -top-24 -left-24 size-110 rounded-full bg-blue-300/40 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 size-130 rounded-full bg-cyan-300/40 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(#0284c7_1px,transparent_1px)] [background-size:32px_32px] opacity-15 pointer-events-none" />

        {/* Security Visualization Component */}
        <SecurityVisualization />
      </div>

      {/* RIGHT PANEL — Clean White Authentication Panel */}
      <div className="relative flex flex-1 flex-col items-center justify-center bg-slate-50/50 lg:bg-white px-6 py-10 lg:px-12 z-20">
        {/* Subtle Ambient Radial Light */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-96 rounded-full bg-blue-100/40 blur-3xl pointer-events-none" />

        {/* Mobile-Only Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 flex flex-col items-center gap-2.5 lg:hidden text-center"
        >
          <div className="p-2.5 rounded-2xl bg-white shadow-md shadow-blue-500/10 border border-blue-100">
            <FALogo size="md" variant="blue" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Factor Attendance
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Smart Attendance for NNRG College
            </p>
          </div>
        </motion.div>

        {/* Narrower & Slightly Taller Premium Authentication Card */}
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-[395px] sm:max-w-[400px] z-10"
        >
          <div className="rounded-3xl bg-white/95 backdrop-blur-xl p-8 sm:p-9 border border-slate-200/90 shadow-xl shadow-blue-950/5 text-slate-900">
            {/* Form Header */}
            <div className="mb-6 flex flex-col gap-1 text-left">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  Welcome Back
                </h2>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-[10px] font-semibold text-emerald-700">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>System Secure</span>
                </div>
              </div>
              <p className="text-xs font-medium text-slate-500">
                Secure access to Factor Attendance portal
              </p>
            </div>

            {/* Form Component */}
            <LoginForm />
          </div>
        </motion.div>
      </div>
    </div>
  )
}
