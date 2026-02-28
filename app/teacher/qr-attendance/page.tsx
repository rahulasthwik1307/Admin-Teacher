"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { QRSetupState, DropdownOption, RecentSessionData } from "@/components/teacher/qr-setup-state"
import { QRActiveSession } from "@/components/teacher/qr-active-session"
import { createClient } from "@/lib/supabase/client"
import type { Student } from "@/lib/qr-attendance-data"

type PageState = "setup" | "active" // active encompasses "paused" too via isPaused

export default function QRAttendancePage() {
  const [pageState, setPageState] = useState<PageState>("setup")
  const [selectedClass, setSelectedClass] = useState("")
  const [selectedSubject, setSelectedSubject] = useState("")
  const [selectedPeriod, setSelectedPeriod] = useState("")
  const [isPaused, setIsPaused] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  
  // Data State
  const [teacherId, setTeacherId] = useState<string | null>(null)
  const [classOptions, setClassOptions] = useState<DropdownOption[]>([])
  const [subjectOptions, setSubjectOptions] = useState<DropdownOption[]>([])
  const [periodOptions, setPeriodOptions] = useState<DropdownOption[]>([])
  const [recentSessions, setRecentSessions] = useState<RecentSessionData[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [liveStudents, setLiveStudents] = useState<Student[]>([])

  const canStart = !!selectedClass && !!selectedSubject && !!selectedPeriod

  const subjectLabel = subjectOptions.find((o) => o.value === selectedSubject)?.label ?? ""
  const classLabel = classOptions.find((o) => o.value === selectedClass)?.label ?? ""
  const periodLabel = periodOptions.find((o) => o.value === selectedPeriod)?.label ?? ""

  // Initial Fetch Setup
  const fetchSetupData = useCallback(async (uid: string) => {
    try {
      const supabase = createClient()
      
      // 1. Fetch Classes
      const { data: classes } = await supabase
        .from('classes')
        .select('id, section, department:departments(code)')
      if (classes) {
        setClassOptions(classes.map((c: any) => ({
          value: c.id,
          label: `${c.department.code}-${c.section}`
        })))
      }

      // 2. Fetch Subjects Assigned to Teacher
      const { data: assignments } = await supabase
        .from('teacher_assignments')
        .select('subject:subjects(id, name)')
        .eq('teacher_id', uid)
      if (assignments) {
        setSubjectOptions(assignments.map((a: any) => ({
          value: a.subject.id,
          label: a.subject.name
        })))
      }

      // 3. Fetch Periods
      const { data: periods } = await supabase
        .from('periods')
        .select('*')
        .order('period_number', { ascending: true })
      if (periods) {
        setPeriodOptions(periods.map((p: any) => ({
          value: p.id,
          label: `${p.period_number} Period ${p.start_time.slice(0,5)} - ${p.end_time.slice(0,5)}`
        })))
      }

      // 4. Fetch Recent Sessions
      const { data: recent } = await supabase
        .from('attendance_sessions')
        .select(`
          id, date, status,
          subject:subjects(name),
          class:classes(section, department:departments(code)),
          period:periods(period_number)
        `)
        .eq('teacher_id', uid)
        .eq('status', 'finalized')
        .order('date', { ascending: false })
        .limit(5)
        
      if (recent) {
        // Needs parallel present/total count fetches per session
        const processedRecent = await Promise.all(recent.map(async (r: any) => {
          const { count: presentCount } = await supabase
            .from('period_attendance')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', r.id)
            .eq('status', 'present')
            
          const { count: totalCount } = await supabase
            .from('period_attendance')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', r.id)

          return {
            subject: r.subject.name,
            class: `${r.class.department.code}-${r.class.section}`,
            period: `${r.period.period_number}st`, 
            date: new Date(r.date).toLocaleDateString(),
            present: presentCount || 0,
            total: totalCount || 0,
            status: 'Finalized'
          }
        }))
        setRecentSessions(processedRecent)
      }
    } catch (err: any) {
      console.error("Setup fetch error:", err)
      toast.error("Failed to load setup data")
    }
  }, [])

  const checkForActiveSession = useCallback(async (uid: string) => {
    try {
      const supabase = createClient()
      const { data: active } = await supabase
        .from('attendance_sessions')
        .select('*')
        .eq('teacher_id', uid)
        .in('status', ['active', 'paused'])
        .single()

      if (active) {
        setActiveSessionId(active.id)
        setSelectedClass(active.class_id)
        setSelectedSubject(active.subject_id)
        setSelectedPeriod(active.period_id)
        setIsPaused(active.status === 'paused')
        setPageState('active')
      }
    } catch (err) {
      console.error("Check active session error:", err)
    }
  }, [])

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setTeacherId(user.id)
        await fetchSetupData(user.id)
        await checkForActiveSession(user.id)
      }
    }
    init()
  }, [fetchSetupData, checkForActiveSession])
  // Real-time Student List
  useEffect(() => {
    if (!activeSessionId || pageState !== "active") return

    let channel: any
    
    async function fetchInitialStudents() {
      const supabase = createClient()
      
      // 1. Fetch all students in the class
      const { data: classStudents } = await supabase
        .from('students')
        .select('id, user_id, roll_number, users(full_name)')
        .eq('class_id', selectedClass)
        
      if (!classStudents) return

      // 2. Fetch existing attendance records
      const { data: attendance } = await supabase
        .from('period_attendance')
        .select('*')
        .eq('session_id', activeSessionId)

      const attendanceMap = new Map()
      if (attendance) {
        attendance.forEach((a: any) => attendanceMap.set(a.student_id, a))
      }

      // 3. Merge
      const initialList: Student[] = classStudents.map((s: any) => {
        const att = attendanceMap.get(s.id)
        let status: "present" | "failed" | "pending" = "pending"
        let time = undefined

        if (att) {
          status = att.status as "present" | "failed"
          time = new Date(att.marked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }

        const name = s.users?.full_name || "Unknown Student"
        const initials = name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase()

        return {
          id: s.id,
          name,
          roll: s.roll_number,
          initials,
          status,
          time
        }
      })

      // Sort: Present/Failed first, then pending
      initialList.sort((a, b) => {
        if (a.status !== "pending" && b.status === "pending") return -1
        if (a.status === "pending" && b.status !== "pending") return 1
        return 0
      })

      setLiveStudents(initialList)

      // 4. Subscribe to Realtime
      channel = supabase
        .channel(`attendance_${activeSessionId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'period_attendance', filter: `session_id=eq.${activeSessionId}` },
          (payload) => {
            const newRecord = payload.new as any
            setLiveStudents((prev) => {
              const copy = [...prev]
              const idx = copy.findIndex((s) => s.id === newRecord.student_id)
              if (idx !== -1) {
                copy[idx] = {
                  ...copy[idx],
                  status: newRecord.status,
                  time: new Date(newRecord.marked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
                // Re-sort
                copy.sort((a, b) => {
                  if (a.status !== "pending" && b.status === "pending") return -1
                  if (a.status === "pending" && b.status !== "pending") return 1
                  return 0
                })
              }
              return copy
            })
          }
        )
        .subscribe()
    }

    fetchInitialStudents()

    return () => {
      if (channel) {
        const supabase = createClient()
        supabase.removeChannel(channel)
      }
    }
  }, [activeSessionId, pageState, selectedClass])

  async function handleStart() {
    if (!teacherId || !selectedClass || !selectedSubject || !selectedPeriod) return
    setIsTransitioning(true)
    
    try {
      const supabase = createClient()
      const token = crypto.randomUUID()
      const expiry = new Date(Date.now() + 15000).toISOString()

      // Insert session
      const { data: session, error: sessionErr } = await supabase
        .from('attendance_sessions')
        .insert({
          teacher_id: teacherId,
          subject_id: selectedSubject,
          class_id: selectedClass,
          period_id: selectedPeriod,
          session_date: new Date().toISOString().split('T')[0],
          status: 'active',
          current_qr_token: token,
          qr_token_expires_at: expiry
        })
        .select('id')
        .single()

      if (sessionErr) throw sessionErr

      // Insert first token
      await supabase
        .from('qr_tokens')
        .insert({
          session_id: session.id,
          token: token,
          expires_at: expiry,
          is_used: false
        })

      setActiveSessionId(session.id)
      
      setTimeout(() => {
        setPageState("active")
        setIsPaused(false)
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

      // Invalidate old tokens
      await supabase
        .from('qr_tokens')
        .update({ is_used: true })
        .eq('session_id', activeSessionId)
        .eq('is_used', false)

      // Update session
      await supabase
        .from('attendance_sessions')
        .update({
          current_qr_token: newToken,
          qr_token_expires_at: expiry
        })
        .eq('id', activeSessionId)

      // Insert new token
      await supabase
        .from('qr_tokens')
        .insert({
          session_id: activeSessionId,
          token: newToken,
          expires_at: expiry,
          is_used: false
        })
    } catch (err) {
      console.error("Failed to rotate QR", err)
    }
  }

  async function handleTogglePause() {
    if (!activeSessionId) return
    try {
      const supabase = createClient()
      const newStatus = isPaused ? 'active' : 'paused'
      
      const { error } = await supabase
        .from('attendance_sessions')
        .update({ status: newStatus })
        .eq('id', activeSessionId)

      if (error) throw error

      setIsPaused((p) => !p)
      
      // If resuming, manually fire an immediate rotation to ensure a fresh token
      if (newStatus === 'active') {
         await handleRotate()
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to update session status")
    }
  }

  async function handleFinalize() {
    if (!activeSessionId) return
    setIsTransitioning(true)

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('attendance_sessions')
        .update({ 
          status: 'finalized',
          finalized_at: new Date().toISOString()
        })
        .eq('id', activeSessionId)

      if (error) throw error

      await supabase.from("system_logs").insert({
        performed_by: teacherId,
        action_type: "create",
        description: `Finalized attendance session for ${subjectLabel}`,
      })

      setTimeout(async () => {
        setPageState("setup")
        setSelectedClass("")
        setSelectedSubject("")
        setSelectedPeriod("")
        setActiveSessionId(null)
        setLiveStudents([])
        setIsPaused(false)
        setIsTransitioning(false)
        toast.success("Attendance finalized successfully", {
          description: `${subjectLabel} — ${classLabel} — ${periodLabel}`,
        })
        
        // Refresh recent sessions table
        if (teacherId) {
          await fetchSetupData(teacherId)
        }
      }, 200)
    } catch (err) {
      console.error(err)
      toast.error("Failed to finalize session")
      setIsTransitioning(false)
    }
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
          classOptions={classOptions}
          subjectOptions={subjectOptions}
          periodOptions={periodOptions}
          recentSessions={recentSessions}
        />
      ) : (
        <QRActiveSession
          subjectLabel={subjectLabel}
          classLabel={classLabel}
          periodLabel={periodLabel}
          students={liveStudents}
          isPaused={isPaused}
          onTogglePause={handleTogglePause}
          onFinalize={handleFinalize}
          onRotate={handleRotate}
        />
      )}
    </div>
  )
}
