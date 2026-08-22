export interface AbsenceRecord {
  date: string
  period: number
  startTime: string
  endTime: string
}

export interface SubjectGroup {
  subjectName: string
  records: AbsenceRecord[]
  attended: number
  total: number
}

export interface ConsolidatedEmailParams {
  studentName: string
  subjectGroups: SubjectGroup[]
  overallAttended: number
  overallTotal: number
}

function tierMessage(pct: number) {
  if (pct >= 85) return "This is an informational update regarding your recent attendance record."
  if (pct >= 75) return `Your overall attendance is ${pct}%. Please try to attend classes regularly to stay above the required 75% minimum.`
  if (pct >= 65) return `Your overall attendance has dropped to ${pct}%, below the required 75% minimum. Continued absences may affect your academic standing.`
  return `Your overall attendance is critically low at ${pct}%. Immediate improvement is required to avoid academic penalties.`
}

function tierColor(pct: number) {
  if (pct >= 85) return "#2563eb"
  if (pct >= 75) return "#d97706"
  if (pct >= 65) return "#ea580c"
  return "#dc2626"
}

export function buildConsolidatedAbsenceEmail(p: ConsolidatedEmailParams) {
  const overallPct = p.overallTotal > 0 ? Math.round((p.overallAttended / p.overallTotal) * 100) : 0
  const color = tierColor(overallPct)
  const totalRecords = p.subjectGroups.reduce((s, g) => s + g.records.length, 0)
  const subject = `Attendance Absence Notice — ${totalRecords} record${totalRecords !== 1 ? "s" : ""}`

  const subjectBlocks = p.subjectGroups.map(g => {
    const pct = g.total > 0 ? Math.round((g.attended / g.total) * 100) : 0
    const rows = g.records.map(r => `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:13px;white-space:nowrap;">${r.date}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:13px;white-space:nowrap;">Period ${r.period}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:13px;white-space:nowrap;">${r.startTime}–${r.endTime}</td>
      </tr>`).join("")
    return `
      <p style="margin:18px 0 6px;font-size:14px;font-weight:700;color:#111827;">${g.subjectName}</p>
      <div style="overflow-x:auto;border:1px solid #e5e7eb;border-radius:8px;">
        <table style="border-collapse:collapse;min-width:340px;width:100%;">
          <thead><tr style="background:#f9fafb;">
            <th style="padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;">Date</th>
            <th style="padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;">Period</th>
            <th style="padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;">Time</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p style="margin:8px 0 0;font-size:14px;font-weight:700;color:${pct >= 75 ? "#059669" : pct >= 65 ? "#d97706" : "#dc2626"};">${g.subjectName} Attendance: ${g.attended}/${g.total} classes — ${pct}%</p>`
  }).join("")

  const html = `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#111827;">
    <div style="border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
      <div style="background:${color};padding:20px 24px;">
        <h1 style="margin:0;font-size:17px;color:white;font-weight:700;">Attendance Absence Notice</h1>
      </div>
      <div style="padding:20px 24px;">
        <p style="font-size:14px;line-height:1.6;margin:0 0 4px;">Dear ${p.studentName},</p>
        <p style="font-size:14px;line-height:1.6;margin:0 0 4px;">Our attendance records show the following absences:</p>
        ${subjectBlocks}
        <div style="margin-top:20px;padding:14px 16px;background:${color}15;border-left:3px solid ${color};border-radius:6px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;color:#6b7280;">Overall Attendance — All Subjects</p>
          <p style="margin:0 0 6px;font-size:13.5px;color:#374151;">${p.overallAttended} / ${p.overallTotal} classes attended — <strong style="color:${color};">${overallPct}%</strong></p>
          <p style="margin:0;font-size:13px;line-height:1.5;color:#111827;">${tierMessage(overallPct)}</p>
        </div>
        <p style="font-size:12px;color:#9ca3af;margin-top:20px;">Please review your attendance and ensure regular attendance going forward.<br/>Regards, Attendance System</p>
      </div>
    </div>
  </div>`

  return { subject, html }
}

// Backward compatibility exports for legacy single/digest routes
export interface AbsenceItem {
  date: string
  subject: string
  period: number
  className: string
}

export interface DigestParams {
  studentName: string
  absences: AbsenceItem[]
  attendancePercentage: number
}

export function buildAbsenceDigestEmail({ studentName, absences, attendancePercentage }: DigestParams) {
  const subjectGroups: SubjectGroup[] = []
  const bySubject = new Map<string, AbsenceItem[]>()
  for (const a of absences) {
    if (!bySubject.has(a.subject)) bySubject.set(a.subject, [])
    bySubject.get(a.subject)!.push(a)
  }
  for (const [subjectName, items] of bySubject.entries()) {
    subjectGroups.push({
      subjectName,
      records: items.map(item => ({
        date: item.date,
        period: item.period,
        startTime: "",
        endTime: "",
      })),
      attended: attendancePercentage,
      total: 100,
    })
  }
  return buildConsolidatedAbsenceEmail({
    studentName,
    subjectGroups,
    overallAttended: attendancePercentage,
    overallTotal: 100,
  })
}

