export interface AbsenceItem {
  date: string // "July 14, 2026"
  subject: string
  period: number
  className: string
}

export interface DigestParams {
  studentName: string
  absences: AbsenceItem[]
  attendancePercentage: number
}

function getTierMessage(pct: number): { tone: string; message: string } {
  if (pct >= 85) {
    return {
      tone: "neutral",
      message: "This is an informational update regarding your recent attendance record.",
    }
  }
  if (pct >= 75) {
    return {
      tone: "caution",
      message: `Your current attendance is ${pct}%. Please try to attend classes regularly to stay above the required 75% minimum.`,
    }
  }
  if (pct >= 65) {
    return {
      tone: "warning",
      message: `Your attendance has dropped to ${pct}%, which is below the required 75% minimum. Continued absences may affect your academic standing.`,
    }
  }
  return {
    tone: "urgent",
    message: `Your attendance is critically low at ${pct}%. Immediate improvement is required to avoid academic penalties. Please contact your department if you have concerns.`,
  }
}

function getTierColor(tone: string): string {
  switch (tone) {
    case "neutral": return "#2563eb"
    case "caution": return "#d97706"
    case "warning": return "#ea580c"
    case "urgent": return "#dc2626"
    default: return "#2563eb"
  }
}

export function buildAbsenceDigestEmail({ studentName, absences, attendancePercentage }: DigestParams) {
  const { tone, message } = getTierMessage(attendancePercentage)
  const color = getTierColor(tone)
  const count = absences.length
  const subject = `Attendance Update — ${count} Missed Class${count !== 1 ? "es" : ""}`

  const rows = absences
    .map(
      (a) => `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #374151;">${a.date}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #374151;">${a.subject}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #374151;">Period ${a.period}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #374151;">${a.className}</td>
      </tr>`
    )
    .join("")

  const html = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #111827;">
    <div style="border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
      <div style="background: ${color}; padding: 20px 24px;">
        <h1 style="margin: 0; font-size: 18px; color: white; font-weight: 700;">${subject}</h1>
      </div>
      <div style="padding: 24px;">
        <p style="font-size: 14px; line-height: 1.6; margin: 0 0 16px;">Hi ${studentName},</p>
        <p style="font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
          You were marked absent for the following ${count > 1 ? "classes" : "class"}:
        </p>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background: #f9fafb;">
              <th style="padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280; border-bottom: 1px solid #e5e7eb;">Date</th>
              <th style="padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280; border-bottom: 1px solid #e5e7eb;">Subject</th>
              <th style="padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280; border-bottom: 1px solid #e5e7eb;">Period</th>
              <th style="padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280; border-bottom: 1px solid #e5e7eb;">Class</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="background: ${color}15; border-left: 3px solid ${color}; padding: 14px 16px; border-radius: 6px; margin-bottom: 8px;">
          <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #111827;">
            <strong>Current attendance: ${attendancePercentage}%</strong><br/>
            ${message}
          </p>
        </div>
        <p style="font-size: 12px; color: #9ca3af; margin-top: 24px;">
          This is an automated notification from your college attendance system.
        </p>
      </div>
    </div>
  </div>`

  return { subject, html }
}
