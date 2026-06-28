"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { toast } from "sonner"
import { QRSetupState, DropdownOption, RecentSessionData } from "@/components/teacher/qr-setup-state"
import { QRActiveSession } from "@/components/teacher/qr-active-session"
import { createClient } from "@/lib/supabase/client"
import type { Student } from "@/lib/qr-attendance-data"

import { QRSummaryState } from "@/components/teacher/qr-summary-state"

type PageState = "setup" | "active" | "summary"

export default function QRAttendancePage() {
  const [pageState, setPageState] = useState<PageState>("setup")
  const [selectedClass, setSelectedClass] = useState("")
  const [selectedSubject, setSelectedSubject] = useState("")
  const [selectedPeriod, setSelectedPeriod] = useState("")
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Auth session tracking
  const sessionRef = useRef<any>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      sessionRef.current = session
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      sessionRef.current = session
    })
    return () => subscription.unsubscribe()
  }, [])

  // Data State
  const [teacherId, setTeacherId] = useState<string | null>(null)
  const [teacherName, setTeacherName] = useState<string>("")
  const [classOptions, setClassOptions] = useState<DropdownOption[]>([])
  const [subjectOptions, setSubjectOptions] = useState<DropdownOption[]>([])
  const [periodOptions, setPeriodOptions] = useState<DropdownOption[]>([])
  const [recentSessions, setRecentSessions] = useState<RecentSessionData[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [currentQrToken, setCurrentQrToken] = useState<string>("")
  const [liveStudents, setLiveStudents] = useState<Student[]>([])
  const [recentSessionsLoading, setRecentSessionsLoading] = useState(true)

  // Timetable state
  const [timetableMap, setTimetableMap] = useState<
    Map<string, { periodId: string; periodLabel: string }>
  >(new Map()) // key: "classId__subjectId"
  const [classSubjectMap, setClassSubjectMap] = useState<Map<string, DropdownOption[]>>(new Map())
  const [periodAutoFilled, setPeriodAutoFilled] = useState(false)

  const canStart = !!selectedClass && !!selectedSubject && !!selectedPeriod

  const subjectLabel = subjectOptions.find((o) => o.value === selectedSubject)?.label ?? ""
  const classLabel = classOptions.find((o) => o.value === selectedClass)?.label ?? ""
  const periodLabel = periodOptions.find((o) => o.value === selectedPeriod)?.label ?? ""

  // Initial Fetch Setup
  const fetchSetupData = useCallback(async (uid: string) => {
    try {
      const supabase = createClient()

      const jsDay = new Date().getDay()
      const todayDow = jsDay === 0 ? null : jsDay

      const [
        { data: assignments },
        { data: periods },
        { data: recent },
        { data: timetableEntries },
      ] = await Promise.all([
        // Fetch assignments with BOTH class and subject joined together
        supabase
          .from("teacher_assignments")
          .select(`
            class_id,
            subject_id,
            class:classes(id, name, section, department:departments(code)),
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
            subject:subjects(name),
            class:classes(section, department:departments(code)),
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
            label: `${c.name}-${c.section}`,
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

      // 3. Periods
      if (periods) {
        setPeriodOptions(
          periods.map((p: any) => ({
            value: p.id,
            label: `${p.period_number} Period ${p.start_time.slice(0, 5)} - ${p.end_time.slice(0, 5)}`,
          }))
        )
      }

      // 4. Timetable map
      if (timetableEntries && timetableEntries.length > 0) {
        const map = new Map<string, { periodId: string; periodLabel: string }>()
        for (const t of timetableEntries as any[]) {
          const key = `${t.class_id}__${t.subject_id}`
          const p = t.period
          const label = p
            ? `${p.period_number} Period ${p.start_time.slice(0, 5)} - ${p.end_time.slice(0, 5)}`
            : ""
          map.set(key, { periodId: t.period_id, periodLabel: label })
        }
        setTimetableMap(map)
      } else {
        setTimetableMap(new Map())
      }

      // 5. Recent sessions — fetch attendance counts in bulk, not per session
      if (recent && recent.length > 0) {
        const sessionIds = recent.map((r: any) => r.id)

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

        const processedRecent = recent.map((r: any) => {
          const n = r.period.period_number
          const suffix =
            n >= 11 && n <= 13
              ? "th"
              : ["th", "st", "nd", "rd"][Math.min(n % 10, 3)] ?? "th"
          return {
            subject: r.subject.name,
            class: `${r.class.department.code}-${r.class.section}`,
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
      const { data: active } = await supabase
        .from("attendance_sessions")
        .select("*")
        .eq("teacher_id", uid)
        .eq("status", "active")
        .single()

      if (active) {
        setActiveSessionId(active.id)
        setCurrentQrToken(active.current_qr_token || "")
        setSelectedClass(active.class_id)
        setSelectedSubject(active.subject_id)
        setSelectedPeriod(active.period_id)
        setPageState("active")
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

  // Auto-fill period when class + subject both selected
  useEffect(() => {
    if (!selectedClass || !selectedSubject) {
      setPeriodAutoFilled(false)
      return
    }
    const key = `${selectedClass}__${selectedSubject}`
    const found = timetableMap.get(key)
    if (found) {
      setSelectedPeriod(found.periodId)
      setPeriodAutoFilled(true)
    } else {
      setSelectedPeriod("")
      setPeriodAutoFilled(false)
    }
  }, [selectedClass, selectedSubject, timetableMap])

  // Fetch complete student list with attendance status via API route
  const fetchStudentList = useCallback(async () => {
    if (!activeSessionId || !selectedClass) return

    try {
      const res = await fetch(
        `/api/teacher/student-list?class_id=${selectedClass}&session_id=${activeSessionId}`
      )
      const data = await res.json()
      console.log("full API response data:", JSON.stringify(data))
      if (data.students) {
        setLiveStudents(data.students)
      }
    } catch (err) {
      console.error("fetchStudentList error:", err)
    }
  }, [activeSessionId, selectedClass])

  // Real-time Student List + polling fallback
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

    return () => {
      supabase.removeChannel(channel)
      if (liveRefreshInterval.current) {
        clearInterval(liveRefreshInterval.current)
        liveRefreshInterval.current = null
      }
    }
  }, [activeSessionId, pageState, fetchStudentList])

  async function handleStart() {
    if (!teacherId || !selectedClass || !selectedSubject || !selectedPeriod) return
    setIsTransitioning(true)

    try {
      const supabase = createClient()
      const token = crypto.randomUUID()
      const expiry = new Date(Date.now() + 15000).toISOString()

      const { data: session, error: sessionErr } = await supabase
        .from("attendance_sessions")
        .insert({
          teacher_id: teacherId,
          subject_id: selectedSubject,
          class_id: selectedClass,
          period_id: selectedPeriod,
          session_date: new Date().toISOString().split("T")[0],
          status: "active",
          current_qr_token: token,
          qr_token_expires_at: expiry,
        })
        .select("id")
        .single()

      if (sessionErr) throw sessionErr

      await supabase.from("qr_tokens").insert({
        session_id: session.id,
        token: token,
        expires_at: expiry,
        is_used: false,
      })

      setActiveSessionId(session.id)
      setCurrentQrToken(token)

      setTimeout(() => {
        setPageState("active")
        setIsTransitioning(false)
      }, 200)
    } catch (err: any) {
      console.error(err)
      toast.error("Failed to start session")
      setIsTransitioning(false)
    }
  }

  async function handleRotate() {
    if (!activeSessionId) return
    try {
      const supabase = createClient()
      const newToken = crypto.randomUUID()
      const expiry = new Date(Date.now() + 15000).toISOString()
      setCurrentQrToken(newToken)

      await supabase
        .from("qr_tokens")
        .update({ is_used: true })
        .eq("session_id", activeSessionId)
        .eq("is_used", false)

      await supabase
        .from("attendance_sessions")
        .update({
          current_qr_token: newToken,
          qr_token_expires_at: expiry,
        })
        .eq("id", activeSessionId)

      await supabase.from("qr_tokens").insert({
        session_id: activeSessionId,
        token: newToken,
        expires_at: expiry,
        is_used: false,
      })
    } catch (err) {
      console.error("Failed to rotate QR", err)
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
          finalized_at: new Date().toISOString(),
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
        .eq("status", "pending")

      await supabase.from("system_logs").insert({
        performed_by: teacherId,
        action_type: "create",
        description: `Finalized attendance session for ${subjectLabel}`,
      })

      setTimeout(async () => {
        setPageState("summary")
        setIsTransitioning(false)
        toast.success("Attendance finalized successfully", {
          description: `${subjectLabel} — ${classLabel} — ${periodLabel}`,
        })

        if (teacherId) {
          fetchSetupData(teacherId)
        }
      }, 200)
    } catch (err) {
      console.error(err)
      toast.error("Failed to finalize session")
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
          periodOptions={periodOptions}
          periodAutoFilled={periodAutoFilled}
          recentSessions={recentSessions}
          recentSessionsLoading={recentSessionsLoading}
        />
      ) : pageState === "active" ? (
        <QRActiveSession
          subjectLabel={subjectLabel}
          classLabel={classLabel}
          periodLabel={periodLabel}
          teacherName={teacherName}
          students={liveStudents}
          currentQrToken={currentQrToken}
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
          onDone={async () => {
            if (activeSessionId) {
              const supabase = createClient()
              await supabase
                .from("attendance_sessions")
                .update({ status: "finalized" })
                .eq("id", activeSessionId)
            }
            setPageState("setup")
            setSelectedClass("")
            setSelectedSubject("")
            setSelectedPeriod("")
            setPeriodAutoFilled(false)
            setActiveSessionId(null)
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