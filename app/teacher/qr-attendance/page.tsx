"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { toast } from "sonner"
import { QRSetupState, DropdownOption, RecentSessionData, OccupiedSlotData } from "@/components/teacher/qr-setup-state"
import { QRActiveSession } from "@/components/teacher/qr-active-session"
import { createClient } from "@/lib/supabase/client"
import type { Student } from "@/lib/qr-attendance-data"

import { QRSummaryState } from "@/components/teacher/qr-summary-state"

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

export default function QRAttendancePage() {
  const [pageState, setPageState] = useState<PageState>("setup")
  const [selectedClass, setSelectedClass] = useState("")
  const [selectedSubject, setSelectedSubject] = useState("")
  const [selectedPeriod, setSelectedPeriod] = useState("")
  const [isTransitioning, setIsTransitioning] = useState(false)



  // Data State
  const [teacherId, setTeacherId] = useState<string | null>(null)
  const [teacherName, setTeacherName] = useState<string>("")
  const [classOptions, setClassOptions] = useState<DropdownOption[]>([])
  const [subjectOptions, setSubjectOptions] = useState<DropdownOption[]>([])
  const [periodOptions, setPeriodOptions] = useState<DropdownOption[]>([])
  const [recentSessions, setRecentSessions] = useState<RecentSessionData[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [activeSessionOpenedAt, setActiveSessionOpenedAt] = useState<string | null>(null)
  const [currentQrToken, setCurrentQrToken] = useState<string>("")
  const [liveStudents, setLiveStudents] = useState<Student[]>([])
  const [recentSessionsLoading, setRecentSessionsLoading] = useState(true)
  const [todayOccupiedSlots, setTodayOccupiedSlots] = useState<Map<string, OccupiedSlotData>>(new Map())

  // Timetable state
  const [todayTimetableEntries, setTodayTimetableEntries] = useState<any[]>([])
  const [classSubjectMap, setClassSubjectMap] = useState<Map<string, DropdownOption[]>>(new Map())
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

  // Initial Fetch Setup
  const fetchSetupData = useCallback(async (uid: string) => {
    try {
      const supabase = createClient()

      const todayStr = new Date().toISOString().split("T")[0]
      const jsDay = new Date().getDay()
      const todayDow = jsDay === 0 ? null : jsDay

      const [
        { data: assignments },
        { data: periods },
        { data: recent },
        { data: timetableEntries },
        { data: todaySessions },
      ] = await Promise.all([
        // Fetch assignments with BOTH class and subject joined together
        supabase
          .from("teacher_assignments")
          .select(`
            class_id,
            subject_id,
            class:classes(id, name, section, year, department:departments(code)),
            subject:subjects(id, name)
          `)
          .eq("teacher_id", uid),
        supabase
          .from("periods")
          .select("*")
          .order("period_number", { ascending: true }),
        supabase
          .from("attendance_sessions")
          .select(`
            id, session_date, finalized_at, status,
            qr_tokens:qr_tokens(count),
            subject:subjects(name),
            class:classes(name, section, year, department:departments(code)),
            period:periods(period_number),
            present_count:period_attendance(count),
            total_count:period_attendance(count)
          `)
          .eq("teacher_id", uid)
          .eq("status", "finalized")
          .order("finalized_at", { ascending: false })
          .limit(30),
        todayDow
          ? supabase
              .from("timetables")
              .select("class_id, subject_id, period_id, period:periods(id, period_number, start_time, end_time)")
              .eq("teacher_id", uid)
              .eq("day_of_week", todayDow)
          : Promise.resolve({ data: [] }),
        supabase
          .from("attendance_sessions")
          .select(`
            id, class_id, subject_id, period_id, session_date, status,
            qr_tokens:qr_tokens(count),
            subject:subjects(id, name),
            period:periods(id, period_number)
          `)
          .eq("teacher_id", uid)
          .eq("session_date", todayStr),
      ])

      // 1. Classes — unique, from assignments
      if (assignments) {
        const uniqueClasses = new Map()
        for (const a of assignments as any[]) {
          if (a.class && !uniqueClasses.has(a.class_id)) {
            uniqueClasses.set(a.class_id, a.class)
          }
        }
        setClassOptions(
          Array.from(uniqueClasses.values()).map((c: any) => ({
            value: c.id,
            label: `${c.name}-${c.section} · ${c.year}`,
          }))
        )
      }

      // 2. Store full assignment map: classId -> subject options
      // This is the KEY fix — subjects are now filtered per class
      if (assignments) {
        const classSubjectMap = new Map<string, DropdownOption[]>()
        for (const a of assignments as any[]) {
          if (!a.class_id || !a.subject) continue
          if (!classSubjectMap.has(a.class_id)) {
            classSubjectMap.set(a.class_id, [])
          }
          classSubjectMap.get(a.class_id)!.push({
            value: a.subject_id,
            label: a.subject.name,
          })
        }
        setClassSubjectMap(classSubjectMap)

        // Set all unique subjects for initial state (will filter when class selected)
        const allSubjects = new Map<string, string>()
        for (const a of assignments as any[]) {
          if (a.subject) allSubjects.set(a.subject_id, a.subject.name)
        }
        setSubjectOptions(
          Array.from(allSubjects.entries()).map(([id, name]) => ({
            value: id,
            label: name,
          }))
        )
      }

      // 3. Periods fallback list
      if (periods) {
        setPeriodOptions(
          periods.map((p: any) => ({
            value: p.id,
            label: `${p.period_number} Period ${p.start_time.slice(0, 5)} - ${p.end_time.slice(0, 5)}`,
          }))
        )
      }

      // 4. Timetable entries for today
      if (timetableEntries && timetableEntries.length > 0) {
        setTodayTimetableEntries(timetableEntries)
      } else {
        setTodayTimetableEntries([])
      }

      // 4b. Today's occupied slots map (key: "class_id__period_id")
      const occupiedMap = new Map<string, OccupiedSlotData>()
      if (todaySessions && todaySessions.length > 0) {
        for (const s of (todaySessions as any[])) {
          if (s.class_id && s.period_id) {
            const key = `${s.class_id}__${s.period_id}`
            const isManual = (s.qr_tokens?.[0]?.count ?? 0) === 0
            occupiedMap.set(key, {
              sessionId: s.id,
              subjectId: s.subject_id,
              subjectName: s.subject?.name || "Unknown Subject",
              periodId: s.period_id,
              periodNumber: s.period?.period_number ?? 0,
              status: s.status,
              isManual,
            })
          }
        }
      }
      setTodayOccupiedSlots(occupiedMap)

      // 5. Recent sessions — only include sessions that generated live QR scan tokens (qr_tokens count > 0)
      if (recent && recent.length > 0) {
        const qrOnlySessions = (recent as any[]).filter(
          (r: any) => (r.qr_tokens?.[0]?.count ?? 0) > 0
        )
        // Group by logical slot identity to guarantee exactly 1 card per distinct lesson
        const dedupeMap = new Map<string, any>()
        for (const r of qrOnlySessions) {
          const classId = r.class?.name ? `${r.class?.name}-${r.class?.section}` : (r.class_id || "")
          const subjectName = r.subject?.name || (r.subject_id || "")
          const periodNum = r.period?.period_number ?? (r.period_id || "")
          const key = `${r.session_date}__${classId}__${subjectName}__${periodNum}`
          const existing = dedupeMap.get(key)
          if (!existing || (r.finalized_at && (!existing.finalized_at || r.finalized_at > existing.finalized_at))) {
            dedupeMap.set(key, r)
          }
        }
        const uniqueRecent = Array.from(dedupeMap.values())
        const sessionIds = uniqueRecent.map((r: any) => r.id)

        const [{ data: presentCounts }, { data: totalCounts }] = await Promise.all([
          supabase
            .from("period_attendance")
            .select("session_id")
            .in("session_id", sessionIds)
            .eq("status", "present"),
          supabase
            .from("period_attendance")
            .select("session_id")
            .in("session_id", sessionIds),
        ])

        const presentMap = new Map<string, number>()
        for (const row of (presentCounts ?? [])) {
          presentMap.set(row.session_id, (presentMap.get(row.session_id) ?? 0) + 1)
        }
        const totalMap = new Map<string, number>()
        for (const row of (totalCounts ?? [])) {
          totalMap.set(row.session_id, (totalMap.get(row.session_id) ?? 0) + 1)
        }

        const processedRecent = uniqueRecent.map((r: any) => {
          const n = r.period?.period_number ?? 0
          const suffix = getOrdinalSuffix(n)
          const deptCode = r.class?.department?.code ?? r.class?.name ?? "Class"
          const section = r.class?.section ?? ""
          const yearStr = r.class?.year ? ` · ${r.class.year}` : ""
          return {
            subject: r.subject?.name ?? "Unknown Subject",
            class: `${deptCode}-${section}${yearStr}`,
            period: `${n}${suffix}`,
            date: new Date(r.session_date).toLocaleDateString(),
            time: r.finalized_at
              ? new Date(r.finalized_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "",
            present: presentMap.get(r.id) ?? 0,
            total: totalMap.get(r.id) ?? 0,
            status: "Finalized",
          }
        })
        setRecentSessions(processedRecent)
      }
      setRecentSessionsLoading(false)
    } catch (err: any) {
      console.error("Setup fetch error:", err)
      toast.error("Failed to load setup data")
      setRecentSessionsLoading(false)
    }
  }, [])

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

        await fetchSetupData(user.id)
        await checkForActiveSession(user.id)
      }
    }
    init()
  }, [fetchSetupData, checkForActiveSession])

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
          fetchSetupData(teacherId)
        }
        setIsTransitioning(false)
        return
      }

      if (res?.action === "resumed_review" || res?.action === "reopened_review") {
        setActiveSessionId(res.sessionId)
        setActiveSessionOpenedAt(res.openedAt || null)
        setCurrentQrToken(res.currentQrToken || "")
        setTimeout(() => {
          setPageState("summary")
          setIsTransitioning(false)
          if (res?.action === "reopened_review") {
            toast.info("Existing session reopened for review", {
              description: "Review and update student attendance records as needed.",
            })
          }
        }, 200)
        return
      }

      if (res?.action === "resumed_active" || res?.action === "created_active") {
        setActiveSessionId(res.sessionId)
        setActiveSessionOpenedAt(res.openedAt || null)
        setCurrentQrToken(res.currentQrToken || "")
        setTimeout(() => {
          setPageState("active")
          setIsTransitioning(false)
        }, 200)
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

      setTimeout(async () => {
        setPageState("summary")
        setIsTransitioning(false)
        toast.success("Attendance closed for review", {
          description: `${subjectLabel} — ${classLabel} — ${periodLabel}`,
        })

        if (teacherId) {
          fetchSetupData(teacherId)
        }
      }, 200)
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
            if (teacherId) {
              fetchSetupData(teacherId)
            }
          }}
        />
      )}
    </div>
  )
}