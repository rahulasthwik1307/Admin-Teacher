"use client"

import { useState, useEffect } from "react"
import { Pause, Play, Square } from "lucide-react"
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
import type { Student } from "@/lib/qr-attendance-data"

interface QRActiveSessionProps {
  subjectLabel: string
  classLabel: string
  periodLabel: string
  teacherName: string
  students: Student[]
  onFinalize: () => void
  onRotate?: () => void
}

export function QRActiveSession({
  subjectLabel,
  classLabel,
  periodLabel,
  teacherName,
  students,
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
        if (prev <= 1) {
          clearInterval(interval)
          // Auto finalize when countdown reaches zero
          onFinalize()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [onFinalize])

  const progressPercent = (sessionSecondsLeft / SESSION_TOTAL) * 100
  
  // Format MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      {/* Left column — QR Display */}
      <div className="flex flex-col gap-5 lg:col-span-2">
        {/* Status pill */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-medium text-emerald-700">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            Attendance Window Open
          </span>
        </div>

        {/* Session info */}
        <div className="flex flex-col gap-0.5">
          <h2 className="text-xl font-bold text-foreground">{subjectLabel}</h2>
          <p className="text-sm text-muted-foreground">
            {classLabel} &middot; {periodLabel}
          </p>
          <p className="text-sm text-muted-foreground">{teacherName}</p>
        </div>

        {/* QR Code */}
        <QRCodeDisplay
          secondsLeft={qrSecondsLeft}
          totalSeconds={qrTotalSeconds}
          isFlashing={isFlashing}
        />

        {/* Countdown Timer */}
        <Card>
          <CardContent className="flex flex-col items-center gap-3 pt-5 pb-5">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold tabular-nums text-foreground">
                {formatTime(sessionSecondsLeft)}
              </span>
              <span className="text-sm text-muted-foreground">left</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-primary/10">
              <div
                className="h-full rounded-full bg-primary transition-all duration-1000 ease-linear"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Session auto-closes at 0:00
            </p>
          </CardContent>
        </Card>

        {/* Action buttons */}
        <div className="flex gap-3">


          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="flex-1">
                <Square className="mr-2 size-4" />
                Finalize Attendance
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Finalize Attendance?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to finalize? No further scans will be
                  accepted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onFinalize}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Confirm
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Right column — Live Student List */}
      <Card className="lg:col-span-3">
        <CardContent className="flex h-[calc(100svh-12rem)] flex-col pt-5 lg:h-auto lg:min-h-[600px]">
          <LiveStudentList students={students} />
        </CardContent>
      </Card>
    </div>
  )
}
