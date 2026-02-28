"use client"

import { useState } from "react"
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Award,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { Badge } from "@/components/ui/badge"

/* ── time period options ───────────────────────────────── */
const periods = ["This Week", "This Month", "This Semester"] as const
type Period = (typeof periods)[number]

/* ── Subject summary data ──────────────────────────────── */
const subjects = [
  {
    name: "Data Structures",
    class: "CSE-A",
    percentage: 86,
    totalStudents: 180,
    totalClasses: 24,
    trend: "Improving" as const,
  },
  {
    name: "Operating Systems",
    class: "CSE-B",
    percentage: 72,
    totalStudents: 165,
    totalClasses: 22,
    trend: "Stable" as const,
  },
  {
    name: "DBMS",
    class: "CSE-A",
    percentage: 53,
    totalStudents: 170,
    totalClasses: 20,
    trend: "Declining" as const,
  },
]

/* ── Trend chart data ──────────────────────────────────── */
const chartData = [
  { date: "Oct 17", percentage: 91 },
  { date: "Oct 18", percentage: 70 },
  { date: "Oct 19", percentage: 53 },
  { date: "Oct 20", percentage: 85 },
  { date: "Oct 21", percentage: 94 },
  { date: "Oct 22", percentage: 60 },
  { date: "Oct 23", percentage: 81 },
  { date: "Oct 24", percentage: 88 },
]

/* ── Students needing attention ────────────────────────── */
const lowStudents = [
  { name: "Arjun Singh", roll: "21CSE049", subject: "DBMS", percentage: 42, attended: 8, total: 20 },
  { name: "Suresh Kumar", roll: "21CSE054", subject: "Operating Systems", percentage: 55, attended: 12, total: 22 },
  { name: "Farhan Ali", roll: "21CSE052", subject: "DBMS", percentage: 60, attended: 12, total: 20 },
  { name: "Meena Joshi", roll: "21CSE050", subject: "Data Structures", percentage: 67, attended: 16, total: 24 },
]

/* ── Top performers ────────────────────────────────────── */
const topStudents = [
  { name: "Rahul Sharma", roll: "21CSE047", subject: "Data Structures", percentage: 96, attended: 23, total: 24 },
  { name: "Priya Patel", roll: "21CSE048", subject: "Operating Systems", percentage: 95, attended: 21, total: 22 },
  { name: "Divya Sharma", roll: "21CSE053", subject: "Data Structures", percentage: 92, attended: 22, total: 24 },
]

/* ── helpers ───────────────────────────────────────────── */
function pctColor(pct: number) {
  if (pct >= 75) return "text-emerald-600"
  if (pct >= 60) return "text-amber-600"
  return "text-red-600"
}
function barColor(pct: number) {
  if (pct >= 75) return "#059669"
  if (pct >= 60) return "#d97706"
  return "#dc2626"
}

/* ── Circular progress ring ────────────────────────────── */
function CircularProgress({
  percentage,
  size = 100,
  strokeWidth = 8,
}: {
  percentage: number
  size?: number
  strokeWidth?: number
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference

  let strokeColor = "#059669"
  if (percentage < 75) strokeColor = "#d97706"
  if (percentage < 60) strokeColor = "#dc2626"

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          stroke={strokeColor}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <span className={`absolute text-2xl font-bold ${pctColor(percentage)}`}>
        {percentage}%
      </span>
    </div>
  )
}

/* ── Custom tooltip ────────────────────────────────────── */
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  const pct = payload[0].value
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-sm font-semibold ${pctColor(pct)}`}>{pct}%</p>
    </div>
  )
}

/* ── page ──────────────────────────────────────────────── */
export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>("This Month")

  return (
    <div className="flex flex-col gap-8">
      {/* Subtitle */}
      <p className="text-sm text-muted-foreground -mt-1">
        Attendance insights for your subjects.
      </p>

      {/* ── Period selector ────────────────────────────── */}
      <div className="flex items-center gap-1 rounded-lg bg-muted p-1 self-start">
        {periods.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              period === p
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* ── Subject summary cards ──────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {subjects.map((sub) => (
          <div
            key={sub.name}
            className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card p-6"
          >
            <div className="text-center">
              <h3 className="text-sm font-semibold text-foreground">{sub.name}</h3>
              <p className="text-xs text-muted-foreground">{sub.class}</p>
            </div>

            <CircularProgress percentage={sub.percentage} size={110} strokeWidth={10} />

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{sub.totalStudents} total students</span>
              <span className="text-border">|</span>
              <span>{sub.totalClasses} classes</span>
            </div>

            <div className="flex items-center gap-1.5">
              {sub.trend === "Improving" && (
                <>
                  <TrendingUp className="size-4 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-600">Improving</span>
                </>
              )}
              {sub.trend === "Stable" && (
                <>
                  <Minus className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Stable</span>
                </>
              )}
              {sub.trend === "Declining" && (
                <>
                  <TrendingDown className="size-4 text-red-600" />
                  <span className="text-sm font-medium text-red-600">Declining</span>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Bar chart ──────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-foreground">
          Attendance Trend — Last 8 Sessions
        </h2>
        <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--color-muted)", opacity: 0.4 }} />
              <Bar dataKey="percentage" radius={[6, 6, 0, 0]} maxBarSize={48}>
                {chartData.map((entry, idx) => (
                  <Cell key={idx} fill={barColor(entry.percentage)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Students needing attention ─────────────────── */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-5 text-red-500" />
          <h2 className="text-base font-semibold text-foreground">
            Students Needing Attention
          </h2>
        </div>

        {/* Desktop table */}
        <div className="hidden rounded-lg border border-border bg-card md:block">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Student Name</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Roll Number</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Subject</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Attendance</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Attended</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total Classes</th>
                </tr>
              </thead>
              <tbody>
                {lowStudents.map((st) => (
                  <tr key={st.roll + st.subject} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{st.name}</td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{st.roll}</td>
                    <td className="px-4 py-3 text-foreground">{st.subject}</td>
                    <td className="px-4 py-3 text-right font-semibold text-red-600">{st.percentage}%</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{st.attended}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{st.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile cards */}
        <div className="flex flex-col gap-3 md:hidden">
          {lowStudents.map((st) => (
            <div key={st.roll + st.subject} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">{st.name}</span>
                  <span className="text-xs text-muted-foreground font-mono">{st.roll}</span>
                </div>
                <span className="text-sm font-semibold text-red-600">{st.percentage}%</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>{st.subject}</span>
                <span>{st.attended} / {st.total} classes</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Top performers ─────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Award className="size-5 text-emerald-600" />
          <h2 className="text-base font-semibold text-foreground">
            Top Performers
          </h2>
        </div>

        {/* Desktop table */}
        <div className="hidden rounded-lg border border-border bg-card md:block">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Student Name</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Roll Number</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Subject</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Attendance</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Attended</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total Classes</th>
                </tr>
              </thead>
              <tbody>
                {topStudents.map((st) => (
                  <tr key={st.roll + st.subject} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{st.name}</td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{st.roll}</td>
                    <td className="px-4 py-3 text-foreground">{st.subject}</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600">{st.percentage}%</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{st.attended}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{st.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile cards */}
        <div className="flex flex-col gap-3 md:hidden">
          {topStudents.map((st) => (
            <div key={st.roll + st.subject} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">{st.name}</span>
                  <span className="text-xs text-muted-foreground font-mono">{st.roll}</span>
                </div>
                <span className="text-sm font-semibold text-emerald-600">{st.percentage}%</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>{st.subject}</span>
                <span>{st.attended} / {st.total} classes</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
