"use client"

import React, { useState } from "react"
import { toast } from "sonner"
import { User, Hash, Mail, Plus, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ClassOption, DeptOption } from "@/hooks/use-admin-students"
import { CohortSelector } from "./cohort-selector"

const ROLL_NUMBER_REGEX = /^\d{3}[A-Z]\d[A-Z]\d{4}$/

interface SingleStudentFormProps {
  deptOptions: DeptOption[]
  classOptions: ClassOption[]
  defaultDeptId?: string
  defaultYear?: string
  defaultClassId?: string
  onSuccess: () => void
  onCancel: () => void
}

export function SingleStudentForm({
  deptOptions,
  classOptions,
  defaultDeptId = "",
  defaultYear = "",
  defaultClassId = "",
  onSuccess,
  onCancel,
}: SingleStudentFormProps) {
  const [name, setName] = useState("")
  const [roll, setRoll] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [deptId, setDeptId] = useState(defaultDeptId)
  const [year, setYear] = useState(defaultYear)
  const [classId, setClassId] = useState(defaultClassId)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const cleanRoll = roll.trim().toUpperCase()
  const isValidRoll = cleanRoll.length === 10 && ROLL_NUMBER_REGEX.test(cleanRoll)
  const hasRollInput = cleanRoll.length > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!name.trim()) {
      toast.error("Please enter student full name")
      return
    }
    if (!cleanRoll) {
      toast.error("Please enter student roll number")
      return
    }
    if (!ROLL_NUMBER_REGEX.test(cleanRoll)) {
      toast.error("Invalid roll number format. Example: 227Z1A6755 (3 digits, letter, digit, letter, 4 digits)")
      return
    }
    if (!classId || !deptId || !year) {
      toast.error("Please select Department, Academic Year, and Class")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/admin/create-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: name.trim(),
          roll_number: cleanRoll,
          class_id: classId,
          department_id: deptId,
          year,
          contact_email: contactEmail.trim() || undefined,
        }),
      })

      const result = await res.json()
      if (!res.ok) {
        toast.error(result.error || "Failed to create student")
        return
      }

      toast.success(`Student ${name.trim()} (${cleanRoll}) created! Default password is Student@1234`)
      onSuccess()
    } catch {
      toast.error("An unexpected error occurred while creating student.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Target Academic Cohort */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Target Academic Cohort
        </p>
        <CohortSelector
          deptId={deptId}
          year={year}
          classId={classId}
          deptOptions={deptOptions}
          classOptions={classOptions}
          onDeptChange={setDeptId}
          onYearChange={setYear}
          onClassChange={setClassId}
          disabled={isSubmitting}
        />
      </div>

      {/* Student Personal Details */}
      <div className="flex flex-col gap-4 p-5 rounded-2xl bg-card border border-border/80">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Student Information
        </p>

        {/* Full Name */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="student-name-input" className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <User className="size-3.5 text-primary" />
            <span>Full Name</span>
          </Label>
          <Input
            id="student-name-input"
            placeholder="e.g. Rahul Sharma"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSubmitting}
            className="h-10 rounded-xl text-xs bg-background border-border/80 px-3.5 font-medium"
          />
        </div>

        {/* Roll Number with Instant Format Feedback */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="student-roll-input" className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Hash className="size-3.5 text-primary" />
              <span>Hall Ticket / Roll Number</span>
            </Label>
            {hasRollInput && (
              isValidRoll ? (
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300/80 text-[10px] py-0.5">
                  <CheckCircle2 className="size-2.5 mr-1" /> Valid Format
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300 text-[10px] py-0.5">
                  <AlertCircle className="size-2.5 mr-1" /> Expected 227Z1A6755
                </Badge>
              )
            )}
          </div>
          <Input
            id="student-roll-input"
            placeholder="e.g. 227Z1A6755"
            value={roll}
            maxLength={10}
            onChange={(e) => setRoll(e.target.value.toUpperCase())}
            disabled={isSubmitting}
            className="h-10 rounded-xl text-xs font-mono uppercase bg-background border-border/80 px-3.5"
          />
          <p className="text-[11px] text-muted-foreground">
            Format: 3 digits + Letter + Digit + Letter + 4 digits (e.g., 227Z1A6701).
          </p>
        </div>

        {/* Contact Email */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="student-email-input" className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Mail className="size-3.5 text-primary" />
            <span>Contact Email <span className="text-muted-foreground font-normal">(Optional)</span></span>
          </Label>
          <Input
            id="student-email-input"
            type="email"
            placeholder="student@example.com"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            disabled={isSubmitting}
            className="h-10 rounded-xl text-xs bg-background border-border/80 px-3.5"
          />
          <p className="text-[11px] text-muted-foreground">
            Used for emergency absence notifications. Student sign-in always uses roll number.
          </p>
        </div>
      </div>

      {/* Info Callout */}
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs text-muted-foreground">
        <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
        <div>
          Account will be created with default credentials:
          <span className="block font-mono font-bold text-foreground mt-0.5">
            Login: {cleanRoll ? `${cleanRoll.toLowerCase()}@nnrg.student` : "roll@nnrg.student"} · Password: Student@1234
          </span>
          The student will be prompted to set a personal password upon first activation.
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border mt-auto">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-xl text-xs font-semibold cursor-pointer"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || !name.trim() || !isValidRoll || !classId}
          className="rounded-xl text-xs font-semibold gap-1.5 min-w-32 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-sm"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Plus className="size-3.5" />
              Create Student
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
