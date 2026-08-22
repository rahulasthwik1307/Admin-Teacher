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

  const subjectBlocks = p.subjectGroups
    .map((g) => {
      const pct = g.total > 0 ? Math.round((g.attended / g.total) * 100) : 0
      const rows = g.records
        .map(
          (r) => `
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:10px 14px;font-size:13px;font-weight:600;color:#1e293b;vertical-align:middle;">
            ${r.date}
          </td>
          <td style="padding:10px 14px;text-align:right;vertical-align:middle;">
            <div style="display:inline-block;text-align:right;">
              <span style="font-size:12px;font-weight:700;color:#1e293b;background:#f1f5f9;padding:2px 8px;border-radius:5px;border:1px solid #e2e8f0;display:inline-block;">
                Period ${r.period}
              </span>
              ${
                r.startTime && r.endTime
                  ? `
                <div style="font-size:11.5px;color:#64748b;margin-top:3px;font-weight:500;">
                  ${r.startTime} – ${r.endTime}
                </div>
              `
                  : ""
              }
            </div>
          </td>
        </tr>`
        )
        .join("")

      return `
      <div style="margin-bottom:18px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;background:#ffffff;">
        <!-- Subject Header Bar -->
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;background:#f8fafc;border-bottom:1px solid #e2e8f0;">
          <tr>
            <td style="padding:11px 14px;font-size:13.5px;font-weight:700;color:#0f172a;letter-spacing:0.01em;">
              ${g.subjectName}
            </td>
            <td style="padding:11px 14px;text-align:right;font-size:12px;font-weight:600;color:#64748b;white-space:nowrap;">
              ${g.records.length} absence${g.records.length !== 1 ? "s" : ""}
            </td>
          </tr>
        </table>

        <!-- Absence Records Table -->
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#ffffff;border-bottom:1px solid #f1f5f9;">
              <th style="padding:8px 14px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;width:45%;">
                Date
              </th>
              <th style="padding:8px 14px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;width:55%;">
                Period &amp; Time
              </th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <!-- Subject Attendance Percentage Footer Callout -->
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;background:${
          pct >= 75 ? "#f0fdf4" : pct >= 65 ? "#fffbeb" : "#fef2f2"
        };border-top:1px solid ${pct >= 75 ? "#dcfce7" : pct >= 65 ? "#fef3c7" : "#fee2e2"};">
          <tr>
            <td style="padding:10px 14px;font-size:12.5px;font-weight:600;color:${
              pct >= 75 ? "#166534" : pct >= 65 ? "#92400e" : "#991b1b"
            };">
              Course Attendance (${g.attended}/${g.total} classes)
            </td>
            <td style="padding:10px 14px;text-align:right;font-size:13px;font-weight:800;color:${
              pct >= 75 ? "#15803d" : pct >= 65 ? "#b45309" : "#b91c1c"
            };white-space:nowrap;">
              ${pct}%
            </td>
          </tr>
        </table>
      </div>`
    })
    .join("")

  const html = `
  <div style="background:#f8fafc;padding:24px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;line-height:1.5;">
    <div style="max-width:580px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
      <!-- Header Banner -->
      <div style="background:${color};padding:22px 24px;">
        <h1 style="margin:0;font-size:18px;color:#ffffff;font-weight:800;letter-spacing:-0.01em;">Attendance Absence Notice</h1>
        <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.85);font-weight:500;">Official academic attendance notification</p>
      </div>

      <!-- Body Content -->
      <div style="padding:22px 24px;">
        <p style="font-size:14.5px;line-height:1.6;margin:0 0 6px;font-weight:600;color:#0f172a;">Dear ${p.studentName},</p>
        <p style="font-size:13.5px;line-height:1.6;margin:0 0 18px;color:#475569;">
          Our attendance records show the following absences recorded for your registered courses:
        </p>

        ${subjectBlocks}

        <!-- Overall Attendance Summary Callout -->
        <div style="margin-top:22px;padding:16px;background:${color}0d;border:1px solid ${color}30;border-left:4px solid ${color};border-radius:8px;">
          <table width="100%" border="0" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:#64748b;">
                Overall Attendance — All Subjects
              </td>
              <td style="text-align:right;font-size:18px;font-weight:900;color:${color};white-space:nowrap;">
                ${overallPct}%
              </td>
            </tr>
          </table>
          <p style="margin:6px 0 6px;font-size:13px;color:#334151;">
            <strong>${p.overallAttended}</strong> of <strong>${p.overallTotal}</strong> total classes attended
          </p>
          <p style="margin:0;font-size:12.5px;line-height:1.5;color:#1e293b;">
            ${tierMessage(overallPct)}
          </p>
        </div>

        <!-- Footer -->
        <div style="margin-top:22px;padding-top:16px;border-top:1px solid #f1f5f9;font-size:12px;color:#94a3b8;line-height:1.6;">
          Please review your attendance and ensure regular attendance going forward.<br/>
          <span style="font-size:11px;color:#cbd5e1;">Sent automatically via Campus Attendance System</span>
        </div>
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

export function buildAbsenceDigestEmail({
  studentName,
  absences,
  attendancePercentage,
}: DigestParams) {
  const subjectGroups: SubjectGroup[] = []
  const bySubject = new Map<string, AbsenceItem[]>()
  for (const a of absences) {
    if (!bySubject.has(a.subject)) bySubject.set(a.subject, [])
    bySubject.get(a.subject)!.push(a)
  }
  for (const [subjectName, items] of bySubject.entries()) {
    subjectGroups.push({
      subjectName,
      records: items.map((item) => ({
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
