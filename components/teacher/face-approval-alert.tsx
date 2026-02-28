import Link from "next/link"
import { ScanFace } from "lucide-react"
import { Button } from "@/components/ui/button"

export function FaceApprovalAlert() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-100">
          <ScanFace className="size-5 text-amber-600" />
        </div>
        <p className="text-sm font-medium text-amber-900">
          3 students are waiting for face registration approval
        </p>
      </div>
      <Button asChild size="sm" className="shrink-0 self-start sm:self-auto">
        <Link href="/teacher/face-approval">Review Now</Link>
      </Button>
    </div>
  )
}
