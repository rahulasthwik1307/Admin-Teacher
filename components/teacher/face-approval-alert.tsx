"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ScanFace } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

export function FaceApprovalAlert() {
  const supabase = createClient()
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    async function fetch() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      // Get teacher's assigned class IDs first
      const { data: assignments } = await supabase
        .from("teacher_assignments")
        .select("class_id")
        .eq("teacher_id", session.user.id)

      const classIds = [...new Set((assignments ?? []).map((a: any) => a.class_id))]

      if (classIds.length === 0) { setCount(0); return }

      const { count: c } = await supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .in("class_id", classIds)
        .eq("face_registered", true)
        .eq("is_approved", false)
        .eq("is_rejected", false)
      setCount(c ?? 0)
    }
    fetch()
  }, [])

  // Hide completely if no pending approvals or still loading
  if (count === null || count === 0) return null

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-100">
          <ScanFace className="size-5 text-amber-600" />
        </div>
        <p className="text-sm font-medium text-amber-900">
          {count} student{count !== 1 ? "s are" : " is"} waiting for face registration approval
        </p>
      </div>
      <Button asChild size="sm" className="shrink-0 self-start sm:self-auto">
        <Link href="/teacher/face-approval">Review Now</Link>
      </Button>
    </div>
  )
}