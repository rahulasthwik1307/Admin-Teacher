import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const [deptsRes, classesRes, subjectsRes, periodsRes, classCountRes, subjectCountRes] = await Promise.all([
      supabase.from("departments").select("id, name, code").order("name"),
      supabase.from("classes").select("id, name, section, department:departments ( name, code )").order("name"),
      supabase.from("subjects").select("id, name, code, department:departments ( name, code )").order("name"),
      supabase.from("periods").select("id, period_number, start_time, end_time").order("period_number"),
      supabase.from("classes").select("department_id"),
      supabase.from("subjects").select("department_id"),
    ])

    const classMap: Record<string, number> = {}
    const subjectMap: Record<string, number> = {}
    for (const c of classCountRes.data ?? []) classMap[c.department_id] = (classMap[c.department_id] || 0) + 1
    for (const s of subjectCountRes.data ?? []) subjectMap[s.department_id] = (subjectMap[s.department_id] || 0) + 1

    return NextResponse.json({
      departments: (deptsRes.data ?? []).map((d: any) => ({ id: d.id, name: d.name, code: d.code, classes: classMap[d.id] || 0, subjects: subjectMap[d.id] || 0 })),
      classes: (classesRes.data ?? []).map((c: any) => ({ id: c.id, name: c.name, section: c.section, department: c.department?.code ?? "—", departmentFull: c.department?.name ?? "—", displayName: `${c.name}-${c.section}` })),
      subjects: (subjectsRes.data ?? []).map((s: any) => ({ id: s.id, name: s.name, code: s.code, department: s.department?.code ?? "—", departmentFull: s.department?.name ?? "—" })),
      periods: (periodsRes.data ?? []).map((p: any) => ({ id: p.id, number: p.period_number, start: p.start_time, end: p.end_time, duration: (() => { const [sh,sm] = p.start_time.split(":").map(Number); const [eh,em] = p.end_time.split(":").map(Number); return `${eh*60+em-(sh*60+sm)} min` })() })),
    })
  } catch (e) {
    console.error("academic-structure-data API error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
