import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const subjects = [
  { name: "Data Structures", present: 38, total: 47 },
  { name: "Operating Systems", present: 30, total: 43 },
  { name: "DBMS", present: 25, total: 47 },
]

function getBarColor(percentage: number) {
  if (percentage >= 75) return "bg-emerald-500"
  if (percentage >= 60) return "bg-amber-500"
  return "bg-destructive"
}

function getTextColor(percentage: number) {
  if (percentage >= 75) return "text-emerald-600"
  if (percentage >= 60) return "text-amber-600"
  return "text-destructive"
}

export function TodayAttendanceSummary() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base text-muted-foreground font-semibold">
          {"Today's Attendance Summary"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-5">
          {subjects.map((subject) => {
            const pct = Math.round((subject.present / subject.total) * 100)
            return (
              <div key={subject.name} className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">
                    {subject.name}
                  </span>
                  <span className={cn("text-xs font-semibold", getTextColor(pct))}>
                    {subject.present}/{subject.total} ({pct}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      getBarColor(pct)
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
