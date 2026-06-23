"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ScanFace } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

import { FaceApprovalAlertSkeleton } from "@/components/ui/skeletons"

export function FaceApprovalAlert() {
  const supabase = createClient()
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    async function fetch() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { setCount(0); return }
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
      } catch {
        setCount(0)
      }
    }
    fetch()
  }, [])

  if (count === null) return <FaceApprovalAlertSkeleton />
  if (count === 0) return null

  return (
    <>
      <style>{`
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(217,119,6,0.4); }
          70% { box-shadow: 0 0 0 8px rgba(217,119,6,0); }
          100% { box-shadow: 0 0 0 0 rgba(217,119,6,0); }
        }
        @keyframes alertSlideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div
        className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
        style={{ animation: "alertSlideIn 0.35s ease forwards" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-100"
            style={{ animation: "pulse-ring 2s ease-out infinite" }}
          >
            <ScanFace className="size-5 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-900">
              Face Registration Pending
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              {count} student{count !== 1 ? "s are" : " is"} waiting for approval
            </p>
          </div>
        </div>
        <Button
          asChild
          size="sm"
          className="shrink-0 self-start sm:self-auto bg-amber-600 hover:bg-amber-700 text-white transition-all duration-150 hover:scale-[1.03]"
        >
          <Link href="/teacher/face-approval">Review Now</Link>
        </Button>
      </div>
    </>
  )
}