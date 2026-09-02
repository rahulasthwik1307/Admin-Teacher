"use client"

import { useRouter } from "next/navigation"
import { AlertTriangle, ArrowRight } from "lucide-react"
import { MissedAttendanceAlertSkeleton } from "@/components/ui/skeletons"
import { useMissedAttendance } from "@/hooks/use-missed-attendance"

export function MissedAttendanceAlert() {
  const router = useRouter()
  const { data: missedSlots, isLoading: loading } = useMissedAttendance("180")

  if (loading) return <MissedAttendanceAlertSkeleton />
  const count = missedSlots?.length ?? 0
  if (count === 0) return null

  return (
    <div className="relative overflow-hidden rounded-xl border border-amber-300/90 bg-linear-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 shadow-2xs dark:border-amber-800/80 dark:from-amber-950/40">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 ring-1 ring-amber-500/30">
            <AlertTriangle className="size-5" />
            <span className="absolute -top-0.5 -right-0.5 flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-amber-500" />
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-amber-900 dark:text-amber-200">
                {count} Pending Missed Session{count !== 1 ? "s" : ""}
              </span>
              <span className="rounded-full bg-amber-500/20 px-2 py-0.2 text-[10px] font-extrabold uppercase tracking-wide text-amber-800 dark:text-amber-300">
                Action Required
              </span>
            </div>
            <span className="text-xs text-amber-700/90 dark:text-amber-400">
              Timetable sessions passed without recorded attendance requiring review
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => router.push("/teacher/missed-attendance")}
          className="group inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all duration-150 hover:bg-amber-700 hover:shadow-sm shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <span>Review & Record</span>
          <ArrowRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  )
}

