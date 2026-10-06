"use client"

import React, { useState, useMemo, useRef } from "react"
import { toast } from "sonner"
import * as XLSX from "xlsx"
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  Trash2,
  Plus,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileCheck,
  Check,
  RotateCcw,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ClassOption, DeptOption } from "@/hooks/use-admin-students"
import { CohortSelector } from "./cohort-selector"

const ROLL_NUMBER_REGEX = /^\d{3}[A-Z]\d[A-Z]\d{4}$/

export interface ParsedStudentRow {
  id: string
  fullName: string
  rollNumber: string
  contactEmail?: string
}

interface ExcelCsvEnrollmentProps {
  deptOptions: DeptOption[]
  classOptions: ClassOption[]
  defaultDeptId?: string
  defaultYear?: string
  defaultClassId?: string
  onSuccess: () => void
  onCancel: () => void
}

export function ExcelCsvEnrollment({
  deptOptions,
  classOptions,
  defaultDeptId = "",
  defaultYear = "",
  defaultClassId = "",
  onSuccess,
  onCancel,
}: ExcelCsvEnrollmentProps) {
  // Target Cohort
  const [deptId, setDeptId] = useState(defaultDeptId)
  const [year, setYear] = useState(defaultYear)
  const [classId, setClassId] = useState(defaultClassId)

  // Uploaded and parsed file state
  const [fileName, setFileName] = useState<string | null>(null)
  const [fileSize, setFileSize] = useState<string | null>(null)
  const [rows, setRows] = useState<ParsedStudentRow[]>([])
  const [filterMode, setFilterMode] = useState<"all" | "issues">("all")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [progressMsg, setProgressMsg] = useState("")
  const [isDragOver, setIsDragOver] = useState(false)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Function to download sample template
  const handleDownloadTemplate = (format: "csv" | "xlsx" = "xlsx") => {
    try {
      const templateData = [
        {
          "Full Name": "Venkatesh Rao",
          "Roll Number": "227Z1A6701",
          "Contact Email": "venkatesh@gmail.com",
        },
        {
          "Full Name": "Ananya Reddy",
          "Roll Number": "227Z1A6702",
          "Contact Email": "ananya@gmail.com",
        },
        {
          "Full Name": "Sai Krishna",
          "Roll Number": "227Z1A6703",
          "Contact Email": "",
        },
      ]

      const worksheet = XLSX.utils.json_to_sheet(templateData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Students")

      // Set column widths
      worksheet["!cols"] = [{ wch: 24 }, { wch: 18 }, { wch: 28 }]

      const extension = format === "csv" ? "csv" : "xlsx"
      const bookType = format === "csv" ? "csv" : "xlsx"
      XLSX.writeFile(workbook, `Student_Enrollment_Template.${extension}`, { bookType })
      toast.success(`Downloaded sample ${format.toUpperCase()} template!`)
    } catch {
      toast.error("Failed to generate template file.")
    }
  }

  // Parse Excel or CSV file
  const processFile = async (file: File) => {
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ]
    const hasValidExt = /\.(xlsx|xls|csv)$/i.test(file.name)

    if (!validTypes.includes(file.type) && !hasValidExt) {
      toast.error("Please upload an Excel (.xlsx, .xls) or CSV (.csv) file")
      return
    }

    try {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: "array" })
      const firstSheetName = workbook.SheetNames[0]
      if (!firstSheetName) {
        toast.error("The uploaded spreadsheet appears to be empty")
        return
      }

      const sheet = workbook.Sheets[firstSheetName]
      const rawJson = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" })

      if (rawJson.length === 0) {
        toast.error("No student rows found in the uploaded file")
        return
      }

      // Map headers smartly
      const parsedRows: ParsedStudentRow[] = rawJson.map((row, idx) => {
        let fullName = ""
        let rollNumber = ""
        let contactEmail = ""

        for (const [key, val] of Object.entries(row)) {
          const cleanKey = key.trim().toLowerCase().replace(/[\s_\-.]+/g, "")
          const strVal = String(val ?? "").trim()

          if (["fullname", "studentname", "name", "student"].includes(cleanKey)) {
            fullName = strVal
          } else if (["rollnumber", "rollno", "roll", "hallticket", "htno", "hallticketno"].includes(cleanKey)) {
            rollNumber = strVal.toUpperCase()
          } else if (["email", "contactemail", "studentemail", "mail"].includes(cleanKey)) {
            contactEmail = strVal
          }
        }

        return {
          id: `file-row-${idx}-${Date.now()}`,
          fullName,
          rollNumber,
          contactEmail,
        }
      })

      // Filter out completely empty trailing rows
      const cleanRows = parsedRows.filter((r) => r.fullName || r.rollNumber)

      if (cleanRows.length === 0) {
        toast.error("Could not find valid 'Full Name' or 'Roll Number' columns in spreadsheet.")
        return
      }

      setFileName(file.name)
      setFileSize((file.size / 1024).toFixed(1) + " KB")
      setRows(cleanRows)
      toast.success(`Loaded ${cleanRows.length} students from ${file.name}!`)
    } catch (err: any) {
      console.error("Error reading spreadsheet:", err)
      toast.error("Failed to parse the file. Please ensure it is a valid Excel or CSV spreadsheet.")
    }
  }

  // File Drop Handler
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  // File Input Change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
    // Reset file input value so same file can be re-uploaded if desired
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  // Row edit handlers
  const handleUpdateName = (id: string, newName: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, fullName: newName } : r)))
  }

  const handleUpdateRoll = (id: string, newRoll: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, rollNumber: newRoll.toUpperCase() } : r))
    )
  }

  const handleUpdateEmail = (id: string, newEmail: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, contactEmail: newEmail } : r)))
  }

  const handleRemoveRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id))
  }

  const handleResetFile = () => {
    setFileName(null)
    setFileSize(null)
    setRows([])
  }

  // Validation & Duplicate Checking
  const { validatedList, validCount, issueCount } = useMemo(() => {
    const rollCounts = new Map<string, number>()
    rows.forEach((r) => {
      const roll = r.rollNumber.trim().toUpperCase()
      if (roll) {
        rollCounts.set(roll, (rollCounts.get(roll) || 0) + 1)
      }
    })

    let valid = 0
    let issues = 0

    const list = rows.map((r) => {
      const cleanR = r.rollNumber.trim().toUpperCase()
      const cleanN = r.fullName.trim()
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
      else if (isDuplicate) errorMsg = "Duplicate roll number in file"
      else if (!isValidFormat) errorMsg = "Format mismatch (e.g. 227Z1A6701)"

      return {
        ...r,
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
  }, [rows])

  const displayList = useMemo(() => {
    if (filterMode === "issues") {
      return validatedList.filter((r) => r.hasError)
    }
    return validatedList
  }, [validatedList, filterMode])

  // Bulk Submit Handler
  const handleBulkSubmit = async () => {
    if (rows.length === 0) {
      toast.error("Please upload a spreadsheet with students first")
      return
    }
    if (!classId || !deptId || !year) {
      toast.error("Please select Department, Academic Year, and Class & Section")
      return
    }
    if (issueCount > 0) {
      toast.error(`Please resolve the ${issueCount} flagged error(s) in the table before creating`)
      setFilterMode("issues")
      return
    }

    setIsSubmitting(true)
    setProgressMsg(`Uploading & creating ${rows.length} student records...`)

    try {
      const payload = {
        department_id: deptId,
        year,
        class_id: classId,
        students: rows.map((r) => ({
          full_name: r.fullName.trim(),
          roll_number: r.rollNumber.trim().toUpperCase(),
          contact_email: r.contactEmail?.trim() || undefined,
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
        toast.success(`Successfully created all ${data.created} student accounts!`)
      }

      onSuccess()
    } catch {
      toast.error("An unexpected error occurred while processing bulk upload.")
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
            All uploaded students will be enrolled in this cohort.
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

      {/* 2. Drag & Drop File Zone or Active File Badge */}
      <div className="flex flex-col gap-3 p-4 rounded-2xl bg-card border border-border">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              2. Upload Spreadsheet
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Supports Excel (.xlsx, .xls) and CSV (.csv) files.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleDownloadTemplate("xlsx")}
              className="h-8.5 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer bg-background border-border/80 hover:bg-muted"
            >
              <Download className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Excel Template (.xlsx)</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleDownloadTemplate("csv")}
              className="h-8.5 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer bg-background border-border/80 hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <Download className="size-3.5" />
              <span>CSV Template</span>
            </Button>
          </div>
        </div>

        {/* Drag & Drop Area */}
        {!fileName ? (
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragOver(true)
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
              isDragOver
                ? "border-primary bg-primary/5 scale-[1.005]"
                : "border-border/80 hover:border-primary/50 hover:bg-muted/10 bg-muted/5"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <UploadCloud className="size-6" />
            </div>
            <div className="text-center">
              <p className="text-xs font-bold text-foreground">
                Click to browse or drag and drop spreadsheet here
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Columns recognized: <span className="font-semibold text-foreground">Full Name, Roll Number, Contact Email</span>
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/30 border border-border">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <FileCheck className="size-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">{fileName}</p>
                <p className="text-[11px] text-muted-foreground">
                  {fileSize} · {rows.length} student rows parsed
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting}
                className="h-8 rounded-xl text-xs font-medium cursor-pointer"
              >
                Change File
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleResetFile}
                disabled={isSubmitting}
                className="size-8 rounded-xl text-muted-foreground hover:text-destructive cursor-pointer"
                title="Remove file"
              >
                <Trash2 className="size-4" />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>
        )}
      </div>

      {/* 3. Preview & Validation Table */}
      {rows.length > 0 && (
        <div className="flex flex-col gap-3 p-4 rounded-2xl bg-card border border-border">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                3. Validation & Preview
              </p>
              <Badge className="bg-primary/10 text-primary border-primary/20 text-xs py-0.5">
                {rows.length} Rows
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
                All ({rows.length})
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
                  <th className="p-2.5 w-40 font-bold text-muted-foreground">Roll Number</th>
                  <th className="p-2.5 w-44 font-bold text-muted-foreground">Email (Optional)</th>
                  <th className="p-2.5 w-28 font-bold text-muted-foreground">Status</th>
                  <th className="p-2.5 pr-3 w-10 text-right font-bold text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {displayList.map((r, index) => (
                  <tr
                    key={r.id}
                    className={
                      r.hasError
                        ? "bg-rose-500/5 hover:bg-rose-500/10 transition-colors"
                        : "hover:bg-muted/30 transition-colors"
                    }
                  >
                    <td className="p-2.5 pl-3 font-mono text-muted-foreground">{index + 1}</td>
                    <td className="p-2.5">
                      <Input
                        value={r.fullName}
                        onChange={(e) => handleUpdateName(r.id, e.target.value)}
                        placeholder="Student Full Name"
                        className="h-8 rounded-lg text-xs font-medium bg-background"
                        disabled={isSubmitting}
                      />
                    </td>
                    <td className="p-2.5">
                      <Input
                        value={r.rollNumber}
                        maxLength={10}
                        onChange={(e) => handleUpdateRoll(r.id, e.target.value)}
                        placeholder="227Z1A6701"
                        className="h-8 rounded-lg text-xs font-mono uppercase bg-background"
                        disabled={isSubmitting}
                      />
                    </td>
                    <td className="p-2.5">
                      <Input
                        value={r.contactEmail || ""}
                        onChange={(e) => handleUpdateEmail(r.id, e.target.value)}
                        placeholder="Optional email"
                        className="h-8 rounded-lg text-xs bg-background"
                        disabled={isSubmitting}
                      />
                    </td>
                    <td className="p-2.5">
                      {r.hasError ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                          <AlertCircle className="size-3 shrink-0" />
                          <span className="truncate max-w-[100px]" title={r.errorMsg}>
                            {r.errorMsg}
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
                        onClick={() => handleRemoveRow(r.id)}
                        disabled={isSubmitting}
                        className="size-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                        title="Remove row"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Progress */}
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
          disabled={isSubmitting || rows.length === 0 || !classId}
          className="rounded-xl text-xs font-semibold gap-1.5 min-w-36 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-sm"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Creating Students...
            </>
          ) : (
            <>
              <CheckCircle2 className="size-3.5" />
              Enroll All ({rows.length})
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
