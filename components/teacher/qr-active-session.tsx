"use client"

import { useState, useEffect } from "react"
import { Square, BookOpen, Users, Clock, Radio, AlertTriangle, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { QRCodeDisplay, useQRTimer } from "./qr-code-display"
import { LiveStudentList } from "./live-student-list"
import { cn } from "@/lib/utils"
import type { Student } from "@/lib/qr-attendance-data"

interface QRActiveSessionProps {
  subjectLabel: string
  classLabel: string
  periodLabel: string
  teacherName: string
  students: Student[]
  currentQrToken: string
  openedAt?: string
  onFinalize: () => void
  onRotate?: () => void
}

export function QRActiveSession({
  subjectLabel,
  classLabel,
  periodLabel,
  teacherName,
  students,
  currentQrToken,
  openedAt,
  onFinalize,
  onRotate,
}: QRActiveSessionProps) {
  const { secondsLeft: qrSecondsLeft, totalSeconds: qrTotalSeconds, isFlashing } = useQRTimer(true, false, onRotate)

  // 180-second authoritative session timer derived from database opened_at
  const SESSION_TOTAL = 180
  const computeRemaining = () => {
    if (!openedAt) return SESSION_TOTAL
    const openedTime = new Date(openedAt).getTime()
    if (isNaN(openedTime)) return SESSION_TOTAL
    const deadline = openedTime + SESSION_TOTAL * 1000
    return Math.max(0, Math.round((deadline - Date.now()) / 1000))
  }

  const [sessionSecondsLeft, setSessionSecondsLeft] = useState(() => computeRemaining())

  useEffect(() => {
    setSessionSecondsLeft(computeRemaining())
    const interval = setInterval(() => {
      setSessionSecondsLeft(computeRemaining())
    }, 1000)
    return () => clearInterval(interval)
  }, [openedAt])

  // Recalculate immediately on tab visibility change or window focus
  useEffect(() => {
    const handleRecalculate = () => {
      setSessionSecondsLeft(computeRemaining())
    }
    document.addEventListener("visibilitychange", handleRecalculate)
    window.addEventListener("focus", handleRecalculate)
    return () => {
      document.removeEventListener("visibilitychange", handleRecalculate)
      window.removeEventListener("focus", handleRecalculate)
    }
  }, [openedAt])

  useEffect(() => {
    if (sessionSecondsLeft === 0) onFinalize()
  }, [sessionSecondsLeft, onFinalize])

  const progressPercent = (sessionSecondsLeft / SESSION_TOTAL) * 100
  const isLow = sessionSecondsLeft <= 30

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  // QR progress bar color based on time left
  const qrPct = qrTotalSeconds > 0 ? (qrSecondsLeft / qrTotalSeconds) * 100 : 0
  const qrColor =
    qrSecondsLeft > 7
      ? "text-emerald-600 dark:text-emerald-400"
      : qrSecondsLeft > 3
      ? "text-amber-600 dark:text-amber-400"
      : "text-rose-600 dark:text-rose-400"

  const qrBarBg =
    qrSecondsLeft > 7
      ? "bg-emerald-500"
      : qrSecondsLeft > 3
      ? "bg-amber-500"
      : "bg-rose-500"

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* ── LEFT COLUMN: Centerpiece QR + Timers + Finalize (5 cols) ── */}
      <div className="flex flex-col gap-4 lg:col-span-5">
        {/* Live status badge */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300 dark:border-emerald-800/80 bg-emerald-500/10 px-3.5 py-1 text-xs font-extrabold text-emerald-800 dark:text-emerald-300 shadow-2xs">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            ATTENDANCE WINDOW ACTIVE
          </span>
        </div>

        {/* Session info display */}
        <div className="flex flex-col gap-1.5">
          <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight leading-tight">
            {subjectLabel}
          </h2>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-card px-2.5 py-1 text-xs font-bold text-foreground shadow-2xs">
              <Users className="size-3 text-sky-500 shrink-0" />
              <span>{classLabel}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-card px-2.5 py-1 text-xs font-semibold text-foreground shadow-2xs">
              <Clock className="size-3 text-emerald-500 shrink-0" />
              <span>{periodLabel}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-2xs">
              <BookOpen className="size-3 text-amber-500 shrink-0" />
              <span>{teacherName}</span>
            </span>
          </div>
        </div>

        {/* ── Unified QR + Timer Card ── */}
        <Card className="border-border shadow-md overflow-hidden bg-card transition-all">
          {/* QR Header Info */}
          <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Radio className="size-3.5 text-primary animate-pulse" />
              <span className="text-xs font-bold text-foreground">Dynamic Token</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold tabular-nums">
              <span className="text-muted-foreground font-medium text-[11px]">Rotates in</span>
              <span className={cn("rounded-md px-1.5 py-0.5 text-xs font-black", qrColor)}>
                {qrSecondsLeft}s
              </span>
            </div>
          </div>

          {/* QR Code Presentation */}
          <div className="flex flex-col items-center justify-center p-5 pb-4">
            <QRCodeDisplay
              secondsLeft={qrSecondsLeft}
              totalSeconds={qrTotalSeconds}
              isFlashing={isFlashing}
              tokenValue={currentQrToken}
              size={240}
            />

            {/* QR Rotation Progress Bar */}
            <div className="w-full max-w-64 mt-4">
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-1000 ease-linear", qrBarBg)}
                  style={{ width: `${qrPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium mt-1">
                <span>Auto-refreshing</span>
                <span>15s interval</span>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-border/70 mx-5" />

          {/* Session Countdown Section */}
          <div
            className={cn(
              "flex flex-col gap-2 p-5 transition-colors",
              isLow ? "bg-rose-500/5 dark:bg-rose-950/20" : "bg-muted/10"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isLow ? (
                  <AlertTriangle className="size-4 text-rose-500 shrink-0" />
                ) : (
                  <Clock className="size-4 text-primary shrink-0" />
                )}
                <span className="text-xs font-bold text-foreground">
                  {isLow ? "Closing Soon" : "Session Time Remaining"}
                </span>
              </div>
              <span
                className={cn(
                  "text-2xl sm:text-3xl font-black tabular-nums tracking-tight leading-none",
                  isLow ? "text-rose-600 dark:text-rose-400 animate-pulse" : "text-foreground"
                )}
              >
                {formatTime(sessionSecondsLeft)}
              </span>
            </div>

            {/* Session Progress Bar */}
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden mt-1">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-1000 ease-linear",
                  isLow ? "bg-rose-500" : "bg-primary"
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-0.5">
              <span>Auto-finalizes when timer hits 0:00</span>
              <span className="font-mono font-semibold">{Math.round(progressPercent)}% time left</span>
            </div>
          </div>
        </Card>

        {/* ── Finalize Button ── */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              size="lg"
              className="w-full gap-2 font-bold shadow-xs hover:shadow transition-all h-11 rounded-xl cursor-pointer"
            >
              <Square className="size-4 fill-current" />
              <span>Finalize & Review Attendance</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-2xl border-border">
            <AlertDialogHeader>
              <div className="flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive mb-2">
                <AlertTriangle className="size-5" />
              </div>
              <AlertDialogTitle className="text-lg font-bold text-foreground">
                Finalize Attendance Session?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs sm:text-sm text-muted-foreground">
                This will immediately close the QR window for <span className="font-semibold text-foreground">{subjectLabel}</span> ({classLabel}). Students who haven&apos;t checked in will be recorded as absent.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2.5 sm:gap-3">
              <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={onFinalize}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl font-semibold"
              >
                Yes, Finalize Session
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5 text-emerald-500" />
          <span>Device location verification active</span>
        </div>
      </div>

      {/* ── RIGHT COLUMN: Live Student List (7 cols) ── */}
      <Card className="border-border shadow-md lg:col-span-7 flex flex-col overflow-hidden bg-card">
        <CardContent className="p-4 sm:p-5 flex-1 flex flex-col min-h-140 lg:min-h-165">
          <LiveStudentList students={students} />
        </CardContent>
      </Card>
    </div>
  )
}