import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const activities = [
  {
    description: "Attendance finalized for DS — CSE A",
    time: "2 hours ago",
  },
  {
    description: "3 students marked present in OS — CSE B",
    time: "3 hours ago",
  },
  {
    description: "Face approved for Rahul Sharma",
    time: "Yesterday",
  },
  {
    description: "New student added: Priya Patel",
    time: "Yesterday",
  },
  {
    description: "Attendance window opened for DBMS",
    time: "2 days ago",
  },
]

export function RecentActivity() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base text-muted-foreground font-semibold">
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative flex flex-col gap-0">
          {activities.map((activity, i) => (
            <div key={i} className="flex gap-4">
              {/* Timeline rail */}
              <div className="flex flex-col items-center">
                <div className="mt-1.5 size-2.5 shrink-0 rounded-full bg-primary" />
                {i < activities.length - 1 && (
                  <div className="w-px flex-1 bg-border" />
                )}
              </div>

              {/* Content */}
              <div className="pb-5 last:pb-0">
                <p className="text-sm font-medium text-foreground leading-snug">
                  {activity.description}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {activity.time}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
