"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BookOpen, ArrowRight, Users, Clock, GraduationCap, Building2 } from "lucide-react"
import { useTeacherDashboard } from "@/hooks/use-teacher-dashboard"
import { MyClassesSkeleton } from "@/components/ui/skeletons"

export function MyClasses() {
  const { data, isLoading } = useTeacherDashboard()

  if (isLoading || !data) return <MyClassesSkeleton />

  const rows = data.myClasses

  return (
    <Card className="border-border shadow-2xs overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-3.5 border-b border-border/60 bg-muted/10">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BookOpen className="size-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold text-foreground">
              My Classes & Subjects
            </CardTitle>
            <CardDescription className="text-[11px] text-muted-foreground">
              Classes and courses assigned to your teaching schedule
            </CardDescription>
          </div>
        </div>
        <Badge variant="secondary" className="text-xs font-semibold px-2 py-0.5">
          {rows.length} Assigned
        </Badge>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            <BookOpen className="mx-auto size-8 text-muted-foreground/40 mb-2" />
            <p>No classes or subjects assigned yet.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto w-full">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/20 text-left">
                    <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Subject
                    </th>
                    <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Class & Section
                    </th>
                    <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground text-center">
                      Students
                    </th>
                    <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Last Attendance
                    </th>
                    <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground text-right">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.key}
                      className="border-b border-border/50 last:border-0 transition-colors hover:bg-muted/20"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-7.5 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                            <BookOpen className="size-3.5" />
                          </div>
                          <span className="font-semibold text-xs text-foreground truncate max-w-56" title={row.subject}>
                            {row.subject}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-xs font-bold text-blue-700 dark:text-blue-300">
                            <Building2 className="size-3 shrink-0" />
                            {row.className}-{row.section}
                          </span>
                          {row.year && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 text-xs font-bold text-purple-700 dark:text-purple-300">
                              <GraduationCap className="size-3 shrink-0" />
                              {row.year}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                          <Users className="size-3" />
                          {row.students}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="size-3 shrink-0 text-muted-foreground/70" />
                          <span>{row.lastAttendance}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Button
                          asChild
                          size="sm"
                          className="h-8 rounded-lg px-3 text-xs font-semibold shadow-2xs hover:shadow-xs transition-all gap-1.5 group/btn cursor-pointer"
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
            <div className="flex flex-col gap-2.5 p-3 sm:hidden">
              {rows.map((row) => (
                <div
                  key={row.key + "-mobile"}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3.5 shadow-2xs transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                        <BookOpen className="size-4" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-xs text-foreground truncate">{row.subject}</span>
                        <div className="flex items-center gap-1.5 flex-wrap mt-1">
                          <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300">
                            <Building2 className="size-2.5 shrink-0" />
                            {row.className}-{row.section}
                          </span>
                          {row.year && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 text-[10px] font-bold text-purple-700 dark:text-purple-300">
                              <GraduationCap className="size-2.5 shrink-0" />
                              {row.year}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary shrink-0">
                      <Users className="size-3" />
                      {row.students}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="size-3 shrink-0" />
                      <span>{row.lastAttendance}</span>
                    </div>
                    <Button asChild size="sm" className="h-7.5 text-xs font-semibold px-2.5 gap-1">
                      <Link href="/teacher/qr-attendance">
                        Take Attendance
                        <ArrowRight className="size-3" />
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