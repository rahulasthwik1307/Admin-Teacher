"use client"

import { QrCode } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface DropdownOption {
  value: string
  label: string
}

export interface RecentSessionData {
  subject: string
  class: string
  period: string
  date: string
  present: number
  total: number
  status: string
}

interface QRSetupStateProps {
  selectedClass: string
  selectedSubject: string
  selectedPeriod: string
  onClassChange: (val: string) => void
  onSubjectChange: (val: string) => void
  onPeriodChange: (val: string) => void
  onStart: () => void
  canStart: boolean
  classOptions: DropdownOption[]
  subjectOptions: DropdownOption[]
  periodOptions: DropdownOption[]
  recentSessions: RecentSessionData[]
}

export function QRSetupState({
  selectedClass,
  selectedSubject,
  selectedPeriod,
  onClassChange,
  onSubjectChange,
  onPeriodChange,
  onStart,
  canStart,
  classOptions,
  subjectOptions,
  periodOptions,
  recentSessions,
}: QRSetupStateProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Setup Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Start Attendance Session</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {/* Dropdowns */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">
                Class & Section
              </label>
              <Select value={selectedClass} onValueChange={onClassChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">
                Subject
              </label>
              <Select value={selectedSubject} onValueChange={onSubjectChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjectOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">
                Period
              </label>
              <Select value={selectedPeriod} onValueChange={onPeriodChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Start Button */}
          <Button
            size="lg"
            className="w-full text-base font-semibold sm:w-auto sm:self-start"
            disabled={!canStart}
            onClick={onStart}
          >
            <QrCode className="mr-2 size-5" />
            Open Attendance Window
          </Button>

          <p className="text-sm text-muted-foreground">
            Students must be inside campus and have marked college attendance
            before they can scan.
          </p>
        </CardContent>
      </Card>

      {/* Recent Sessions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Desktop table */}
          <div className="hidden sm:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Subject
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Class
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Period
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Date
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Present
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentSessions.map((session, i) => (
                    <tr
                      key={i}
                      className="border-b border-border last:border-0"
                    >
                      <td className="py-3 pr-4 font-medium text-foreground">
                        {session.subject}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {session.class}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {session.period}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {session.date}
                      </td>
                      <td className="py-3 pr-4 text-foreground">
                        {session.present}/{session.total}
                      </td>
                      <td className="py-3">
                        <Badge className="bg-emerald-100 text-emerald-700 border-0">
                          {session.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="flex flex-col gap-3 sm:hidden">
            {recentSessions.map((session, i) => (
              <div
                key={i}
                className="flex flex-col gap-2 rounded-lg border border-border p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">
                    {session.subject}
                  </span>
                  <Badge className="bg-emerald-100 text-emerald-700 border-0">
                    {session.status}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span>{session.class}</span>
                  <span>{session.period} Period</span>
                  <span>{session.date}</span>
                </div>
                <span className="text-sm font-medium text-foreground">
                  {session.present}/{session.total} Present
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
