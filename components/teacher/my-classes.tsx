import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const classes = [
  {
    subject: "Data Structures",
    class: "CSE",
    section: "A",
    students: 47,
    lastAttendance: "Oct 24, 2024",
  },
  {
    subject: "Operating Systems",
    class: "CSE",
    section: "B",
    students: 43,
    lastAttendance: "Oct 23, 2024",
  },
  {
    subject: "DBMS",
    class: "CSE",
    section: "A",
    students: 47,
    lastAttendance: "Oct 22, 2024",
  },
]

export function MyClasses() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base text-muted-foreground font-semibold">
          My Classes & Subjects
        </CardTitle>
      </CardHeader>
      <CardContent>
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
              {classes.map((cls) => (
                <tr
                  key={`${cls.subject}-${cls.section}`}
                  className="border-b border-border last:border-0"
                >
                  <td className="py-3.5 pr-4 font-medium text-foreground">
                    {cls.subject}
                  </td>
                  <td className="py-3.5 pr-4 text-muted-foreground">
                    {cls.class}
                  </td>
                  <td className="py-3.5 pr-4 text-muted-foreground">
                    {cls.section}
                  </td>
                  <td className="py-3.5 pr-4 text-muted-foreground">
                    {cls.students}
                  </td>
                  <td className="py-3.5 pr-4 text-muted-foreground">
                    {cls.lastAttendance}
                  </td>
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
          {classes.map((cls) => (
            <div
              key={`${cls.subject}-${cls.section}-mobile`}
              className="rounded-lg border border-border p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-foreground">{cls.subject}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {cls.class} - Section {cls.section}
                  </p>
                </div>
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {cls.students} students
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Last: {cls.lastAttendance}
                </span>
                <Button asChild size="sm" variant="outline">
                  <Link href="/teacher/qr-attendance">Take Attendance</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
