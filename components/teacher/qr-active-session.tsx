"use client"

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
  students: Student[]
  isPaused: boolean
  onTogglePause: () => void
  onFinalize: () => void
  onRotate?: () => void
}

export function QRActiveSession({
  subjectLabel,
  classLabel,
  periodLabel,
  students,
  isPaused,
  onTogglePause,
  onFinalize,
  onRotate,
}: QRActiveSessionProps) {
  const { secondsLeft, totalSeconds, isFlashing } = useQRTimer(true, isPaused, onRotate)
  const progressPercent = (secondsLeft / totalSeconds) * 100

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      {/* Left column — QR Display */}
      <div className="flex flex-col gap-5 lg:col-span-2">
        {/* Status pill */}
        <div className="flex items-center gap-2">
          {isPaused ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-700">
              <span className="size-2 rounded-full bg-amber-500" />
              Window Paused
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-medium text-emerald-700">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              Attendance Window Open
            </span>
          )}
        </div>

        {/* Session info */}
        <div className="flex flex-col gap-0.5">
          <h2 className="text-xl font-bold text-foreground">{subjectLabel}</h2>
          <p className="text-sm text-muted-foreground">
            {classLabel} &middot; {periodLabel}
          </p>
          <p className="text-sm text-muted-foreground">Dr. P. Sharma</p>
        </div>

        {/* QR Code */}
        <QRCodeDisplay
          secondsLeft={secondsLeft}
          totalSeconds={totalSeconds}
          isFlashing={isFlashing}
        />

        {/* Countdown Timer */}
        <Card>
          <CardContent className="flex flex-col items-center gap-3 pt-5 pb-5">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold tabular-nums text-foreground">
                {secondsLeft}
              </span>
              <span className="text-sm text-muted-foreground">sec</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-primary/10">
              <div
                className="h-full rounded-full bg-primary transition-all duration-1000 ease-linear"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {isPaused
                ? "Timer paused — QR code is frozen"
                : "QR code rotates automatically"}
            </p>
          </CardContent>
        </Card>

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onTogglePause}
          >
            {isPaused ? (
              <>
                <Play className="mr-2 size-4" />
                Resume
              </>
            ) : (
              <>
                <Pause className="mr-2 size-4" />
                Pause Window
              </>
            )}
          </Button>

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
