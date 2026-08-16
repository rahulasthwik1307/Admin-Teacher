"use client"

import React from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

// ── SHARED SKELETONS ───────────────────────────────────────────────────

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-5 flex flex-col gap-4">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-9 w-1/2" />
        <Skeleton className="h-3 w-3/4" />
      </CardContent>
    </Card>
  )
}

export function TableSkeleton({ rows = 4, cols = 5, hasAvatar = false }: { rows?: number; cols?: number; hasAvatar?: boolean }) {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i} className="px-4 py-3 text-left">
                  <Skeleton className="h-4 w-16" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r} className="border-b border-border last:border-0 hover:bg-muted/10">
                {Array.from({ length: cols }).map((_, c) => (
                  <td key={c} className="px-4 py-3.5">
                    {c === 0 && hasAvatar ? (
                      <div className="flex items-center gap-3">
                        <Skeleton className="size-9 rounded-full shrink-0" />
                        <Skeleton className="h-4 w-28" />
                      </div>
                    ) : (
                      <Skeleton className={cn("h-4", c === 0 ? "w-32" : c === cols - 1 ? "w-12 ml-auto" : "w-20")} />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function ListSkeleton({ count = 3, hasAvatar = true }: { count?: number; hasAvatar?: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
          {hasAvatar && <Skeleton className="size-9 rounded-full shrink-0" />}
          <div className="flex-1 flex flex-col gap-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="h-5 w-14 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  )
}

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-5 flex flex-col gap-6 h-full min-h-60 justify-between">
        <Skeleton className="h-5 w-1/4" />
        <div className="flex items-end justify-between gap-3 h-40 pt-4">
          <Skeleton className="h-12 w-full max-w-10 rounded-t" />
          <Skeleton className="h-28 w-full max-w-10 rounded-t" />
          <Skeleton className="h-20 w-full max-w-10 rounded-t" />
          <Skeleton className="h-32 w-full max-w-10 rounded-t" />
          <Skeleton className="h-16 w-full max-w-10 rounded-t" />
          <Skeleton className="h-24 w-full max-w-10 rounded-t" />
        </div>
      </CardContent>
    </Card>
  )
}

export function MapSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex h-full min-h-120 flex-col gap-4 rounded-xl border border-border bg-card p-4", className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="relative flex-1 rounded-lg border border-border bg-muted/20 overflow-hidden flex items-center justify-center">
        {/* Mock Map grid lines */}
        <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 opacity-30 pointer-events-none">
          {Array.from({ length: 36 }).map((_, i) => (
            <div key={i} className="border-r border-b border-border/60" />
          ))}
        </div>
        <div className="z-10 flex flex-col items-center gap-2">
          <Skeleton className="size-10 rounded-full" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>
    </div>
  )
}

// ── TEACHER PORTAL SKELETONS ──────────────────────────────────────────

export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-card p-3.5 lg:p-4 shadow-2xs"
        >
          <div className="flex items-center justify-between mb-2.5">
            <Skeleton className="size-8.5 rounded-lg shrink-0" />
            <Skeleton className="h-4 w-14 rounded-md" />
          </div>
          <div className="flex flex-col gap-1">
            <Skeleton className="h-7 w-16 rounded" />
            <Skeleton className="h-3.5 w-24 rounded" />
            <Skeleton className="h-3 w-32 rounded mt-0.5" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function FaceApprovalAlertSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-500/5 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 h-18">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-xl bg-amber-500/10 shrink-0" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-36 bg-amber-500/10" />
          <Skeleton className="h-3 w-28 bg-amber-500/10" />
        </div>
      </div>
      <Skeleton className="h-9 w-24 rounded bg-amber-500/10 shrink-0" />
    </div>
  )
}

export function MissedAttendanceAlertSkeleton() {
  return (
    <Card className="border-amber-200 bg-amber-500/5">
      <CardContent className="flex items-center gap-4 p-4">
        <Skeleton className="size-10 rounded-lg bg-amber-500/10 shrink-0" />
        <div className="flex flex-col gap-1.5 flex-1">
          <Skeleton className="h-4 w-44 bg-amber-500/10" />
          <Skeleton className="h-3 w-64 bg-amber-500/10" />
        </div>
        <Skeleton className="h-9 w-20 rounded bg-amber-500/10 shrink-0" />
      </CardContent>
    </Card>
  )
}

export function MyClassesSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-0 flex flex-row items-center gap-2">
        <Skeleton className="size-4 shrink-0" />
        <Skeleton className="h-4 w-36" />
      </CardHeader>
      <CardContent className="pt-4">
        {/* Desktop Table Mock */}
        <div className="hidden sm:block overflow-x-hidden w-full">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2.5"><Skeleton className="h-3 w-16" /></th>
                <th className="py-2.5"><Skeleton className="h-3 w-20" /></th>
                <th className="py-2.5"><Skeleton className="h-3 w-12" /></th>
                <th className="py-2.5"><Skeleton className="h-3 w-24" /></th>
                <th className="py-2.5 text-right"><Skeleton className="h-3 w-14 ml-auto" /></th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3].map((i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="py-3.5"><Skeleton className="h-4 w-28" /></td>
                  <td className="py-3.5"><Skeleton className="h-4 w-16" /></td>
                  <td className="py-3.5"><Skeleton className="h-4 w-8" /></td>
                  <td className="py-3.5"><Skeleton className="h-4 w-20" /></td>
                  <td className="py-3.5 text-right"><Skeleton className="h-8 w-24 ml-auto" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Mobile List Mock */}
        <div className="flex flex-col gap-3 sm:hidden">
          {[1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-3 rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-12" />
              </div>
              <div className="flex items-center justify-between mt-1">
                <Skeleton className="h-3.5 w-16" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function MyTimetableSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-0 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="size-4 shrink-0" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="size-8 rounded" />
          <Skeleton className="size-8 rounded" />
        </div>
      </CardHeader>
      <CardContent className="pt-4 flex flex-col gap-4">
        {/* Day selection tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-14 rounded-full shrink-0" />
          ))}
        </div>
        {/* Timetable slot rows */}
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 rounded-xl border border-border p-4">
              <Skeleton className="size-11 rounded-lg shrink-0" />
              <div className="flex-1 flex flex-col gap-2 min-w-0">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-7 w-20 rounded-full shrink-0" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function TodayAttendanceSummarySkeleton() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-5">
        <Skeleton className="size-8 rounded-lg shrink-0" />
        <Skeleton className="h-4 w-44" />
      </div>
      <div className="flex flex-col gap-4 flex-1">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-border p-4 flex items-center justify-between gap-4">
            <div className="flex-1 flex flex-col gap-2 min-w-0">
              <Skeleton className="h-4 w-1/3" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-2 flex-1 rounded-full" />
                <Skeleton className="h-3 w-8 shrink-0" />
              </div>
            </div>
            <Skeleton className="size-14 rounded-full shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function RecentActivitySkeleton() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-5">
        <Skeleton className="size-8 rounded-lg shrink-0" />
        <Skeleton className="h-4 w-28" />
      </div>
      <div className="flex flex-col gap-5 flex-1 relative">
        {/* Connecting timeline line */}
        <div className="absolute left-4 top-2 bottom-8 w-px bg-border" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="relative flex gap-4 pl-1">
            <Skeleton className="size-8 rounded-full shrink-0 z-10" />
            <div className="flex-1 flex flex-col gap-1.5 pt-0.5 min-w-0">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-4.5 w-3/4" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function FaceApprovalSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-7 w-20 rounded-lg" />
        <Skeleton className="h-7 w-20 rounded-lg" />
      </div>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Section Header */}
        <div className="border-b border-border bg-muted/30 px-5 py-3 flex items-center justify-between">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        {/* Rows */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-border last:border-0">
            <Skeleton className="w-1 self-stretch rounded-full shrink-0" />
            <Skeleton className="size-14 rounded-full shrink-0" />
            <div className="flex-1 flex flex-col gap-2 min-w-0">
              <Skeleton className="h-4.5 w-1/3" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-28" />
            </div>
            <div className="flex gap-2 shrink-0">
              <Skeleton className="h-8 w-20 rounded" />
              <Skeleton className="h-8.5 w-16 rounded bg-transparent border border-border" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── ADMIN PORTAL SKELETONS ────────────────────────────────────────────

export function AdminDashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {/* 4 Stats Cards */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4 lg:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-3.5 lg:p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-2.5">
              <Skeleton className="size-8.5 rounded-lg shrink-0" />
              <Skeleton className="h-4 w-12 rounded-md" />
            </div>
            <div className="flex flex-col gap-1">
              <Skeleton className="h-7 w-14 rounded" />
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="h-2.5 w-24 rounded mt-0.5" />
            </div>
          </div>
        ))}
      </div>

      {/* Quick summary chips */}
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-7 w-24 rounded-lg" />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Teacher Activity Table */}
        <Card className="lg:col-span-2 overflow-hidden border-border">
          <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Skeleton className="size-8 rounded-lg shrink-0" />
              <div className="flex flex-col gap-1">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="hidden sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/20 text-left">
                    <th className="px-5 py-2.5"><Skeleton className="h-3 w-16" /></th>
                    <th className="px-5 py-2.5"><Skeleton className="h-3 w-20" /></th>
                    <th className="px-5 py-2.5"><Skeleton className="h-3 w-20" /></th>
                    <th className="px-5 py-2.5"><Skeleton className="h-3 w-16" /></th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4].map((i) => (
                    <tr key={i} className="border-b border-border/50 last:border-0">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <Skeleton className="size-8 rounded-full shrink-0" />
                          <Skeleton className="h-3.5 w-24" />
                        </div>
                      </td>
                      <td className="px-5 py-3"><Skeleton className="h-3 w-16" /></td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-3 w-6" />
                          <Skeleton className="h-1.5 w-20 rounded-full" />
                        </div>
                      </td>
                      <td className="px-5 py-3"><Skeleton className="h-3 w-20" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Right Column: System Status */}
        <Card className="h-full flex flex-col justify-between border-border">
          <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="size-8 rounded-lg shrink-0" />
              <div className="flex flex-col gap-1">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </CardHeader>
          <CardContent className="p-3.5 flex-1">
            <div className="grid grid-cols-2 gap-2.5 h-full">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex flex-col justify-between rounded-xl border border-border/70 p-3 bg-muted/10">
                  <div className="flex justify-between items-center">
                    <Skeleton className="size-7.5 rounded-lg shrink-0" />
                    <Skeleton className="size-2 rounded-full shrink-0" />
                  </div>
                  <div className="mt-2 flex flex-col gap-1">
                    <Skeleton className="h-6 w-12" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent System Activity */}
      <Card className="border-border">
        <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Skeleton className="size-8 rounded-lg shrink-0" />
            <div className="flex flex-col gap-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </CardHeader>
        <CardContent className="p-4 sm:p-5 flex flex-col gap-4 relative">
          <div className="absolute left-7.5 top-5 bottom-8 w-px bg-border" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="relative flex gap-3.5 pl-0.5">
              <Skeleton className="size-7.5 rounded-lg shrink-0 z-10" />
              <div className="flex-1 flex flex-col gap-1.5 pt-0.5">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-3.5 w-1/2" />
              </div>
              <Skeleton className="h-3 w-14 shrink-0 self-start mt-1" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

export function MissedAttendanceSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {[1, 2].map((groupIndex) => (
        <div key={groupIndex} className="flex flex-col gap-3">
          {/* Header divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="h-px flex-1 bg-border" />
          </div>
          {/* Slot cards */}
          <div className="flex flex-col gap-2">
            {[1, 2].map((slotIndex) => (
              <Card key={slotIndex}>
                <CardContent className="flex items-center gap-4 p-4">
                  <Skeleton className="size-10 rounded-lg shrink-0" />
                  <div className="flex flex-col flex-1 gap-2 min-w-0">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3.5 w-1/2" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="size-4 rounded shrink-0" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function StudentSheetSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-col flex-1 gap-4 overflow-hidden pt-2">
      {/* Top summary row */}
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20 rounded" />
          <Skeleton className="h-8 w-20 rounded" />
        </div>
      </div>
      {/* Student list */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border border-border p-3">
            <Skeleton className="size-8 rounded-full shrink-0" />
            <div className="flex flex-col gap-2 flex-1 min-w-0">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-4 w-12 shrink-0" />
          </div>
        ))}
      </div>
      {/* Save button skeleton */}
      <Skeleton className="h-10 w-full rounded mt-auto" />
    </div>
  )
}

export function AttendanceHistorySkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {[1, 2].map((dayIndex) => (
        <div key={dayIndex} className="flex flex-col gap-3">
          {/* Day header */}
          <div className="flex items-center gap-3 mb-1">
            <Skeleton className="h-4.5 w-32" />
            <div className="flex-1 h-px bg-border" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-16" />
          </div>
          {/* Sections within day */}
          <div className="flex flex-col gap-3 pl-3 border-l-2 border-border">
            {[1, 2].map((secIndex) => (
              <div key={secIndex} className="flex flex-col">
                {/* Collapsible section row header */}
                <div className="flex items-center gap-2 py-2">
                  <Skeleton className="size-3.5 rounded" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-3.5 w-20" />
                  <Skeleton className="h-3.5 w-16 ml-auto" />
                </div>
                {/* Subject rows card */}
                <Card className="overflow-hidden">
                  <CardContent className="p-0 flex flex-col">
                    {[1, 2].map((rowIdx) => (
                      <div key={rowIdx} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
                        <div className="flex flex-col flex-1 gap-2 min-w-0">
                          <Skeleton className="h-4 w-1/3" />
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Skeleton className="h-3 w-16" />
                            <Skeleton className="h-3 w-12" />
                          </div>
                        </div>
                        <div className="hidden sm:flex items-center gap-3 shrink-0">
                          <Skeleton className="h-4 w-8" />
                          <Skeleton className="h-4 w-8" />
                        </div>
                        <Skeleton className="h-4.5 w-10 shrink-0" />
                        <Skeleton className="size-3.5 rounded shrink-0" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function StudentDetailsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-1.5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
          <div className="flex flex-col gap-2 flex-1">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  )
}

export function RecentSessionsSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      {[1, 2].map((dayIndex) => (
        <div key={dayIndex} className="flex flex-col gap-3">
          {/* Day header */}
          <div className="flex items-center gap-2 mb-1">
            <Skeleton className="h-4.5 w-24" />
            <div className="flex-1 h-px bg-border" />
            <Skeleton className="h-4 w-12" />
          </div>
          {/* Sections within day */}
          <div className="flex flex-col gap-3 pl-2">
            {[1].map((secIndex) => (
              <div key={secIndex}>
                {/* Section header */}
                <div className="flex items-center gap-2 mb-2">
                  <Skeleton className="h-5 w-16 rounded-full shrink-0" />
                  <Skeleton className="h-3.5 w-20" />
                </div>
                {/* Subject rows card */}
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  {[1, 2].map((rowIdx) => (
                    <div key={rowIdx} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0">
                      {/* Subject + period */}
                      <div className="flex-1 flex flex-col gap-2 min-w-0">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-1/4" />
                      </div>
                      {/* Attendance count */}
                      <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                        <Skeleton className="h-4 w-8" />
                        <Skeleton className="h-3 w-10" />
                      </div>
                      {/* Status badge */}
                      <Skeleton className="h-5.5 w-16 rounded-full shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}



