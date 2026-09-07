"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { QRSetupState, DropdownOption, RecentSessionData, OccupiedSlotData } from "@/components/teacher/qr-setup-state"
import { QRActiveSession } from "@/components/teacher/qr-active-session"
import { createClient } from "@/lib/supabase/client"
import type { Student } from "@/lib/qr-attendance-data"

import { QRSummaryState } from "@/components/teacher/qr-summary-state"
import { useQueryClient } from "@tanstack/react-query"
import { useQrSetup } from "@/hooks/use-qr-setup"

type PageState = "setup" | "active" | "summary"

function getOrdinalSuffix(n: number): string {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return "th"
  switch (n % 10) {
    case 1:
      return "st"
    case 2:
      return "nd"
    case 3:
      return "rd"
    default:
      return "th"
  }
}

const EMPTY_CLASS_SUBJECT_MAP = new Map<string, DropdownOption[]>()
const EMPTY_OCCUPIED_SLOTS_MAP = new Map<string, OccupiedSlotData>()

export default function QRAttendancePage() {
  const queryClient = useQueryClient()
  const [pageState, setPageState] = useState<PageState>("setup")
  const [selectedClass, setSelectedClass] = useState("")
  const [selectedSubject, setSelectedSubject] = useState("")
  const [selectedPeriod, setSelectedPeriod] = useState("")
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Data State
  const [teacherId, setTeacherId] = useState<string | null>(null)
  const [teacherName, setTeacherName] = useState<string>("")
  const { data: setupData, isLoading: recentSessionsLoading, refetch: refetchSetupData } = useQrSetup(teacherId)

  const classOptions = setupData?.classOptions ?? []
  const classSubjectMap = setupData?.classSubjectMap ?? EMPTY_CLASS_SUBJECT_MAP
  const periodOptions = setupData?.periodOptions ?? []
  const todayTimetableEntries = setupData?.todayTimetableEntries ?? []
  const todayOccupiedSlots = setupData?.todayOccupiedSlots ?? EMPTY_OCCUPIED_SLOTS_MAP
  const recentSessions = setupData?.recentSessions ?? []

  const [subjectOptions, setSubjectOptions] = useState<DropdownOption[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [activeSessionOpenedAt, setActiveSessionOpenedAt] = useState<string | null>(null)
  const [currentQrToken, setCurrentQrToken] = useState<string>("")
  const [liveStudents, setLiveStudents] = useState<Student[]>([])
  const [periodAutoFilled, setPeriodAutoFilled] = useState(false)

  // Compute timetable-authorized periods for the currently selected class cohort + subject on today's day of week
  const authorizedPeriods = useMemo(() => {
    if (!selectedClass || !selectedSubject) return []
    return (todayTimetableEntries || [])
      .filter((t: any) => t.class_id === selectedClass && t.subject_id === selectedSubject && t.period)
      .map((t: any) => ({
        value: t.period_id,
        label: `${t.period.period_number} Period ${t.period.start_time.slice(0, 5)} - ${t.period.end_time.slice(0, 5)}`,
        periodNumber: t.period.period_number ?? 0,
      }))
      .sort((a: any, b: any) => a.periodNumber - b.periodNumber)
  }, [selectedClass, selectedSubject, todayTimetableEntries])

  const canStart = !!selectedClass && !!selectedSubject && !!selectedPeriod && authorizedPeriods.length > 0

  const subjectLabel = subjectOptions.find((o) => o.value === selectedSubject)?.label ?? ""
  const classLabel = classOptions.find((o) => o.value === selectedClass)?.label ?? ""
  const periodLabel = periodOptions.find((o) => o.value === selectedPeriod)?.label ?? ""

  // Sync subject options with selected class or show all
  useEffect(() => {
    if (selectedClass && classSubjectMap.has(selectedClass)) {
      setSubjectOptions(classSubjectMap.get(selectedClass)!)
    } else {
      const allSubjects = new Map<string, string>()
      for (const [, subjects] of classSubjectMap) {
        for (const s of subjects) allSubjects.set(s.value, s.label)
      }
      setSubjectOptions(
        Array.from(allSubjects.entries()).map(([id, name]) => ({ value: id, label: name }))
      )
    }
  }, [selectedClass, classSubjectMap])

  const checkForActiveSession = useCallback(async (uid: string) => {
    try {
      const supabase = createClient()
      const { data: session } = await supabase
        .from("attendance_sessions")
        .select("*")
        .eq("teacher_id", uid)
        .in("status", ["active", "reviewing"])
        .order("opened_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (session) {
        setActiveSessionId(session.id)
        setActiveSessionOpenedAt(session.opened_at || null)
        setCurrentQrToken(session.current_qr_token || "")
        setSelectedClass(session.class_id)
        setSelectedSubject(session.subject_id)
        setSelectedPeriod(session.period_id)
        if (session.status === "active") {
          setPageState("active")
        } else if (session.status === "reviewing") {
          setPageState("summary")
        }
      }
    } catch (err) {
      console.error("Check active session error:", err)
    }
  }, [])

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        setTeacherId(user.id)

        const { data: userData } = await supabase
          .from("users")
          .select("full_name")
          .eq("id", user.id)
          .single()

        if (userData?.full_name) {
          setTeacherName(userData.full_name)
        }

        await checkForActiveSession(user.id)
      }
    }
    init()
  }, [checkForActiveSession])

  // Auto-fill or adjust period when class + subject are selected based on timetable authorization
  useEffect(() => {
    if (!selectedClass || !selectedSubject) {
      setSelectedPeriod("")
      setPeriodAutoFilled(false)
      return
    }
    if (authorizedPeriods.length > 0) {
      const isCurrentValid = authorizedPeriods.some((p: { value: string }) => p.value === selectedPeriod)
      if (!isCurrentValid) {
        setSelectedPeriod(authorizedPeriods[0].value)
        setPeriodAutoFilled(true)
      }
    } else {
      setSelectedPeriod("")
      setPeriodAutoFilled(false)
    }
  }, [selectedClass, selectedSubject, authorizedPeriods, selectedPeriod])

  // Fetch complete student list with attendance status via API route
  const isFetchingStudentList = useRef(false)
  const fetchStudentList = useCallback(async () => {
    if (!activeSessionId || !selectedClass || isFetchingStudentList.current) return

    isFetchingStudentList.current = true
    try {
      const res = await fetch(
        `/api/teacher/student-list?class_id=${selectedClass}&session_id=${activeSessionId}`
      )
      const data = await res.json()
      if (data.students) {
        setLiveStudents(data.students)
      }
    } catch (err) {
      console.error("fetchStudentList error:", err)
    } finally {
      isFetchingStudentList.current = false
    }
  }, [activeSessionId, selectedClass])

  // Real-time Student List + polling fallback + tab resume synchronization
  const liveRefreshInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!activeSessionId || pageState !== "active") return

    fetchStudentList()

    const supabase = createClient()
    const channel = supabase
      .channel(`attendance_${activeSessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "period_attendance" },
        (payload) => {
          const record = payload.new as any
          if (record?.session_id === activeSessionId) {
            fetchStudentList()
          }
        }
      )
      .subscribe()

    liveRefreshInterval.current = setInterval(() => {
      fetchStudentList()
    }, 5000)

    const handleTabResume = () => {
      if (document.visibilityState === "visible") {
        fetchStudentList()
      }
    }
    document.addEventListener("visibilitychange", handleTabResume)
    window.addEventListener("focus", handleTabResume)

    return () => {
      supabase.removeChannel(channel)
      if (liveRefreshInterval.current) {
        clearInterval(liveRefreshInterval.current)
        liveRefreshInterval.current = null
      }
      document.removeEventListener("visibilitychange", handleTabResume)
      window.removeEventListener("focus", handleTabResume)
    }
  }, [activeSessionId, pageState, fetchStudentList])

  async function handleStart() {
    if (!teacherId || !selectedClass || !selectedSubject || !selectedPeriod) return
    setIsTransitioning(true)

    try {
      const supabase = createClient()
      const todayStr = new Date().toISOString().split("T")[0]

      // Call atomic RPC to create or resume the single logical session with concurrency locks & timetable validation
      const { data: res, error: rpcErr } = await supabase.rpc("start_or_resume_qr_session", {
        p_teacher_id: teacherId,
        p_class_id: selectedClass,
        p_subject_id: selectedSubject,
        p_period_id: selectedPeriod,
        p_session_date: todayStr,
      })

      if (rpcErr) throw rpcErr

      if (res?.action === "timetable_not_authorized") {
        toast.error("Timetable Not Authorized", {
          description: res?.message || "You are not assigned to this subject for this period.",
        })
        setIsTransitioning(false)
        return
      }

      if (res?.action === "slot_conflict" || res?.success === false) {
        toast.error(res?.message || "Slot conflict detected", {
          description: "This period is already occupied by another subject.",
        })
        if (teacherId) {
          refetchSetupData()
        }
        setIsTransitioning(false)
        return
      }

      if (res?.action === "resumed_review" || res?.action === "reopened_review") {
        setActiveSessionId(res.sessionId)
        setActiveSessionOpenedAt(res.openedAt || null)
        setCurrentQrToken(res.currentQrToken || "")
        setPageState("summary")
        setIsTransitioning(false)
        if (res?.action === "reopened_review") {
          toast.info("Existing session reopened for review", {
            description: "Review and update student attendance records as needed.",
          })
        }
        return
      }

      if (res?.action === "resumed_active" || res?.action === "created_active") {
        setActiveSessionId(res.sessionId)
        setActiveSessionOpenedAt(res.openedAt || null)
        setCurrentQrToken(res.currentQrToken || "")
        setPageState("active")
        setIsTransitioning(false)
        return
      }

      throw new Error(res?.message || "Unexpected response from session manager")
    } catch (err: any) {
      console.error("Failed to start or resume session:", err)
      toast.error(err?.message || "Failed to start session")
      setIsTransitioning(false)
    }
  }

  async function handleRotate() {
    if (!activeSessionId) return
    try {
      const supabase = createClient()
      const newToken = crypto.randomUUID()
      const expiry = new Date(Date.now() + 15000).toISOString()

      // 1. Mark existing tokens as used
      const { error: markErr } = await supabase
        .from("qr_tokens")
        .update({ is_used: true })
        .eq("session_id", activeSessionId)
        .eq("is_used", false)

      if (markErr) {
        console.warn("Failed to mark previous tokens used:", markErr)
      }

      // 2. Insert new token into qr_tokens table first
      const { error: insertErr } = await supabase.from("qr_tokens").insert({
        session_id: activeSessionId,
        token: newToken,
        expires_at: expiry,
        is_used: false,
      })

      if (insertErr) {
        throw new Error(`Token persistence failed: ${insertErr.message}`)
      }

      // 3. Update attendance_sessions with current_qr_token
      const { error: sessionUpdateErr } = await supabase
        .from("attendance_sessions")
        .update({
          current_qr_token: newToken,
          qr_token_expires_at: expiry,
        })
        .eq("id", activeSessionId)

      if (sessionUpdateErr) {
        throw new Error(`Session update failed: ${sessionUpdateErr.message}`)
      }

      // 4. ONLY update React state with confirmed persisted token
      setCurrentQrToken(newToken)
    } catch (err: any) {
      console.error("Failed to rotate QR:", err)
      toast.error("Failed to refresh QR token", {
        description: err?.message || "Database write error. Retrying on next interval...",
      })
    }
  }

  async function handleFinalize() {
    if (!activeSessionId) return
    setIsTransitioning(true)

    try {
      const supabase = createClient()
      const { error: sessionError } = await supabase
        .from("attendance_sessions")
        .update({
          status: "reviewing",
        })
        .eq("id", activeSessionId)

      if (sessionError) throw sessionError

      const { data: classStudents } = await supabase
        .from("students")
        .select("id")
        .eq("class_id", selectedClass)

      const { data: existingAttendance } = await supabase
        .from("period_attendance")
        .select("student_id")
        .eq("session_id", activeSessionId)

      const existingIds = new Set(
        (existingAttendance || []).map((r: any) => r.student_id)
      )

      const missingStudents = (classStudents || []).filter(
        (s: any) => !existingIds.has(s.id)
      )
      if (missingStudents.length > 0) {
        await supabase.from("period_attendance").insert(
          missingStudents.map((s: any) => ({
            session_id: activeSessionId,
            student_id: s.id,
            status: "absent",
          }))
        )
      }

      await supabase
        .from("period_attendance")
        .update({ status: "absent" })
        .eq("session_id", activeSessionId)
        .in("status", ["pending", "failed"])

      setPageState("summary")
      setIsTransitioning(false)
      toast.success("Attendance closed for review", {
        description: `${subjectLabel} — ${classLabel} — ${periodLabel}`,
      })

      if (teacherId) {
        refetchSetupData()
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to enter review mode")
      setIsTransitioning(false)
    }
  }

  // Handler for class change — reset subject and period
  function handleClassChange(val: string) {
    setSelectedClass(val)
    setSelectedSubject("")
    setSelectedPeriod("")
    setPeriodAutoFilled(false)
    // Filter subjects to only those assigned for this class
    if (val && classSubjectMap.has(val)) {
      setSubjectOptions(classSubjectMap.get(val)!)
    } else {
      // No class selected — show all subjects
      const allSubjects = new Map<string, string>()
      for (const [, subjects] of classSubjectMap) {
        for (const s of subjects) allSubjects.set(s.value, s.label)
      }
      setSubjectOptions(
        Array.from(allSubjects.entries()).map(([id, name]) => ({ value: id, label: name }))
      )
    }
  }

  // Handler for subject change — period will auto-fill via useEffect
  function handleSubjectChange(val: string) {
    setSelectedSubject(val)
  }

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={pageState}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="w-full will-change-[transform,opacity]"
      >
        {pageState === "setup" ? (
          <QRSetupState
            selectedClass={selectedClass}
            selectedSubject={selectedSubject}
            selectedPeriod={selectedPeriod}
            onClassChange={handleClassChange}
            onSubjectChange={handleSubjectChange}
            onPeriodChange={setSelectedPeriod}
            onStart={handleStart}
            canStart={canStart}
            classOptions={classOptions}
            subjectOptions={subjectOptions}
            periodOptions={selectedClass && selectedSubject ? authorizedPeriods : []}
            periodAutoFilled={periodAutoFilled}
            recentSessions={recentSessions}
            recentSessionsLoading={recentSessionsLoading}
            todayOccupiedSlots={todayOccupiedSlots}
            isTransitioning={isTransitioning}
          />
      ) : pageState === "active" ? (
        <QRActiveSession
          subjectLabel={subjectLabel}
          classLabel={classLabel}
          periodLabel={periodLabel}
          teacherName={teacherName}
          students={liveStudents}
          currentQrToken={currentQrToken}
          openedAt={activeSessionOpenedAt ?? undefined}
          onFinalize={handleFinalize}
          onRotate={handleRotate}
        />
      ) : (
        <QRSummaryState
          subjectLabel={subjectLabel}
          classLabel={classLabel}
          periodLabel={periodLabel}
          dateLabel={new Date().toLocaleDateString()}
          initialStudents={liveStudents}
          teacherId={teacherId!}
          sessionId={activeSessionId!}
          classId={selectedClass}
          onDone={async () => {
            if (activeSessionId) {
              const supabase = createClient()

              // Step 1: Ensure all class students have records resolved before session is finalized
              if (selectedClass) {
                const { data: classStudents } = await supabase
                  .from("students")
                  .select("id")
                  .eq("class_id", selectedClass)

                const { data: existingAttendance } = await supabase
                  .from("period_attendance")
                  .select("student_id")
                  .eq("session_id", activeSessionId)

                const existingIds = new Set(
                  (existingAttendance || []).map((r: any) => r.student_id)
                )

                const missingStudents = (classStudents || []).filter(
                  (s: any) => !existingIds.has(s.id)
                )
                if (missingStudents.length > 0) {
                  await supabase.from("period_attendance").insert(
                    missingStudents.map((s: any) => ({
                      session_id: activeSessionId,
                      student_id: s.id,
                      status: "absent",
                    }))
                  )
                }
              }

              // Step 2: Ensure any remaining pending or failed records are marked absent
              await supabase
                .from("period_attendance")
                .update({ status: "absent" })
                .eq("session_id", activeSessionId)
                .in("status", ["pending", "failed"])

              // Step 3: Set attendance_sessions to finalized with finalized_at
              await supabase
                .from("attendance_sessions")
                .update({
                  status: "finalized",
                  finalized_at: new Date().toISOString(),
                })
                .eq("id", activeSessionId)

              // Step 4: Write system log
              await supabase.from("system_logs").insert({
                performed_by: teacherId,
                action_type: "create",
                description: `Finalized attendance session for ${subjectLabel}`,
              })

              toast.success("Attendance session finalized successfully", {
                description: `${subjectLabel} — ${classLabel} — ${periodLabel}`,
              })
            }
            setPageState("setup")
            setSelectedClass("")
            setSelectedSubject("")
            setSelectedPeriod("")
            setPeriodAutoFilled(false)
            setActiveSessionId(null)
            setActiveSessionOpenedAt(null)
            setLiveStudents([])
            queryClient.invalidateQueries({ queryKey: ["teacher-qr-setup"] })
          }}
        />
      )}
      </motion.div>
    </AnimatePresence>
  )
}