"use client"

import { useState } from "react"
import { toast } from "sonner"
import { QRSetupState } from "@/components/teacher/qr-setup-state"
import { QRActiveSession } from "@/components/teacher/qr-active-session"
import {
  classOptions,
  subjectOptions,
  periodOptions,
  demoStudents,
} from "@/lib/qr-attendance-data"

type PageState = "setup" | "active"

export default function QRAttendancePage() {
  const [pageState, setPageState] = useState<PageState>("setup")
  const [selectedClass, setSelectedClass] = useState("")
  const [selectedSubject, setSelectedSubject] = useState("")
  const [selectedPeriod, setSelectedPeriod] = useState("")
  const [isPaused, setIsPaused] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const canStart = !!selectedClass && !!selectedSubject && !!selectedPeriod

  const subjectLabel =
    subjectOptions.find((o) => o.value === selectedSubject)?.label ?? ""
  const classLabel =
    classOptions.find((o) => o.value === selectedClass)?.label ?? ""
  const periodLabel =
    periodOptions.find((o) => o.value === selectedPeriod)?.label ?? ""

  function handleStart() {
    setIsTransitioning(true)
    setTimeout(() => {
      setPageState("active")
      setIsPaused(false)
      setIsTransitioning(false)
    }, 200)
  }

  function handleFinalize() {
    setIsTransitioning(true)
    setTimeout(() => {
      setPageState("setup")
      setSelectedClass("")
      setSelectedSubject("")
      setSelectedPeriod("")
      setIsPaused(false)
      setIsTransitioning(false)
      toast.success("Attendance finalized successfully", {
        description: `${subjectLabel} — ${classLabel} — ${periodLabel}`,
      })
    }, 200)
  }

  return (
    <div
      className={`transition-opacity duration-200 ${
        isTransitioning ? "opacity-0" : "opacity-100"
      }`}
    >
      {pageState === "setup" ? (
        <QRSetupState
          selectedClass={selectedClass}
          selectedSubject={selectedSubject}
          selectedPeriod={selectedPeriod}
          onClassChange={setSelectedClass}
          onSubjectChange={setSelectedSubject}
          onPeriodChange={setSelectedPeriod}
          onStart={handleStart}
          canStart={canStart}
        />
      ) : (
        <QRActiveSession
          subjectLabel={subjectLabel}
          classLabel={classLabel}
          periodLabel={periodLabel}
          students={demoStudents}
          isPaused={isPaused}
          onTogglePause={() => setIsPaused((p) => !p)}
          onFinalize={handleFinalize}
        />
      )}
    </div>
  )
}
