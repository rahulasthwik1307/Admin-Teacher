import { DashboardStatsSkeleton } from "@/components/ui/skeletons"

export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="flex flex-col gap-6 p-1">
        <DashboardStatsSkeleton />
      </div>
    </div>
  )
}
