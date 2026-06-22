"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, BookOpen, ArrowRight } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface ClassRow {
  key: string
  subject: string
  className: string
  section: string
  students: number
  lastAttendance: string
}

export function MyClasses() {
  const supabase = createClient()
  const [rows, setRows] = useState<ClassRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const teacherId = session.user.id

      const { data: assignments } = await supabase
        .from("teacher_assignments")
        .select(`id, subject_id, class_id, subjects ( name ), classes ( name, section )`)
        .eq("teacher_id", teacherId)

      if (!assignments || assignments.length === 0) { setRows([]); setLoading(false); return }

      const built: ClassRow[] = await Promise.all(
        assignments.map(async (asgn: any) => {
          const { count: studentCount } = await supabase
            .from("students")
            .select("id", { count: "exact", head: true })
            .eq("class_id", asgn.class_id)
            .eq("is_active", true)

          const { data: lastSession } = await supabase
            .from("attendance_sessions")
            .select("session_date")
            .eq("teacher_id", teacherId)
            .eq("subject_id", asgn.subject_id)
            .eq("class_id", asgn.class_id)
            .eq("status", "finalized")
            .order("session_date", { ascending: false })
            .limit(1)
            .maybeSingle()

          let lastAttendance = "No sessions yet"
          if (lastSession?.session_date) {
            const d = new Date(lastSession.session_date + "T00:00:00")
            lastAttendance = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
          }

          return {
            key: asgn.id,
            subject: asgn.subjects?.name ?? "Unknown",
            className: asgn.classes?.name ?? "Unknown",
            section: asgn.classes?.section ?? "",
            students: studentCount ?? 0,
            lastAttendance,
          }
        })
      )

      setRows(built)
      setLoading(false)
    }
    fetch()
  }, [])

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-0">
        <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
          <BookOpen className="size-4 text-primary" />
          My Classes & Subjects
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">No subjects assigned yet.</p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-hidden w-full">
              <table className="w-full text-sm table-fixed">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <th className="pb-3 pr-4 w-[28%]">Subject</th>
                    <th className="pb-3 pr-4 w-[16%]">Class</th>
                    <th className="pb-3 pr-4 w-[14%]">Section</th>
                    <th className="pb-3 pr-4 w-[14%]">Students</th>
                    <th className="pb-3 pr-4 w-[14%]">Last Attendance</th>
                    <th className="pb-3 text-right w-[14%]">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.key}
                      className="group border-b border-border last:border-0 transition-colors duration-150 hover:bg-muted/40"
                    >
                      <td className="py-3.5 pr-4 truncate max-w-30" title={row.subject}>
                        <span className="font-semibold text-foreground">{row.subject}</span>
                      </td>
                      <td className="py-3.5 pr-4 text-muted-foreground truncate">{row.className}</td>
                      <td className="py-3.5 pr-4 text-muted-foreground truncate">{row.section}</td>
                      <td className="py-3.5 pr-4">
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                          {row.students}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4 text-muted-foreground text-xs truncate">{row.lastAttendance}</td>
                      <td className="py-3.5 text-right">
                        <Button
                          asChild size="sm"
                          className="transition-all duration-150 hover:scale-[1.03] group/btn gap-1.5 px-2.5"
                        >
                          <Link href="/teacher/qr-attendance">
                            Take Attendance
                            <ArrowRight className="size-3.5 transition-transform duration-150 group-hover/btn:translate-x-0.5" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="flex flex-col gap-3 sm:hidden">
              {rows.map((row) => (
                <div key={row.key + "-mobile"} className="rounded-xl border border-border p-4 transition-colors hover:bg-muted/40">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{row.subject}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{row.className} — Section {row.section}</p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      {row.students} students
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Last: {row.lastAttendance}</span>
                    <Button asChild size="sm" className="gap-1.5">
                      <Link href="/teacher/qr-attendance">
                        Take Attendance
                        <ArrowRight className="size-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}