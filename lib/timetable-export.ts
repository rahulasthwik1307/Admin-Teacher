import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

export interface ExportPeriod {
  number: number
  label: string
  start: string
  end: string
}

export interface ExportTimetableEntry {
  day: number // 1 = Monday, ..., 6 = Saturday
  dayLabel: string
  periodNumber: number
  periodStart?: string
  periodEnd?: string
  subject: string
  subjectCode?: string
  teacher?: string
  className?: string
  section?: string
  year?: string
  classSection?: string
}

export interface ExportClassInfo {
  id: string
  name: string
  section: string
  year?: string
  label?: string
  fullLabel?: string
}

const DAYS = [
  { value: 1, name: "Monday", short: "Mon" },
  { value: 2, name: "Tuesday", short: "Tue" },
  { value: 3, name: "Wednesday", short: "Wed" },
  { value: 4, name: "Thursday", short: "Thu" },
  { value: 5, name: "Friday", short: "Fri" },
  { value: 6, name: "Saturday", short: "Sat" },
]

/**
 * Curated soft pastel color palette for PDF table cells
 * with corresponding dark readable text colors.
 */
const PDF_SUBJECT_COLORS: { bg: [number, number, number]; border: [number, number, number]; text: [number, number, number] }[] = [
  { bg: [238, 242, 255], border: [199, 210, 254], text: [30, 41, 59] }, // Soft Indigo / Slate
  { bg: [236, 253, 245], border: [167, 243, 208], text: [6, 78, 59] },   // Soft Emerald
  { bg: [254, 243, 199], border: [253, 230, 138], text: [120, 53, 15] },  // Soft Amber
  { bg: [245, 243, 255], border: [221, 214, 254], text: [76, 29, 149] },  // Soft Violet
  { bg: [255, 241, 242], border: [254, 205, 211], text: [136, 19, 55] },  // Soft Rose
  { bg: [240, 249, 255], border: [186, 230, 253], text: [12, 74, 110] },  // Soft Sky
  { bg: [255, 247, 237], border: [254, 215, 170], text: [124, 45, 18] },  // Soft Orange
  { bg: [240, 253, 250], border: [153, 246, 228], text: [19, 78, 74] },   // Soft Teal
]

function getSubjectColorIndex(subjectName: string, subjectIndexMap: Map<string, number>) {
  if (!subjectIndexMap.has(subjectName)) {
    subjectIndexMap.set(subjectName, subjectIndexMap.size % PDF_SUBJECT_COLORS.length)
  }
  return PDF_SUBJECT_COLORS[subjectIndexMap.get(subjectName)!]
}

/**
 * Generates and downloads a clean, publication-ready PDF timetable for Admin view.
 */
export function exportAdminTimetablePDF({
  entries,
  periods,
  classes,
  selectedClassId = "all",
  institutionName = "CAMPUS ACADEMIC TIMETABLE",
}: {
  entries: ExportTimetableEntry[]
  periods: ExportPeriod[]
  classes: ExportClassInfo[]
  selectedClassId?: string
  institutionName?: string
}) {
  if (!entries || entries.length === 0) {
    throw new Error("No timetable entries available to export.")
  }

  const sortedPeriods = [...periods].sort((a, b) => a.number - b.number)

  // Map each unique subject to a consistent pastel color
  const subjectColorMap = new Map<string, number>()
  const allUniqueSubjects = Array.from(new Set(entries.map((e) => e.subject).filter((s) => s && s !== "—" && s !== "Unassigned")))
  allUniqueSubjects.forEach((s, i) => subjectColorMap.set(s, i % PDF_SUBJECT_COLORS.length))

  // Resolve target classes
  let targetClasses: ExportClassInfo[] = []

  if (selectedClassId === "all") {
    // Only include classes that actually have scheduled entries
    const scheduledClassSections = Array.from(
      new Set(entries.map((e) => e.classSection).filter((cs): cs is string => Boolean(cs) && cs !== "—"))
    ).sort()

    if (scheduledClassSections.length > 0) {
      targetClasses = scheduledClassSections.map((cs) => {
        const found = classes.find(
          (c) =>
            c.fullLabel === cs ||
            `${c.name}-${c.section} · ${c.year}` === cs ||
            c.label === cs ||
            c.id === cs
        )
        if (found) return found

        const [cNameSec, cYear] = cs.includes(" · ") ? cs.split(" · ") : [cs, ""]
        const [cName, cSection] = cNameSec.includes("-") ? cNameSec.split("-") : [cNameSec, ""]
        return {
          id: cs,
          name: cName || cs,
          section: cSection || "",
          year: cYear || "",
          label: cNameSec,
          fullLabel: cs,
        }
      })
    } else {
      // Fallback
      targetClasses = classes.length > 0 ? classes : [{ id: "all", name: "All Classes", section: "", year: "" }]
    }
  } else {
    // Specific class requested
    const found = classes.find(
      (c) =>
        c.fullLabel === selectedClassId ||
        `${c.name}-${c.section} · ${c.year}` === selectedClassId ||
        c.id === selectedClassId ||
        c.label === selectedClassId
    )

    if (found) {
      targetClasses = [found]
    } else {
      const [cNameSec, cYear] = selectedClassId.includes(" · ") ? selectedClassId.split(" · ") : [selectedClassId, ""]
      const [cName, cSection] = cNameSec.includes("-") ? cNameSec.split("-") : [cNameSec, ""]
      targetClasses = [
        {
          id: selectedClassId,
          name: cName || selectedClassId,
          section: cSection || "",
          year: cYear || "",
          label: cNameSec,
          fullLabel: selectedClassId,
        },
      ]
    }
  }

  // Filter out any target class that has 0 entries when exporting all classes
  if (selectedClassId === "all") {
    targetClasses = targetClasses.filter((cls) => {
      return entries.some((e) => {
        if (cls.fullLabel && e.classSection) {
          return e.classSection.toLowerCase() === cls.fullLabel.toLowerCase()
        }
        if (cls.name && cls.section && e.className && e.section) {
          const mName = e.className.toLowerCase() === cls.name.toLowerCase()
          const mSec = e.section.toLowerCase() === cls.section.toLowerCase()
          const mYear = !cls.year || !e.year || e.year.toLowerCase() === cls.year.toLowerCase()
          return mName && mSec && mYear
        }
        if (e.classSection && cls.name) {
          return e.classSection.toLowerCase().includes(cls.name.toLowerCase())
        }
        return false
      })
    })
  }

  if (targetClasses.length === 0) {
    throw new Error("No scheduled classes found matching your selection.")
  }

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  })

  const timestamp = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  targetClasses.forEach((cls, classIndex) => {
    if (classIndex > 0) {
      doc.addPage("a4", "landscape")
    }

    const classEntries = entries.filter((e) => {
      if (cls.fullLabel && e.classSection) {
        return e.classSection.toLowerCase() === cls.fullLabel.toLowerCase()
      }
      if (cls.name && cls.section && e.className && e.section) {
        const mName = e.className.toLowerCase() === cls.name.toLowerCase()
        const mSec = e.section.toLowerCase() === cls.section.toLowerCase()
        const mYear = !cls.year || !e.year || e.year.toLowerCase() === cls.year.toLowerCase()
        return mName && mSec && mYear
      }
      if (e.classSection && cls.name) {
        return e.classSection.toLowerCase().includes(cls.name.toLowerCase())
      }
      return true
    })

    // Parse class name, section, and year
    let displayName = cls.name
    let displaySection = cls.section
    let displayYear = cls.year || ""

    if (cls.fullLabel && cls.fullLabel.includes(" · ")) {
      const [cNameSec, cYear] = cls.fullLabel.split(" · ")
      displayYear = cYear
      if (cNameSec.includes("-")) {
        const [cN, cS] = cNameSec.split("-")
        displayName = cN
        displaySection = cS
      } else {
        displayName = cNameSec
      }
    }

    // ── Header Box (Rich Slate-900 Executive Banner) ──
    const headerX = 14
    const headerY = 10
    const headerW = pageWidth - 28
    const headerH = 24

    doc.setFillColor(15, 23, 42) // slate-900
    doc.roundedRect(headerX, headerY, headerW, headerH, 2.5, 2.5, "F")

    // Left Title Block
    doc.setFont("helvetica", "bold")
    doc.setFontSize(13)
    doc.setTextColor(255, 255, 255)
    doc.text(institutionName.toUpperCase(), headerX + 6, headerY + 8)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(8.5)
    doc.setTextColor(148, 163, 184) // slate-400
    doc.text("Department of Computer Science & Engineering", headerX + 6, headerY + 14)

    // Master / Class Scope Pill Badge
    const isMasterScope = selectedClassId === "all"
    const scopeBadgeText = isMasterScope
      ? `MASTER TIMETABLE • SECTION ${classIndex + 1} OF ${targetClasses.length}`
      : "OFFICIAL CLASS TIMETABLE"

    doc.setFontSize(7.5)
    doc.setFont("helvetica", "bold")
    doc.setFillColor(30, 41, 59) // slate-800
    doc.roundedRect(headerX + 6, headerY + 16.5, doc.getTextWidth(scopeBadgeText) + 6, 5, 1, 1, "F")
    doc.setTextColor(56, 189, 248) // sky-400
    doc.text(scopeBadgeText, headerX + 9, headerY + 20)

    // Right Meta Badges: Class & Section + Year
    const rightMargin = headerX + headerW - 6

    // Generated Time Stamp
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7.5)
    doc.setTextColor(148, 163, 184)
    doc.text(`Generated: ${timestamp}`, rightMargin, headerY + 8, { align: "right" })

    // Class Badges Box
    const classBadgeText = displaySection ? `${displayName}-${displaySection}` : displayName
    const yearBadgeText = displayYear ? `${displayYear}` : ""

    // Draw Class Badge
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    const classBoxWidth = doc.getTextWidth(`Class: ${classBadgeText}`) + 8
    const yearBoxWidth = yearBadgeText ? doc.getTextWidth(`Year: ${yearBadgeText}`) + 8 : 0

    let currentBadgeX = rightMargin

    if (yearBadgeText) {
      currentBadgeX -= yearBoxWidth
      doc.setFillColor(67, 56, 202) // Indigo-700
      doc.roundedRect(currentBadgeX, headerY + 12, yearBoxWidth, 7, 1.5, 1.5, "F")
      doc.setTextColor(255, 255, 255)
      doc.text(`Year: ${yearBadgeText}`, currentBadgeX + 4, headerY + 16.8)
      currentBadgeX -= 3 // spacing
    }

    currentBadgeX -= classBoxWidth
    doc.setFillColor(16, 185, 129) // Emerald-500
    doc.roundedRect(currentBadgeX, headerY + 12, classBoxWidth, 7, 1.5, 1.5, "F")
    doc.setTextColor(255, 255, 255)
    doc.text(`Class: ${classBadgeText}`, currentBadgeX + 4, headerY + 16.8)

    // ── Build Table Data with Clean Deduplicated Period Headers ──
    const headRow = [
      "Day",
      ...sortedPeriods.map((p) => {
        const timeStr = p.start && p.end ? `${p.start.slice(0, 5)} - ${p.end.slice(0, 5)}` : ""
        return `Period ${p.number}\n\n${timeStr}`
      }),
    ]

    const bodyRows = DAYS.map((day) => {
      const row: string[] = [day.name]
      sortedPeriods.forEach((period) => {
        const slot = classEntries.find(
          (e) => e.day === day.value && e.periodNumber === period.number
        )
        if (slot && slot.subject && slot.subject !== "Unassigned" && slot.subject !== "—") {
          let cellText = slot.subject
          if (slot.subjectCode) {
            cellText += ` [${slot.subjectCode}]`
          }
          if (slot.teacher && slot.teacher !== "Unassigned") {
            cellText += `\n\n${slot.teacher}`
          }
          row.push(cellText)
        } else {
          row.push("—")
        }
      })
      return row
    })

    autoTable(doc, {
      startY: 38,
      head: [headRow],
      body: bodyRows,
      theme: "grid",
      headStyles: {
        fillColor: [15, 23, 42], // slate-900
        textColor: [255, 255, 255],
        fontSize: 8.5,
        fontStyle: "bold",
        halign: "center",
        valign: "middle",
        cellPadding: 4,
        lineWidth: 0.15,
        lineColor: [51, 65, 85],
      },
      columnStyles: {
        0: {
          fontStyle: "bold",
          fillColor: [241, 245, 249], // slate-100
          textColor: [15, 23, 42],
          halign: "center",
          valign: "middle",
          cellWidth: 26,
        },
      },
      styles: {
        fontSize: 8,
        cellPadding: 3.5,
        valign: "middle",
        halign: "center",
        lineColor: [203, 213, 225],
        lineWidth: 0.2,
        textColor: [15, 23, 42],
        overflow: "linebreak",
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252], // slate-50
      },
      didParseCell: (data) => {
        // Apply subject pastel color coding to data cells
        if (data.section === "body" && data.column.index > 0) {
          const dayVal = DAYS[data.row.index]?.value
          const periodNum = sortedPeriods[data.column.index - 1]?.number

          const slot = classEntries.find(
            (e) => e.day === dayVal && e.periodNumber === periodNum
          )

          if (slot && slot.subject && slot.subject !== "Unassigned" && slot.subject !== "—") {
            const palette = getSubjectColorIndex(slot.subject, subjectColorMap)
            data.cell.styles.fillColor = palette.bg
            data.cell.styles.textColor = palette.text
            data.cell.styles.fontStyle = "bold"
          } else {
            data.cell.styles.textColor = [148, 163, 184] // muted dash
          }
        }
      },
      margin: { left: 14, right: 14 },
    })

    // ── Footer ──
    const pageCount = (doc as any).internal.getNumberOfPages()
    const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber
    doc.setFontSize(8)
    doc.setTextColor(148, 163, 184)
    doc.text(
      `Page ${currentPage} of ${pageCount} • Academic Timetable Management System • ${institutionName}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: "center" }
    )
  })

  const sanitizedLabel =
    selectedClassId === "all"
      ? "Master_Schedule_All_Classes"
      : targetClasses[0]?.fullLabel
        ? targetClasses[0].fullLabel.replace(/[^a-zA-Z0-9_-]/g, "_")
        : targetClasses[0]
          ? `${targetClasses[0].name}_${targetClasses[0].section}`.replace(/[^a-zA-Z0-9_-]/g, "_")
          : "Timetable"

  doc.save(`Timetable_${sanitizedLabel}.pdf`)
}

export function formatClassSection(className?: string, section?: string): string {
  let baseName = (className || "").trim()
  let sec = (section || "").trim()

  if (baseName.includes(" · ")) {
    baseName = baseName.split(" · ")[0].trim()
  } else if (baseName.includes(" • ")) {
    baseName = baseName.split(" • ")[0].trim()
  }

  if (sec && !baseName.toLowerCase().endsWith(sec.toLowerCase()) && !baseName.includes("-")) {
    return `${baseName}-${sec}`
  }
  return baseName || "Class"
}

export function formatYearLabel(year?: string, className?: string): string {
  let yr = (year || "").trim()
  if (!yr && className) {
    if (className.includes(" · ")) {
      yr = className.split(" · ")[1]?.trim() || ""
    } else if (className.includes(" • ")) {
      yr = className.split(" • ")[1]?.trim() || ""
    }
  }
  if (!yr) return ""
  return yr.toLowerCase().includes("year") ? yr : `${yr} Year`
}

export function formatClassCapsuleText(className?: string, section?: string, year?: string): string {
  const classSec = formatClassSection(className, section)
  const yr = formatYearLabel(year, className)
  return yr ? `${classSec}  |  ${yr}` : classSec
}

export function formatClassYearLabel(className?: string, section?: string, year?: string): string {
  const classSec = formatClassSection(className, section)
  const yr = formatYearLabel(year, className)
  return yr ? `${classSec} • ${yr}` : classSec
}

/**
 * Generates and downloads a clean, publication-ready PDF timetable for Teacher personal view.
 */
export function exportTeacherTimetablePDF({
  slots,
  teacherName = "Faculty Member",
  institutionName = "Faculty Weekly Schedule",
}: {
  slots: {
    dayOfWeek: number
    periodNumber: number
    startTime: string
    endTime: string
    subjectName: string
    subjectCode?: string
    className: string
    section: string
    year?: string
  }[]
  teacherName?: string
  institutionName?: string
}) {
  if (!slots || slots.length === 0) {
    throw new Error("No timetable slots available to export.")
  }

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  })

  const timestamp = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // Map unique subjects to colors
  const subjectColorMap = new Map<string, number>()
  const uniqueSubjects = Array.from(
    new Set(slots.map((s) => s.subjectName).filter((s) => s && s !== "—" && s !== "Unassigned"))
  )
  uniqueSubjects.forEach((s, i) => subjectColorMap.set(s, i % PDF_SUBJECT_COLORS.length))

  // Detect unique periods from slots or default 1..8
  const periodMap = new Map<number, { start: string; end: string }>()
  slots.forEach((s) => {
    if (!periodMap.has(s.periodNumber)) {
      periodMap.set(s.periodNumber, { start: s.startTime, end: s.endTime })
    }
  })

  const sortedPeriodNumbers =
    periodMap.size > 0
      ? Array.from(periodMap.keys()).sort((a, b) => a - b)
      : [1, 2, 3, 4, 5, 6, 7, 8]

  // ── Header Section ──
  const headerX = 14
  const headerY = 10
  const headerW = pageWidth - 28
  const headerH = 24

  // Dark slate container
  doc.setFillColor(15, 23, 42) // slate-900
  doc.roundedRect(headerX, headerY, headerW, headerH, 2.5, 2.5, "F")

  // Title
  doc.setFont("helvetica", "bold")
  doc.setFontSize(13)
  doc.setTextColor(255, 255, 255)
  doc.text("FACULTY WEEKLY ACADEMIC SCHEDULE", headerX + 6, headerY + 8)

  // Subtitle
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8.5)
  doc.setTextColor(148, 163, 184)
  doc.text("Department of Computer Science & Engineering", headerX + 6, headerY + 14)

  // Faculty Pill Badge
  const facultyBadgeText = `FACULTY: ${teacherName.toUpperCase()}`
  doc.setFontSize(8)
  doc.setFont("helvetica", "bold")
  doc.setFillColor(16, 185, 129) // Emerald-500
  const badgeW = doc.getTextWidth(facultyBadgeText) + 8
  doc.roundedRect(headerX + 6, headerY + 16.5, badgeW, 5.5, 1.2, 1.2, "F")
  doc.setTextColor(255, 255, 255)
  doc.text(facultyBadgeText, headerX + 10, headerY + 20.3)

  // Workload Pill next to Faculty
  const loadBadgeText = `${slots.length} LECTURES / WEEK`
  doc.setFillColor(51, 65, 85) // slate-700
  const loadBadgeX = headerX + 6 + badgeW + 3
  doc.roundedRect(loadBadgeX, headerY + 16.5, doc.getTextWidth(loadBadgeText) + 8, 5.5, 1.2, 1.2, "F")
  doc.setTextColor(226, 232, 240)
  doc.text(loadBadgeText, loadBadgeX + 4, headerY + 20.3)

  // Right Meta
  doc.setFont("helvetica", "normal")
  doc.setFontSize(7.5)
  doc.setTextColor(148, 163, 184)
  doc.text(`Generated: ${timestamp}`, headerX + headerW - 6, headerY + 8, { align: "right" })
  doc.text(`Official Academic Timetable`, headerX + headerW - 6, headerY + 14, { align: "right" })

  // ── Build Table Data with Clean Class & Period Headers ──
  const headRow = [
    "Day",
    ...sortedPeriodNumbers.map((pNum) => {
      const times = periodMap.get(pNum)
      const timeStr = times?.start && times?.end ? `${times.start.slice(0, 5)} – ${times.end.slice(0, 5)}` : ""
      return `Period ${pNum}\n\n${timeStr}`
    }),
  ]

  const bodyRows = DAYS.map((day) => {
    const row: string[] = [day.name]
    sortedPeriodNumbers.forEach((pNum) => {
      const slot = slots.find((s) => s.dayOfWeek === day.value && s.periodNumber === pNum)
      if (slot && slot.subjectName && slot.subjectName !== "—" && slot.subjectName !== "Unassigned") {
        const capsuleText = formatClassCapsuleText(slot.className, slot.section, slot.year)
        const codeStr = slot.subjectCode ? ` [${slot.subjectCode}]` : ""
        row.push(`${slot.subjectName}${codeStr}\n\n[ ${capsuleText} ]`)
      } else {
        row.push("—")
      }
    })
    return row
  })

  autoTable(doc, {
    startY: 38,
    head: [headRow],
    body: bodyRows,
    theme: "grid",
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: "bold",
      halign: "center",
      valign: "middle",
      cellPadding: 4,
      lineWidth: 0.15,
      lineColor: [51, 65, 85],
    },
    columnStyles: {
      0: {
        fontStyle: "bold",
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        halign: "center",
        valign: "middle",
        cellWidth: 26,
      },
    },
    styles: {
      fontSize: 8,
      cellPadding: 3.5,
      valign: "middle",
      halign: "center",
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
      textColor: [15, 23, 42],
      overflow: "linebreak",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index > 0) {
        const dayVal = DAYS[data.row.index]?.value
        const pNum = sortedPeriodNumbers[data.column.index - 1]
        const slot = slots.find((s) => s.dayOfWeek === dayVal && s.periodNumber === pNum)

        if (slot && slot.subjectName && slot.subjectName !== "—" && slot.subjectName !== "Unassigned") {
          const palette = getSubjectColorIndex(slot.subjectName, subjectColorMap)
          data.cell.styles.fillColor = palette.bg
          data.cell.styles.textColor = palette.text
          data.cell.styles.fontStyle = "bold"
        } else {
          data.cell.styles.textColor = [148, 163, 184]
        }
      }
    },
    margin: { left: 14, right: 14 },
  })

  // ── Course & Workload Summary Section Below Table (Structured Cards) ──
  const finalY = (doc as any).lastAutoTable?.finalY || 155
  if (finalY < pageHeight - 35) {
    const summaryY = finalY + 5
    const numSubjects = uniqueSubjects.length
    const cardsPerRow = Math.min(numSubjects, 3) || 1
    const cardGap = 4
    const cardW = (headerW - 8 - (cardsPerRow - 1) * cardGap) / cardsPerRow
    const cardH = 17
    const totalSummaryH = cardH + 11

    doc.setFillColor(248, 250, 252) // slate-50
    doc.setDrawColor(226, 232, 240) // slate-200
    doc.roundedRect(headerX, summaryY, headerW, totalSummaryH, 2, 2, "FD")

    // Summary header title
    doc.setFont("helvetica", "bold")
    doc.setFontSize(8)
    doc.setTextColor(15, 23, 42)
    doc.text("COURSE ALLOCATION & TEACHING LOAD SUMMARY", headerX + 5, summaryY + 5.5)

    // Total Load badge
    const totalLoadText = `Total Workload: ${slots.length} Periods / Week`
    doc.setFontSize(8)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(5, 150, 105) // emerald-600
    doc.text(totalLoadText, headerX + headerW - 5, summaryY + 5.5, { align: "right" })

    // Build subject aggregation items
    const subjectSummary = uniqueSubjects.map((subName) => {
      const subSlots = slots.filter((s) => s.subjectName === subName)
      const code = subSlots[0]?.subjectCode ? ` [${subSlots[0].subjectCode}]` : ""
      const cohortMap = new Map<string, string>()
      subSlots.forEach((s) => {
        const cSec = formatClassSection(s.className, s.section)
        const cYr = formatYearLabel(s.year, s.className)
        const key = `${cSec} | ${cYr}`
        cohortMap.set(key, cYr ? `${cSec} | ${cYr}` : cSec)
      })
      return {
        name: `${subName}${code}`,
        count: subSlots.length,
        cohorts: Array.from(cohortMap.values()),
        palette: getSubjectColorIndex(subName, subjectColorMap),
      }
    })

    // Render cards side by side
    const cardStartY = summaryY + 8
    subjectSummary.forEach((item, idx) => {
      if (idx >= cardsPerRow) return
      const cardX = headerX + 4 + idx * (cardW + cardGap)

      // Card background
      doc.setFillColor(...item.palette.bg)
      doc.setDrawColor(...item.palette.border)
      doc.roundedRect(cardX, cardStartY, cardW, cardH, 1.5, 1.5, "FD")

      // Dot + Subject Title
      doc.setFillColor(...item.palette.text)
      doc.roundedRect(cardX + 3.5, cardStartY + 3, 2.5, 2.5, 0.5, 0.5, "F")

      doc.setFont("helvetica", "bold")
      doc.setFontSize(7.5)
      doc.setTextColor(...item.palette.text)
      doc.text(item.name, cardX + 7.5, cardStartY + 5)

      // Period Count badge (right side of card)
      const countText = `${item.count} Periods / Wk`
      doc.setFontSize(7)
      doc.setTextColor(15, 23, 42)
      doc.text(countText, cardX + cardW - 3.5, cardStartY + 5, { align: "right" })

      // Cohort Chips
      let chipX = cardX + 3.5
      const chipY = cardStartY + 8.5
      const chipH = 5.2

      item.cohorts.forEach((cohortStr) => {
        doc.setFont("helvetica", "bold")
        doc.setFontSize(6.8)
        const textWidth = doc.getTextWidth(cohortStr)
        const chipW = textWidth + 5.5

        if (chipX + chipW < cardX + cardW - 2) {
          // Draw white capsule with clean border
          doc.setFillColor(255, 255, 255)
          doc.setDrawColor(203, 213, 225)
          doc.setLineWidth(0.15)
          doc.roundedRect(chipX, chipY, chipW, chipH, 1, 1, "FD")

          doc.setTextColor(30, 41, 59)
          doc.text(cohortStr, chipX + chipW / 2, chipY + 3.6, { align: "center" })

          chipX += chipW + 2
        }
      })
    })
  }

  // ── Footer ──
  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184)
  doc.text(
    `Faculty Academic Schedule • Generated via Faculty Portal • Confidential & Internal Use`,
    pageWidth / 2,
    pageHeight - 8,
    { align: "center" }
  )

  const sanitizedName = teacherName.replace(/[^a-zA-Z0-9_-]/g, "_")
  doc.save(`Weekly_Timetable_${sanitizedName}.pdf`)
}
