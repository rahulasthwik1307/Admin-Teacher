"use client"

import { useState, useEffect } from "react"
import { Square, BookOpen, Users, Clock } from "lucide-react"
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
  onFinalize,
  onRotate,
}: QRActiveSessionProps) {
  const { secondsLeft: qrSecondsLeft, totalSeconds: qrTotalSeconds, isFlashing } = useQRTimer(true, false, onRotate)

  // 180-second session timer
  const SESSION_TOTAL = 180
  const [sessionSecondsLeft, setSessionSecondsLeft] = useState(SESSION_TOTAL)

  useEffect(() => {
    const interval = setInterval(() => {
      setSessionSecondsLeft((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

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

  // QR ring color based on time left
  const qrPct = qrSecondsLeft / qrTotalSeconds
  const qrColor = qrPct > 0.5 ? "text-emerald-500" : qrPct > 0.25 ? "text-amber-500" : "text-red-500"

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">

      {/* ── LEFT COLUMN ── */}
      <div className="flex flex-col gap-4 lg:col-span-2">

        {/* Live pill */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 dark:bg-emerald-950 px-3 py-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400 shadow-sm">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            Attendance Window Open
          </span>
        </div>

        {/* Session info chips */}
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">{subjectLabel}</h2>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300">
              <Users className="size-3" /> {classLabel}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300">
              <Clock className="size-3" /> {periodLabel}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300">
              <BookOpen className="size-3" /> {teacherName}
            </span>
          </div>
        </div>

        {/* ── Unified QR + Timer Card ── */}
        <Card className={cn(
          "overflow-hidden shadow-sm transition-shadow duration-300",
          isFlashing && "shadow-primary/30 shadow-lg"
        )}>
          {/* QR section */}
          <div className="relative flex flex-col items-center gap-3 p-5 pb-4">
            {/* QR countdown ring label */}
            <div className="flex w-full items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Scan QR Code</span>
              <span className={cn("text-xs font-bold tabular-nums", qrColor)}>
                Refreshes in {qrSecondsLeft}s
              </span>
            </div>

            {/* QR Code */}
            <div
              className={cn(
                "relative rounded-2xl border-2 bg-white p-3 transition-all duration-200",
                isFlashing ? "border-primary/60 shadow-lg shadow-primary/20 scale-[1.01]" : "border-border"
              )}
            >
              <QRCodeDisplay
                secondsLeft={qrSecondsLeft}
                totalSeconds={qrTotalSeconds}
                isFlashing={isFlashing}
                tokenValue={currentQrToken}
              />
              {isFlashing && (
                <div className="pointer-events-none absolute inset-0 animate-pulse rounded-2xl bg-primary/10" />
              )}
            </div>

            {/* QR progress bar */}
            <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-1000 ease-linear",
                  qrPct > 0.5 ? "bg-emerald-500" : qrPct > 0.25 ? "bg-amber-500" : "bg-red-500"
                )}
                style={{ width: `${(qrSecondsLeft / qrTotalSeconds) * 100}%` }}
              />
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-border mx-5" />

          {/* Session countdown section */}
          <div className="flex flex-col items-center gap-2 px-5 py-4">
            <div className="flex w-full items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Session closes in</span>
              <span className={cn(
                "text-2xl font-bold tabular-nums tracking-tight",
                isLow ? "text-red-600" : "text-foreground"
              )}>
                {formatTime(sessionSecondsLeft)}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-1000 ease-linear",
                  isLow ? "bg-red-500" : "bg-primary"
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="self-start text-xs text-muted-foreground">Auto-closes at 0:00</p>
          </div>
        </Card>

        {/* ── Finalize Button ── */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              size="lg"
              className="w-full gap-2 font-semibold shadow-sm"
            >
              <Square className="size-4" />
              Finalize Attendance
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Finalize Attendance?</AlertDialogTitle>
              <AlertDialogDescription>
                This will close the session. Students who haven't scanned will be marked absent. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={onFinalize}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Yes, Finalize
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* ── RIGHT COLUMN — Live Student List ── */}
      <Card className="lg:col-span-3 shadow-sm">
        <CardContent className="flex h-[calc(100svh-12rem)] flex-col pt-5 lg:h-auto lg:min-h-150">
          <LiveStudentList students={students} />
        </CardContent>
      </Card>
    </div>
  )
}