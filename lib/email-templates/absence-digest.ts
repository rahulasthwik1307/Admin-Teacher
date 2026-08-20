export interface AbsenceEmailParams {
  studentName: string
  subjectName: string
  date: string
  period: number
  className: string
  subjectAttended: number
  subjectTotal: number
  overallAttended: number
  overallTotal: number
}

function getTierMessage(pct: number): { message: string } {
  if (pct >= 85) return { message: "This is an informational update regarding your recent attendance record." }
  if (pct >= 75) return { message: `Your overall attendance is ${pct}%. Please try to attend classes regularly to stay above the required 75% minimum.` }
  if (pct >= 65) return { message: `Your overall attendance has dropped to ${pct}%, below the required 75% minimum. Continued absences may affect your academic standing.` }
  return { message: `Your overall attendance is critically low at ${pct}%. Immediate improvement is required to avoid academic penalties. Please contact your department if you have concerns.` }
}

function getTierColor(pct: number): string {
  if (pct >= 85) return "#2563eb"
  if (pct >= 75) return "#d97706"
  if (pct >= 65) return "#ea580c"
  return "#dc2626"
}

export function buildAbsenceEmail(p: AbsenceEmailParams) {
  const subjectPct = p.subjectTotal > 0 ? Math.round((p.subjectAttended / p.subjectTotal) * 100) : 0
  const overallPct = p.overallTotal > 0 ? Math.round((p.overallAttended / p.overallTotal) * 100) : 0
  const color = getTierColor(overallPct)
  const { message } = getTierMessage(overallPct)
  const subject = `Absence Notification — ${p.subjectName}`

  const html = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #111827;">
    <div style="border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
      <div style="background: ${color}; padding: 20px 24px;">
        <h1 style="margin: 0; font-size: 18px; color: white; font-weight: 700;">Absence Notification</h1>
      </div>
      <div style="padding: 24px;">
        <p style="font-size: 14px; line-height: 1.6; margin: 0 0 16px;">Hi ${p.studentName},</p>
        <p style="font-size: 14px; line-height: 1.6; margin: 0 0 16px;">You were marked absent for the following class:</p>

        <div style="background: #f9fafb; border-radius: 8px; padding: 14px 16px; margin-bottom: 20px;">
          <p style="margin: 0 0 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #6b7280; letter-spacing: 0.5px;">Missed Class</p>
          <table style="width: 100%; font-size: 13.5px; color: #374151;">
            <tr><td style="padding: 3px 0; color: #6b7280;">Subject</td><td style="padding: 3px 0; font-weight: 600; text-align: right;">${p.subjectName}</td></tr>
            <tr><td style="padding: 3px 0; color: #6b7280;">Date</td><td style="padding: 3px 0; font-weight: 600; text-align: right;">${p.date}</td></tr>
            <tr><td style="padding: 3px 0; color: #6b7280;">Period</td><td style="padding: 3px 0; font-weight: 600; text-align: right;">Period ${p.period}</td></tr>
            <tr><td style="padding: 3px 0; color: #6b7280;">Section</td><td style="padding: 3px 0; font-weight: 600; text-align: right;">${p.className}</td></tr>
          </table>
        </div>

        <p style="margin: 0 0 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #6b7280; letter-spacing: 0.5px;">Subject Attendance — ${p.subjectName}</p>
        <div style="display: flex; align-items: baseline; justify-content: space-between; border-bottom: 2px solid #f3f4f6; padding-bottom: 14px; margin-bottom: 18px;">
          <span style="font-size: 13px; color: #374151;">${p.subjectAttended} / ${p.subjectTotal} classes attended</span>
          <span style="font-size: 22px; font-weight: 800; color: ${subjectPct >= 75 ? "#059669" : subjectPct >= 65 ? "#d97706" : "#dc2626"};">${subjectPct}%</span>
        </div>

        <p style="margin: 0 0 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #6b7280; letter-spacing: 0.5px;">Overall Attendance — All Subjects</p>
        <div style="display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 18px;">
          <span style="font-size: 13px; color: #374151;">${p.overallAttended} / ${p.overallTotal} classes attended</span>
          <span style="font-size: 22px; font-weight: 800; color: ${color};">${overallPct}%</span>
        </div>

        <div style="background: ${color}15; border-left: 3px solid ${color}; padding: 14px 16px; border-radius: 6px;">
          <p style="margin: 0; font-size: 13.5px; line-height: 1.6; color: #111827;">${message}</p>
        </div>

        <p style="font-size: 12px; color: #9ca3af; margin-top: 24px;">This is an automated notification from your college attendance system.</p>
      </div>
    </div>
  </div>`

  return { subject, html }
}

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
  const first = absences[0]
  return buildAbsenceEmail({
    studentName,
    subjectName: first?.subject ?? "Multiple Classes",
    date: first?.date ?? "",
    period: first?.period ?? 0,
    className: first?.className ?? "",
    subjectAttended: 0,
    subjectTotal: 0,
    overallAttended: attendancePercentage,
    overallTotal: 100,
  })
}

