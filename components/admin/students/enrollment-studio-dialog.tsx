"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  GraduationCap,
  UserPlus,
  Sparkles,
  FileSpreadsheet,
  X,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ClassOption, DeptOption } from "@/hooks/use-admin-students"
import { SingleStudentForm } from "./single-student-form"
import { QuickPasteEnrollment } from "./quick-paste-enrollment"
import { ExcelCsvEnrollment } from "./excel-csv-enrollment"

interface EnrollmentStudioDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deptOptions: DeptOption[]
  classOptions: ClassOption[]
  defaultDeptId?: string
  defaultYear?: string
  defaultClassId?: string
  onSuccess: () => void
}

export function EnrollmentStudioDialog({
  open,
  onOpenChange,
  deptOptions,
  classOptions,
  defaultDeptId,
  defaultYear,
  defaultClassId,
  onSuccess,
}: EnrollmentStudioDialogProps) {
  const [activeTab, setActiveTab] = useState<"single" | "quick-paste" | "excel">("quick-paste")

  const handleSuccess = () => {
    onOpenChange(false)
    onSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:!max-w-4xl !w-[94vw] max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-3xl border-border bg-card shadow-2xl"
        showCloseButton={false}
      >
        {/* Header with Title and Mode Tabs */}
        <DialogHeader className="p-6 pb-4 border-b border-border bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <GraduationCap className="size-6" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground tracking-tight">
                  Student Enrollment Studio
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Enroll single students or generate entire class rosters automatically
                </DialogDescription>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="size-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Tab Selector */}
          <Tabs
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as any)}
            className="w-full mt-4"
          >
            <TabsList className="grid grid-cols-3 h-11 p-1 bg-muted/70 rounded-2xl border border-border/50">
              <TabsTrigger
                value="quick-paste"
                className="rounded-xl text-xs font-semibold gap-2 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-xs cursor-pointer transition-all"
              >
                <Sparkles className="size-3.5 text-primary shrink-0" />
                <span className="whitespace-nowrap">Quick Paste & Series (Option A)</span>
              </TabsTrigger>

              <TabsTrigger
                value="excel"
                className="rounded-xl text-xs font-semibold gap-2 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-xs cursor-pointer transition-all"
              >
                <FileSpreadsheet className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="whitespace-nowrap">Excel / CSV Import (Option B)</span>
              </TabsTrigger>

              <TabsTrigger
                value="single"
                className="rounded-xl text-xs font-semibold gap-2 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-xs cursor-pointer transition-all"
              >
                <UserPlus className="size-3.5 text-primary shrink-0" />
                <span className="whitespace-nowrap">Single Student</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </DialogHeader>

        {/* Scrollable Content Body with Animated Transitions */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6">
          <AnimatePresence mode="wait">
            {activeTab === "quick-paste" && (
              <motion.div
                key="quick-paste"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
              >
                <QuickPasteEnrollment
                  deptOptions={deptOptions}
                  classOptions={classOptions}
                  defaultDeptId={defaultDeptId}
                  defaultYear={defaultYear}
                  defaultClassId={defaultClassId}
                  onSuccess={handleSuccess}
                  onCancel={() => onOpenChange(false)}
                />
              </motion.div>
            )}

            {activeTab === "excel" && (
              <motion.div
                key="excel"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
              >
                <ExcelCsvEnrollment
                  deptOptions={deptOptions}
                  classOptions={classOptions}
                  defaultDeptId={defaultDeptId}
                  defaultYear={defaultYear}
                  defaultClassId={defaultClassId}
                  onSuccess={handleSuccess}
                  onCancel={() => onOpenChange(false)}
                />
              </motion.div>
            )}

            {activeTab === "single" && (
              <motion.div
                key="single"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
              >
                <SingleStudentForm
                  deptOptions={deptOptions}
                  classOptions={classOptions}
                  defaultDeptId={defaultDeptId}
                  defaultYear={defaultYear}
                  defaultClassId={defaultClassId}
                  onSuccess={handleSuccess}
                  onCancel={() => onOpenChange(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  )
}
