"use client"

import React, { useState, useMemo } from "react"
import { toast } from "sonner"
import {
  ArrowDownAZ,
  Sparkles,
  Trash2,
  Plus,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileText,
  Hash,
  RotateCcw,
  Check,
} from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ClassOption, DeptOption } from "@/hooks/use-admin-students"
import { CohortSelector } from "./cohort-selector"

const ROLL_NUMBER_REGEX = /^\d{3}[A-Z]\d[A-Z]\d{4}$/

export interface CandidateStudent {
  id: string
  fullName: string
  rollNumber: string
  contactEmail?: string
}

interface QuickPasteEnrollmentProps {
  deptOptions: DeptOption[]
  classOptions: ClassOption[]
  defaultDeptId?: string
  defaultYear?: string
  defaultClassId?: string
  onSuccess: () => void
  onCancel: () => void
}

export function QuickPasteEnrollment({
  deptOptions,
  classOptions,
  defaultDeptId = "",
  defaultYear = "",
  defaultClassId = "",
  onSuccess,
  onCancel,
}: QuickPasteEnrollmentProps) {
  // Target Cohort
  const [deptId, setDeptId] = useState(defaultDeptId)
  const [year, setYear] = useState(defaultYear)
  const [classId, setClassId] = useState(defaultClassId)

  // Input raw text
  const [rawText, setRawText] = useState("")

  // Roll Number Series Generator settings
  const [rollPrefix, setRollPrefix] = useState("227Z1A67")
  const [startIndex, setStartIndex] = useState(1)
  const [paddingDigits, setPaddingDigits] = useState(2) // e.g. 2 -> '01', 3 -> '001'

  // Generated Candidates
  const [candidates, setCandidates] = useState<CandidateStudent[]>([])
  const [filterMode, setFilterMode] = useState<"all" | "issues">("all")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [progressMsg, setProgressMsg] = useState("")

  // Auto-detect a sensible prefix when department or year changes
  const selectedDeptCode = useMemo(() => {
    return deptOptions.find((d) => d.id === deptId)?.code || ""
  }, [deptOptions, deptId])

  // Split raw text into clean array of names
  const parsedNames = useMemo(() => {
    if (!rawText.trim()) return []
    return rawText
      .split(/[\r\n,;]+/)
      .map((line) => line.replace(/^[\d\s.\-)]+/, "").trim()) // Remove leading numbering e.g. "1. Alice" -> "Alice"
      .filter((line) => line.length > 0)
  }, [rawText])

  // Handler: Sort Names Alphabetically (A-Z)
  const handleSortAlphabetically = () => {
    if (parsedNames.length === 0) {
      toast.error("Please paste student names first")
      return
    }
    const sorted = [...parsedNames].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
    setRawText(sorted.join("\n"))
    toast.success(`Sorted ${sorted.length} student names alphabetically (A-Z)!`)
  }

  // Helper: Load sample names for testing
  const handleLoadSampleNames = () => {
    const samples = [
      "Venkatesh Rao",
      "Ananya Reddy",
      "Sai Krishna",
      "Bhavani Prasad",
      "Divya Sri",
      "Karthik Varma",
    ]
    setRawText(samples.join("\n"))
    toast.info("Sample student names loaded!")
  }

  // Handler: Generate Roll Numbers and populate candidate table
  const handleGenerateSeries = () => {
    if (parsedNames.length === 0) {
      toast.error("Please paste student names before generating roll numbers")
      return
    }
    const cleanPrefix = rollPrefix.trim().toUpperCase()
    if (!cleanPrefix) {
      toast.error("Please specify a roll number prefix (e.g. 227Z1A67)")
      return
    }

    let currentNum = startIndex
    const generated: CandidateStudent[] = parsedNames.map((name, idx) => {
      const padded = String(currentNum).padStart(paddingDigits, "0")
      const roll = `${cleanPrefix}${padded}`
      currentNum++
      return {
        id: `candidate-${idx}-${Date.now()}`,
        fullName: name,
        rollNumber: roll,
        contactEmail: "",
      }
    })

    setCandidates(generated)
    toast.success(`Generated sequential roll numbers for ${generated.length} students!`)
  }

  // Row edit handlers
  const handleUpdateName = (id: string, newName: string) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, fullName: newName } : c))
    )
  }

  const handleUpdateRoll = (id: string, newRoll: string) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, rollNumber: newRoll.toUpperCase() } : c))
    )
  }

  const handleRemoveCandidate = (id: string) => {
    setCandidates((prev) => prev.filter((c) => c.id !== id))
  }

  const handleAddEmptyRow = () => {
    const nextIdx = candidates.length + 1
    const cleanPrefix = rollPrefix.trim().toUpperCase() || "227Z1A67"
    const padded = String(nextIdx).padStart(paddingDigits, "0")
    const newCandidate: CandidateStudent = {
      id: `manual-${Date.now()}`,
      fullName: "",
      rollNumber: `${cleanPrefix}${padded}`,
      contactEmail: "",
    }
    setCandidates((prev) => [...prev, newCandidate])
  }

  // Candidate validation stats & duplicate detection
  const { validatedList, validCount, issueCount } = useMemo(() => {
    const rollCounts = new Map<string, number>()
    candidates.forEach((c) => {
      const r = c.rollNumber.trim().toUpperCase()
      if (r) {
        rollCounts.set(r, (rollCounts.get(r) || 0) + 1)
      }
    })

    let valid = 0
    let issues = 0

    const list = candidates.map((c) => {
      const cleanR = c.rollNumber.trim().toUpperCase()
      const cleanN = c.fullName.trim()
      const isDuplicate = cleanR ? (rollCounts.get(cleanR) || 0) > 1 : false
      const isValidFormat = ROLL_NUMBER_REGEX.test(cleanR)
      const hasError = !cleanN || !cleanR || !isValidFormat || isDuplicate

      if (hasError) {
        issues++
      } else {
        valid++
      }

      let errorMsg = ""
      if (!cleanN) errorMsg = "Name missing"
      else if (!cleanR) errorMsg = "Roll number missing"
      else if (isDuplicate) errorMsg = "Duplicate roll number in batch"
      else if (!isValidFormat) errorMsg = "Format mismatch (e.g. 227Z1A6701)"

      return {
        ...c,
        isDuplicate,
        isValidFormat,
        hasError,
        errorMsg,
      }
    })

    return {
      validatedList: list,
      validCount: valid,
      issueCount: issues,
    }
  }, [candidates])

  // Filtered rows
  const displayList = useMemo(() => {
    if (filterMode === "issues") {
      return validatedList.filter((c) => c.hasError)
    }
    return validatedList
  }, [validatedList, filterMode])

  // Submit bulk creation
  const handleBulkSubmit = async () => {
    if (candidates.length === 0) {
      toast.error("Please generate or add students to create")
      return
    }
    if (!classId || !deptId || !year) {
      toast.error("Please select Department, Academic Year, and Class & Section")
      return
    }
    if (issueCount > 0) {
      toast.error(`Please resolve the ${issueCount} flagged error(s) before submitting`)
      setFilterMode("issues")
      return
    }

    setIsSubmitting(true)
    setProgressMsg(`Creating ${candidates.length} student accounts...`)

    try {
      const payload = {
        department_id: deptId,
        year,
        class_id: classId,
        students: candidates.map((c) => ({
          full_name: c.fullName.trim(),
          roll_number: c.rollNumber.trim().toUpperCase(),
          contact_email: c.contactEmail?.trim() || undefined,
        })),
      }

      const res = await fetch("/api/admin/create-students-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Failed to create students")
        return
      }

      if (data.failed > 0) {
        toast.warning(
          `Created ${data.created} of ${data.total} students. ${data.failed} student(s) could not be created.`
        )
      } else {
        toast.success(`Successfully enrolled all ${data.created} students!`)
      }

      onSuccess()
    } catch {
      toast.error("An unexpected error occurred while creating students.")
    } finally {
      setIsSubmitting(false)
      setProgressMsg("")
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Target Academic Cohort */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            1. Target Class & Section
          </p>
          <span className="text-[11px] text-muted-foreground">
            All students created in this batch will be assigned to this class.
          </span>
        </div>
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

      {/* 2. Paste Student Names & Auto-Sort */}
      <div className="flex flex-col gap-3 p-4 rounded-2xl bg-card border border-border">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              2. Paste Student Names
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Paste student names (one per line). Leading numbering like &quot;1. &quot; will be stripped automatically.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLoadSampleNames}
              disabled={isSubmitting}
              className="h-8 rounded-xl text-xs font-medium cursor-pointer"
            >
              <FileText className="size-3.5 mr-1 text-muted-foreground" />
              Fill Samples
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleSortAlphabetically}
              disabled={isSubmitting || parsedNames.length === 0}
              className="h-8 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer bg-primary/10 text-primary hover:bg-primary/20"
            >
              <ArrowDownAZ className="size-4" />
              Sort Alphabetically (A-Z)
            </Button>
          </div>
        </div>

        <Textarea
          rows={5}
          placeholder="Paste student names here, one per line (e.g. John Doe)..."
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          disabled={isSubmitting}
          className="font-mono text-xs rounded-xl resize-y bg-background border-border/80 min-h-28"
        />

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{parsedNames.length} student name(s) detected</span>
          {parsedNames.length > 0 && (
            <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <Check className="size-3.5" /> Ready for series generator
            </span>
          )}
        </div>
      </div>

      {/* 3. Roll Number Series Generator */}
      <div className="flex flex-col gap-4 p-5 rounded-2xl bg-muted/20 border border-border">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            3. Roll Number Series Generator
          </p>
          <span className="text-[11px] text-muted-foreground">
            Auto-assigns sequential college hall-ticket numbers to the sorted list
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
          <div className="flex flex-col gap-1.5 min-w-0 w-full">
            <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
              <Hash className="size-3.5 text-primary" />
              <span>Prefix (Branch & Batch)</span>
            </Label>
            <Input
              value={rollPrefix}
              onChange={(e) => setRollPrefix(e.target.value.toUpperCase())}
              placeholder="e.g. 227Z1A67"
              maxLength={8}
              className="h-10 rounded-xl text-xs font-mono uppercase bg-background border-border/80 px-3"
              disabled={isSubmitting}
            />
            <span className="text-[10px] text-muted-foreground">College code + Dept e.g. 227Z1A67</span>
          </div>

          <div className="flex flex-col gap-1.5 min-w-0 w-full">
            <Label className="text-xs font-semibold text-foreground">Starting Number</Label>
            <Input
              type="number"
              min={1}
              max={9999}
              value={startIndex}
              onChange={(e) => setStartIndex(Math.max(1, parseInt(e.target.value) || 1))}
              className="h-10 rounded-xl text-xs font-mono bg-background border-border/80 px-3"
              disabled={isSubmitting}
            />
            <span className="text-[10px] text-muted-foreground">e.g. 1 for 01 or 301 for Lateral Entry</span>
          </div>

          <div className="flex flex-col gap-1.5 min-w-0 w-full">
            <Label className="text-xs font-semibold text-foreground">Padding (Digits)</Label>
            <Input
              type="number"
              min={2}
              max={4}
              value={paddingDigits}
              onChange={(e) => setPaddingDigits(Math.max(2, Math.min(4, parseInt(e.target.value) || 2)))}
              className="h-10 rounded-xl text-xs font-mono bg-background border-border/80 px-3"
              disabled={isSubmitting}
            />
            <span className="text-[10px] text-muted-foreground">2 digits: 01..60 · 3 digits: 001..120</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/50">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Series Preview:</span>
            <Badge variant="outline" className="font-mono text-xs py-1 px-3 font-bold bg-background border-border text-foreground">
              {rollPrefix || "227Z1A67"}
              {String(startIndex).padStart(paddingDigits, "0")} → {rollPrefix || "227Z1A67"}
              {String(startIndex + Math.max(0, parsedNames.length - 1)).padStart(paddingDigits, "0")}
            </Badge>
          </div>

          <Button
            type="button"
            onClick={handleGenerateSeries}
            disabled={isSubmitting || parsedNames.length === 0}
            className="h-10 px-4 rounded-xl text-xs font-semibold gap-2 cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
          >
            <Sparkles className="size-3.5" />
            <span>Generate Roll Numbers</span>
          </Button>
        </div>
      </div>

      {/* 4. Interactive Live Data Table Preview */}
      {candidates.length > 0 && (
        <div className="flex flex-col gap-3 p-4 rounded-2xl bg-card border border-border">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                4. Live Roster Preview
              </p>
              <Badge className="bg-primary/10 text-primary border-primary/20 text-xs py-0.5">
                {candidates.length} Students
              </Badge>
              {issueCount === 0 ? (
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300/70 text-xs py-0.5">
                  <CheckCircle2 className="size-3 mr-1" /> All Valid ({validCount})
                </Badge>
              ) : (
                <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-300/70 text-xs py-0.5">
                  <AlertTriangle className="size-3 mr-1" /> {issueCount} Flagged
                </Badge>
              )}
            </div>

            {/* Filter Toggle */}
            <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl">
              <Button
                type="button"
                variant={filterMode === "all" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setFilterMode("all")}
                className="h-7 px-2.5 rounded-lg text-xs font-semibold cursor-pointer"
              >
                All ({candidates.length})
              </Button>
              <Button
                type="button"
                variant={filterMode === "issues" ? "destructive" : "ghost"}
                size="sm"
                onClick={() => setFilterMode("issues")}
                disabled={issueCount === 0}
                className="h-7 px-2.5 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Issues ({issueCount})
              </Button>
            </div>
          </div>

          {/* Table Container */}
          <div className="border border-border/80 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted/60 sticky top-0 border-b border-border z-10">
                <tr>
                  <th className="p-2.5 pl-3 w-12 font-bold text-muted-foreground">#</th>
                  <th className="p-2.5 font-bold text-muted-foreground">Student Name</th>
                  <th className="p-2.5 w-44 font-bold text-muted-foreground">Roll Number</th>
                  <th className="p-2.5 w-32 font-bold text-muted-foreground">Status</th>
                  <th className="p-2.5 pr-3 w-12 text-right font-bold text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {displayList.map((c, index) => (
                  <tr
                    key={c.id}
                    className={
                      c.hasError
                        ? "bg-rose-500/5 hover:bg-rose-500/10 transition-colors"
                        : "hover:bg-muted/30 transition-colors"
                    }
                  >
                    <td className="p-2.5 pl-3 font-mono text-muted-foreground">{index + 1}</td>
                    <td className="p-2.5">
                      <Input
                        value={c.fullName}
                        onChange={(e) => handleUpdateName(c.id, e.target.value)}
                        placeholder="Student Full Name"
                        className="h-8 rounded-lg text-xs font-medium bg-background"
                        disabled={isSubmitting}
                      />
                    </td>
                    <td className="p-2.5">
                      <Input
                        value={c.rollNumber}
                        maxLength={10}
                        onChange={(e) => handleUpdateRoll(c.id, e.target.value)}
                        placeholder="227Z1A6701"
                        className="h-8 rounded-lg text-xs font-mono uppercase bg-background"
                        disabled={isSubmitting}
                      />
                    </td>
                    <td className="p-2.5">
                      {c.hasError ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                          <AlertCircle className="size-3 shrink-0" />
                          <span className="truncate max-w-[120px]" title={c.errorMsg}>
                            {c.errorMsg}
                          </span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="size-3 shrink-0" />
                          Valid
                        </span>
                      )}
                    </td>
                    <td className="p-2.5 pr-3 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveCandidate(c.id)}
                        disabled={isSubmitting}
                        className="size-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                        title="Remove student"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddEmptyRow}
              disabled={isSubmitting}
              className="h-8 rounded-xl text-xs font-medium cursor-pointer"
            >
              <Plus className="size-3.5 mr-1" /> Add Row
            </Button>
            <span className="text-[11px] text-muted-foreground">
              You can edit any name or roll number directly in the grid before creating.
            </span>
          </div>
        </div>
      )}

      {/* Progress or Status */}
      {isSubmitting && progressMsg && (
        <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs font-medium text-primary animate-pulse">
          <Loader2 className="size-4 animate-spin" />
          <span>{progressMsg}</span>
        </div>
      )}

      {/* Action Buttons */}
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
          type="button"
          onClick={handleBulkSubmit}
          disabled={isSubmitting || candidates.length === 0 || !classId}
          className="rounded-xl text-xs font-semibold gap-1.5 min-w-36 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-sm"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Creating Roster...
            </>
          ) : (
            <>
              <CheckCircle2 className="size-3.5" />
              Create All ({candidates.length})
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
