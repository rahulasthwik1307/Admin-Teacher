"use client"

import React, { useMemo } from "react"
import { Building2, CalendarDays, GraduationCap } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { ClassOption, DeptOption } from "@/hooks/use-admin-students"

interface CohortSelectorProps {
  deptId: string
  year: string
  classId: string
  deptOptions: DeptOption[]
  classOptions: ClassOption[]
  onDeptChange: (deptId: string) => void
  onYearChange: (year: string) => void
  onClassChange: (classId: string) => void
  disabled?: boolean
  compact?: boolean
}

export function CohortSelector({
  deptId,
  year,
  classId,
  deptOptions,
  classOptions,
  onDeptChange,
  onYearChange,
  onClassChange,
  disabled = false,
  compact = false,
}: CohortSelectorProps) {
  // Classes filtered by currently chosen department and year (if selected)
  const filteredClasses = useMemo(() => {
    let list = classOptions
    if (deptId) {
      list = list.filter((c) => c.deptId === deptId)
    }
    if (year) {
      list = list.filter((c) => c.year === year)
    }
    return list
  }, [classOptions, deptId, year])

  // Handle direct class selection: auto-match Department and Year!
  const handleClassSelect = (selectedClassId: string) => {
    onClassChange(selectedClassId)
    const targetClass = classOptions.find((c) => c.id === selectedClassId)
    if (targetClass) {
      if (targetClass.deptId && targetClass.deptId !== deptId) {
        onDeptChange(targetClass.deptId)
      }
      if (targetClass.year && targetClass.year !== year) {
        onYearChange(targetClass.year)
      }
    }
  }

  // Handle department change
  const handleDeptSelect = (selectedDeptId: string) => {
    onDeptChange(selectedDeptId)
    // If current class doesn't belong to the newly selected department, reset class selection
    const currentClass = classOptions.find((c) => c.id === classId)
    if (currentClass && currentClass.deptId !== selectedDeptId) {
      onClassChange("")
    }
  }

  // Handle year change
  const handleYearSelect = (selectedYear: string) => {
    onYearChange(selectedYear)
    // If current class doesn't match the new year, reset class selection
    const currentClass = classOptions.find((c) => c.id === classId)
    if (currentClass && currentClass.year !== selectedYear) {
      onClassChange("")
    }
  }

  return (
    <div
      className={
        compact
          ? "grid grid-cols-1 sm:grid-cols-3 gap-3 w-full"
          : "grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-muted/20 border border-border/70 w-full"
      }
    >
      {/* Department Dropdown */}
      <div className="flex flex-col gap-1.5 min-w-0 w-full">
        <Label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Building2 className="size-3.5 text-primary shrink-0" />
          <span>Department</span>
        </Label>
        <Select value={deptId} onValueChange={handleDeptSelect} disabled={disabled}>
          <SelectTrigger className="w-full !w-full h-10 rounded-xl text-xs bg-background border-border/80 shadow-2xs font-medium">
            <SelectValue placeholder="Select Department" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {deptOptions.map((d) => (
              <SelectItem key={d.id} value={d.id} className="text-xs font-medium">
                <span className="font-bold text-foreground">{d.code}</span>
                <span className="text-muted-foreground ml-1.5">— {d.name}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Academic Year Dropdown */}
      <div className="flex flex-col gap-1.5 min-w-0 w-full">
        <Label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <CalendarDays className="size-3.5 text-primary shrink-0" />
          <span>Academic Year</span>
        </Label>
        <Select value={year} onValueChange={handleYearSelect} disabled={disabled}>
          <SelectTrigger className="w-full !w-full h-10 rounded-xl text-xs bg-background border-border/80 shadow-2xs font-medium">
            <SelectValue placeholder="Select Year" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="1st Year" className="text-xs font-medium">1st Year</SelectItem>
            <SelectItem value="2nd Year" className="text-xs font-medium">2nd Year</SelectItem>
            <SelectItem value="3rd Year" className="text-xs font-medium">3rd Year</SelectItem>
            <SelectItem value="4th Year" className="text-xs font-medium">4th Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Class & Section Dropdown (Smart Filtered & Auto-matching) */}
      <div className="flex flex-col gap-1.5 min-w-0 w-full">
        <Label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <GraduationCap className="size-3.5 text-primary shrink-0" />
          <span>Class & Section</span>
        </Label>
        <Select value={classId} onValueChange={handleClassSelect} disabled={disabled}>
          <SelectTrigger className="w-full !w-full h-10 rounded-xl text-xs bg-background border-border/80 shadow-2xs font-medium">
            <SelectValue
              placeholder={
                filteredClasses.length === 0 && (deptId || year)
                  ? "No matching classes"
                  : "Select Class / Section"
              }
            />
          </SelectTrigger>
          <SelectContent className="rounded-xl max-h-56">
            {(deptId || year ? filteredClasses : classOptions).map((c) => (
              <SelectItem key={c.id} value={c.id} className="text-xs font-medium">
                <span className="font-semibold text-foreground">{c.classSection}</span>
                <span className="text-muted-foreground ml-1 text-[11px]">
                  ({c.year} · {c.deptCode})
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

