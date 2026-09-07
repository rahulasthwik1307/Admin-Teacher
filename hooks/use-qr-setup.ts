"use client"

import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { DropdownOption, RecentSessionData, OccupiedSlotData } from "@/components/teacher/qr-setup-state"

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

export interface QrSetupData {
  classOptions: DropdownOption[]
  classSubjectMap: Map<string, DropdownOption[]>
  periodOptions: DropdownOption[]
  todayTimetableEntries: any[]
  todayOccupiedSlots: Map<string, OccupiedSlotData>
  recentSessions: RecentSessionData[]
}

export async function fetchQrSetupData(uid: string): Promise<QrSetupData> {
  const supabase = createClient()
  const todayStr = new Date().toISOString().split("T")[0]
  const jsDay = new Date().getDay()
  const todayDow = jsDay === 0 ? null : jsDay

  // 1. Fetch teacher's authorized assignments first to establish strict API/query authorization scope
  const [
    { data: assignments },
    { data: periods },
    { data: timetableEntries },
  ] = await Promise.all([
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
    todayDow
      ? supabase
          .from("timetables")
          .select("class_id, subject_id, period_id, period:periods(id, period_number, start_time, end_time)")
          .eq("teacher_id", uid)
          .eq("day_of_week", todayDow)
      : Promise.resolve({ data: [] }),
  ])

  // Extract authorized classes and subject-class pairs
  const uniqueClasses = new Map()
  const classSubjectMap = new Map<string, DropdownOption[]>()
  const authorizedClassIds: string[] = []
  const authorizedPairs = new Set<string>()

  if (assignments) {
    for (const a of assignments as any[]) {
      if (a.class_id) {
        authorizedClassIds.push(a.class_id)
        if (a.subject_id) {
          authorizedPairs.add(`${a.subject_id}_${a.class_id}`)
        }
      }
      if (a.class && !uniqueClasses.has(a.class_id)) {
        uniqueClasses.set(a.class_id, a.class)
      }
      if (a.class_id && a.subject) {
        const existing = classSubjectMap.get(a.class_id) || []
        if (!existing.some((s) => s.value === a.subject.id)) {
          existing.push({ value: a.subject.id, label: a.subject.name })
        }
        classSubjectMap.set(a.class_id, existing)
      }
    }
  }

  const distinctAuthorizedClassIds = Array.from(new Set(authorizedClassIds))

  // 2. Fetch recent finalized sessions and today sessions with STRICT database/query-level authorization
  const [{ data: recent }, { data: todaySessions }] = distinctAuthorizedClassIds.length > 0
    ? await Promise.all([
        supabase
          .from("attendance_sessions")
          .select(`
            id, session_date, finalized_at, status, class_id, subject_id,
            qr_tokens:qr_tokens(count),
            subject:subjects(name),
            class:classes(name, section, year, department:departments(code)),
            period:periods(period_number)
          `)
          .eq("teacher_id", uid)
          .eq("status", "finalized")
          .in("class_id", distinctAuthorizedClassIds)
          .order("session_date", { ascending: false })
          .order("finalized_at", { ascending: false }),
        supabase
          .from("attendance_sessions")
          .select(`
            id, class_id, subject_id, period_id, session_date, status,
            qr_tokens:qr_tokens(count),
            subject:subjects(id, name),
            period:periods(id, period_number)
          `)
          .eq("teacher_id", uid)
          .eq("session_date", todayStr)
          .in("class_id", distinctAuthorizedClassIds),
      ])
    : [{ data: [] }, { data: [] }]

  const classOptions: DropdownOption[] = Array.from(uniqueClasses.values()).map((c: any) => ({
    value: c.id,
    label: `${c.name}-${c.section} · ${c.year}`,
  }))

  // Periods
  const periodOptions: DropdownOption[] = (periods || []).map((p: any) => ({
    value: p.id,
    label: `${p.period_number} Period ${p.start_time.slice(0, 5)} - ${p.end_time.slice(0, 5)}`,
  }))

  // Today timetable entries
  const todayTimetable = timetableEntries || []

  // Today's occupied slots map
  const occupiedMap = new Map<string, OccupiedSlotData>()
  if (todaySessions && todaySessions.length > 0) {
    for (const s of todaySessions as any[]) {
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

  // 5. Recent sessions (strictly authorized)
  let recentSessions: RecentSessionData[] = []
  if (recent && recent.length > 0) {
    const qrOnlySessions = (recent as any[]).filter(
      (r: any) =>
        (r.qr_tokens?.[0]?.count ?? 0) > 0 &&
        authorizedPairs.has(`${r.subject_id}_${r.class_id}`)
    )
    const dedupeMap = new Map<string, any>()
    for (const r of qrOnlySessions) {
      const classId = r.class?.name ? `${r.class?.name}-${r.class?.section}` : r.class_id || ""
      const subjectName = r.subject?.name || r.subject_id || ""
      const periodNum = (r.period?.period_number != null ? r.period.period_number : r.period_id) || ""
      const key = `${r.session_date}__${classId}__${subjectName}__${periodNum}`
      const existing = dedupeMap.get(key)
      if (!existing || (r.finalized_at && (!existing.finalized_at || r.finalized_at > existing.finalized_at))) {
        dedupeMap.set(key, r)
      }
    }
    const uniqueRecent = Array.from(dedupeMap.values())
    const sessionIds = uniqueRecent.map((r: any) => r.id)

    if (sessionIds.length > 0) {
      const { data: countsData, error: countsError } = await supabase.rpc(
        "get_session_attendance_counts",
        { p_session_ids: sessionIds }
      )

      if (countsError) {
        console.error("Failed to fetch session attendance counts:", countsError)
      }

      const presentMap = new Map<string, number>()
      const totalMap = new Map<string, number>()
      for (const row of (countsData ?? [])) {
        presentMap.set(row.session_id, Number(row.present_count ?? 0))
        totalMap.set(row.session_id, Number(row.total_count ?? 0))
      }

      recentSessions = uniqueRecent.map((r: any) => {
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
    }
  }

  return {
    classOptions,
    classSubjectMap,
    periodOptions,
    todayTimetableEntries: todayTimetable,
    todayOccupiedSlots: occupiedMap,
    recentSessions,
  }
}

export function useQrSetup(uid: string | null) {
  return useQuery({
    queryKey: ["teacher-qr-setup", uid],
    queryFn: () => fetchQrSetupData(uid!),
    enabled: !!uid,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}
