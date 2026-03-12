"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
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
        .select(`
          id,
          subject_id,
          class_id,
          subjects ( name ),
          classes ( name, section )
        `)
        .eq("teacher_id", teacherId)

      if (!assignments || assignments.length === 0) {
        setRows([])
        setLoading(false)
        return
      }

      const built: ClassRow[] = await Promise.all(
        assignments.map(async (asgn: any) => {
          const cls = asgn.classes
          const sub = asgn.subjects

          // Student count for this class
          const { count: studentCount } = await supabase
            .from("students")
            .select("id", { count: "exact", head: true })
            .eq("class_id", asgn.class_id)
            .eq("is_active", true)

          // Last finalized session for this subject+class
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
            lastAttendance = d.toLocaleDateString("en-US", {
              month: "short", day: "numeric", year: "numeric",
            })
          }

          return {
            key: asgn.id,
            subject: sub?.name ?? "Unknown",
            className: cls?.name ?? "Unknown",
            section: cls?.section ?? "",
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base text-muted-foreground font-semibold">
          My Classes & Subjects
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No subjects assigned yet.
          </p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <th className="pb-3 pr-4">Subject</th>
                    <th className="pb-3 pr-4">Class</th>
                    <th className="pb-3 pr-4">Section</th>
                    <th className="pb-3 pr-4">Students</th>
                    <th className="pb-3 pr-4">Last Attendance</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.key} className="border-b border-border last:border-0">
                      <td className="py-3.5 pr-4 font-medium text-foreground">{row.subject}</td>
                      <td className="py-3.5 pr-4 text-muted-foreground">{row.className}</td>
                      <td className="py-3.5 pr-4 text-muted-foreground">{row.section}</td>
                      <td className="py-3.5 pr-4 text-muted-foreground">{row.students}</td>
                      <td className="py-3.5 pr-4 text-muted-foreground">{row.lastAttendance}</td>
                      <td className="py-3.5 text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link href="/teacher/qr-attendance">Take Attendance</Link>
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
                <div key={row.key + "-mobile"} className="rounded-lg border border-border p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-foreground">{row.subject}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {row.className} - Section {row.section}
                      </p>
                    </div>
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {row.students} students
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Last: {row.lastAttendance}</span>
                    <Button asChild size="sm" variant="outline">
                      <Link href="/teacher/qr-attendance">Take Attendance</Link>
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