import { createClient } from "@supabase/supabase-js"
import fs from "fs"

const envContent = fs.readFileSync(".env.local", "utf8")
const env = Object.fromEntries(
  envContent
    .split("\n")
    .map(l => l.trim())
    .filter(l => l && !l.startsWith("#"))
    .map(l => {
      const idx = l.indexOf("=")
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim().replace(/^["']|["']$/g, "")]
    })
)

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runTests() {
  console.log("==========================================================================")
  console.log("   ATTENDGUARD — PERIOD/SUBJECT CONFLICT PREVENTION VERIFICATION SUITE   ")
  console.log("==========================================================================\n")

  let passedCount = 0
  let totalCount = 0

  function assert(condition, testName, details = "") {
    totalCount++
    if (condition) {
      console.log(`✅ [PASS] ${testName} ${details ? `(${details})` : ""}`)
      passedCount++
    } else {
      console.error(`❌ [FAIL] ${testName} ${details ? `(${details})` : ""}`)
    }
  }

  // Fetch teacher with at least TWO assigned subjects for the same class cohort
  const { data: assignments, error: asgnErr } = await supabase
    .from("teacher_assignments")
    .select(`
      teacher_id, class_id, subject_id,
      teachers ( id, is_active, users ( id, full_name ) ),
      classes ( id, name, section, year ),
      subjects ( id, name )
    `)

  if (asgnErr || !assignments || assignments.length === 0) {
    console.error("Failed to fetch teacher assignments:", asgnErr)
    process.exit(1)
  }

  // Find a teacher with multiple assignments
  const teacherClassMap = new Map()
  for (const a of assignments) {
    const key = `${a.teacher_id}__${a.class_id}`
    if (!teacherClassMap.has(key)) {
      teacherClassMap.set(key, [])
    }
    teacherClassMap.get(key).push(a)
  }

  let testTeacherId, testClassId, subjectId1, subjectName1, subjectId2, subjectName2

  for (const [key, list] of teacherClassMap.entries()) {
    if (list.length >= 2) {
      testTeacherId = list[0].teacher_id
      testClassId = list[0].class_id
      subjectId1 = list[0].subject_id
      subjectName1 = list[0].subjects?.name || "Subject 1"
      subjectId2 = list[1].subject_id
      subjectName2 = list[1].subjects?.name || "Subject 2"
      break
    }
  }

  // If no single teacher teaches 2 subjects for the same class in existing assignments, create a test assignment cleanly
  if (!subjectId2) {
    const asgn0 = assignments[0]
    testTeacherId = asgn0.teacher_id
    testClassId = asgn0.class_id
    subjectId1 = asgn0.subject_id
    subjectName1 = asgn0.subjects?.name || "Subject 1"

    const { data: otherSubjects } = await supabase
      .from("subjects")
      .select("id, name")
      .neq("id", subjectId1)
      .limit(1)

    if (otherSubjects && otherSubjects.length > 0) {
      subjectId2 = otherSubjects[0].id
      subjectName2 = otherSubjects[0].name
      // Insert temporary assignment for test
      await supabase.from("teacher_assignments").upsert({
        teacher_id: testTeacherId,
        class_id: testClassId,
        subject_id: subjectId2,
      }, { onConflict: "teacher_id,class_id,subject_id" })
    }
  }

  // Fetch timetable slots for Wednesday (DOW = 3)
  const { data: ttSlots } = await supabase
    .from("timetables")
    .select(`
      id, class_id, subject_id, teacher_id, period_id, day_of_week,
      period:periods(id, period_number),
      subject:subjects(id, name)
    `)
    .eq("day_of_week", 3)
    .eq("class_id", testClassId)
    .eq("teacher_id", testTeacherId)

  let period1 = ttSlots && ttSlots[0] ? ttSlots[0].period : null
  let period2 = ttSlots && ttSlots[1] ? ttSlots[1].period : null

  if (ttSlots && ttSlots.length >= 2) {
    subjectId1 = ttSlots[0].subject_id
    subjectName1 = ttSlots[0].subject?.name || "Subject 1"
    subjectId2 = ttSlots[1].subject_id
    subjectName2 = ttSlots[1].subject?.name || "Subject 2"
  }

  // Find another class with timetable slot on Monday (DOW 1)
  const { data: monSlot } = await supabase
    .from("timetables")
    .select("class_id, subject_id, period_id, period:periods(id, period_number)")
    .eq("teacher_id", testTeacherId)
    .eq("day_of_week", 1)
    .neq("class_id", testClassId)
    .limit(1)
    .maybeSingle()

  const otherClassId = monSlot?.class_id || null

  // Test dates:
  // testDateA: Wednesday (DOW 3) -> 2029-01-10
  // testDateB: Thursday (DOW 4) -> 2029-01-11
  // testDateConcurrent: Wednesday (DOW 3) -> 2029-01-17
  const testDateA = "2029-01-10"
  const testDateB = "2029-01-11"
  const testDateConcurrent = "2029-01-17"

  // Pre-test cleanup
  await supabase.from("attendance_sessions").delete().in("session_date", [testDateA, testDateB, testDateConcurrent])

  console.log(`Test Teacher: ${testTeacherId}`)
  console.log(`Test Class: ${testClassId}`)
  console.log(`Subject 1: ${subjectName1} (${subjectId1})`)
  console.log(`Subject 2: ${subjectName2} (${subjectId2})`)
  console.log(`Period 1: Period ${period1?.period_number} (${period1?.id})`)
  console.log(`Period 2: Period ${period2?.period_number} (${period2?.id})\n`)

  // ----------------------------------------------------
  // CASE A: First attendance for a logical lesson -> creates exactly 1 session
  // ----------------------------------------------------
  console.log("--- CASE A: First attendance for logical lesson ---")
  const { data: resA, error: errA } = await supabase.rpc("start_or_resume_qr_session", {
    p_teacher_id: testTeacherId,
    p_class_id: testClassId,
    p_subject_id: subjectId1,
    p_period_id: period1.id,
    p_session_date: testDateA,
  })
  assert(!errA && resA?.success && resA?.action === "created_active", "CASE A: Start new session cleanly", `Session ID: ${resA?.sessionId}`)

  const { data: rowsA } = await supabase
    .from("attendance_sessions")
    .select("id, status")
    .eq("teacher_id", testTeacherId)
    .eq("class_id", testClassId)
    .eq("subject_id", subjectId1)
    .eq("period_id", period1.id)
    .eq("session_date", testDateA)
  assert(rowsA?.length === 1 && rowsA[0].status === "active", "CASE A: Exactly 1 attendance_sessions row exists with status='active'")

  // ----------------------------------------------------
  // CASE B: Same teacher opens same subject/period/class/date again -> reuses same session_id
  // ----------------------------------------------------
  console.log("\n--- CASE B: Same subject reopened while active ---")
  const { data: resB, error: errB } = await supabase.rpc("start_or_resume_qr_session", {
    p_teacher_id: testTeacherId,
    p_class_id: testClassId,
    p_subject_id: subjectId1,
    p_period_id: period1.id,
    p_session_date: testDateA,
  })
  assert(
    !errB && resB?.success && resB?.action === "resumed_active" && resB?.sessionId === resA.sessionId,
    "CASE B: Reopening active session reuses SAME session_id",
    `Session ID: ${resB?.sessionId}`
  )

  // ----------------------------------------------------
  // CASE C: Same logical lesson finalized and reopened 5+ times -> still exactly 1 row
  // ----------------------------------------------------
  console.log("\n--- CASE C: Finalize & Reopen 5+ times ---")
  await supabase
    .from("attendance_sessions")
    .update({ status: "finalized", finalized_at: new Date().toISOString() })
    .eq("id", resA.sessionId)

  for (let i = 0; i < 5; i++) {
    const { data: resReopen } = await supabase.rpc("start_or_resume_qr_session", {
      p_teacher_id: testTeacherId,
      p_class_id: testClassId,
      p_subject_id: subjectId1,
      p_period_id: period1.id,
      p_session_date: testDateA,
    })
    assert(
      resReopen?.success && resReopen?.sessionId === resA.sessionId,
      `CASE C [iteration ${i + 1}]: Reopen iteration reuses same session_id`
    )
    // Re-finalize
    await supabase
      .from("attendance_sessions")
      .update({ status: "finalized", finalized_at: new Date().toISOString() })
      .eq("id", resA.sessionId)
  }

  const { data: rowsC } = await supabase
    .from("attendance_sessions")
    .select("id")
    .eq("teacher_id", testTeacherId)
    .eq("class_id", testClassId)
    .eq("subject_id", subjectId1)
    .eq("period_id", period1.id)
    .eq("session_date", testDateA)
  assert(rowsC?.length === 1, "CASE C: Still EXACTLY 1 database row after 5+ reopen cycles", `Count: ${rowsC?.length}`)

  // ----------------------------------------------------
  // CASE D: Different subject in same slot -> BLOCKED (0 new rows)
  // ----------------------------------------------------
  console.log("\n--- CASE D: Different subject in same slot (Slot Conflict) ---")
  const { data: resConflict, error: errConflict } = await supabase.rpc("start_or_resume_qr_session", {
    p_teacher_id: testTeacherId,
    p_class_id: testClassId,
    p_subject_id: subjectId2,
    p_period_id: period1.id,
    p_session_date: testDateA,
  })

  assert(
    !errConflict && resConflict?.success === false,
    "CASE D: Different subject request on occupied slot is blocked",
    `Action: ${resConflict?.action}, Message: ${resConflict?.message}`
  )

  const { data: rowsConflictCheck } = await supabase
    .from("attendance_sessions")
    .select("id, subject_id")
    .eq("teacher_id", testTeacherId)
    .eq("class_id", testClassId)
    .eq("period_id", period1.id)
    .eq("session_date", testDateA)
  assert(
    rowsConflictCheck?.length === 1 && rowsConflictCheck[0].subject_id === subjectId1,
    "CASE D: 0 new rows created and existing Subject 1 session untouched",
    `Total rows in slot: ${rowsConflictCheck?.length}`
  )

  // ----------------------------------------------------
  // CASE E: Different period -> allowed
  // ----------------------------------------------------
  console.log("\n--- CASE E: Different period is allowed ---")
  const { data: resPeriod2, error: errPeriod2 } = await supabase.rpc("start_or_resume_qr_session", {
    p_teacher_id: testTeacherId,
    p_class_id: testClassId,
    p_subject_id: subjectId2,
    p_period_id: period2.id,
    p_session_date: testDateA,
  })
  assert(
    !errPeriod2 && resPeriod2?.success && resPeriod2?.sessionId !== resA.sessionId,
    "CASE E: Different period creates a distinct authorized session",
    `Session ID: ${resPeriod2?.sessionId}`
  )

  // ----------------------------------------------------
  // CASE F: Different class on its authorized day -> allowed
  // ----------------------------------------------------
  console.log("\n--- CASE F: Different class is allowed ---")
  if (otherClassId && monSlot) {
    const testMonDate = "2029-01-08" // Monday
    const { data: resClass2, error: errClass2 } = await supabase.rpc("start_or_resume_qr_session", {
      p_teacher_id: testTeacherId,
      p_class_id: otherClassId,
      p_subject_id: monSlot.subject_id,
      p_period_id: monSlot.period_id,
      p_session_date: testMonDate,
    })
    assert(
      !errClass2 && resClass2?.success && resClass2?.sessionId !== resA.sessionId,
      "CASE F: Different class on authorized day does NOT trigger a conflict",
      `Session ID: ${resClass2?.sessionId}`
    )
  }

  // ----------------------------------------------------
  // CASE G: Different date with authorized slot -> allowed
  // ----------------------------------------------------
  console.log("\n--- CASE G: Different date is allowed ---")
  // On Thursday (2029-01-11, DOW 4), fetch authorized slot for testTeacherId, testClassId
  const { data: thuSlot } = await supabase
    .from("timetables")
    .select("class_id, subject_id, period_id")
    .eq("teacher_id", testTeacherId)
    .eq("class_id", testClassId)
    .eq("day_of_week", 4)
    .limit(1)
    .maybeSingle()

  if (thuSlot) {
    const { data: resDateB, error: errDateB } = await supabase.rpc("start_or_resume_qr_session", {
      p_teacher_id: testTeacherId,
      p_class_id: testClassId,
      p_subject_id: thuSlot.subject_id,
      p_period_id: thuSlot.period_id,
      p_session_date: testDateB,
    })
    assert(
      !errDateB && resDateB?.success && resDateB?.sessionId !== resA.sessionId,
      "CASE G: Different date creates a separate lesson session",
      `Session ID: ${resDateB?.sessionId}`
    )
  }

  // ----------------------------------------------------
  // CASE H: Concurrent same-subject starts -> exactly 1 session
  // ----------------------------------------------------
  console.log("\n--- CASE H: Concurrent same-subject requests ---")
  const concurrentSame = Array.from({ length: 8 }).map(() =>
    supabase.rpc("start_or_resume_qr_session", {
      p_teacher_id: testTeacherId,
      p_class_id: testClassId,
      p_subject_id: subjectId1,
      p_period_id: period1.id,
      p_session_date: testDateConcurrent,
    })
  )
  const resultsSame = await Promise.all(concurrentSame)
  const sessionIdsSame = new Set(resultsSame.map(r => r.data?.sessionId).filter(Boolean))

  const { data: rowsSameInDb } = await supabase
    .from("attendance_sessions")
    .select("id")
    .eq("teacher_id", testTeacherId)
    .eq("class_id", testClassId)
    .eq("subject_id", subjectId1)
    .eq("period_id", period1.id)
    .eq("session_date", testDateConcurrent)

  assert(
    sessionIdsSame.size === 1 && rowsSameInDb?.length === 1,
    "CASE H: 8 concurrent same-subject requests resolve to EXACTLY 1 session row",
    `Unique IDs returned: ${sessionIdsSame.size}, DB rows: ${rowsSameInDb?.length}`
  )

  // ----------------------------------------------------
  // CASE I: Concurrent DIFFERENT-subject requests for same slot -> exactly 1 session wins, other gets slot_conflict
  // ----------------------------------------------------
  console.log("\n--- CASE I: Concurrent conflicting different-subject requests ---")
  // Clean slot for test
  await supabase.from("attendance_sessions").delete().eq("session_date", testDateConcurrent)

  const mixedPromises = [
    supabase.rpc("start_or_resume_qr_session", {
      p_teacher_id: testTeacherId,
      p_class_id: testClassId,
      p_subject_id: subjectId1,
      p_period_id: period1.id,
      p_session_date: testDateConcurrent,
    }),
    supabase.rpc("start_or_resume_qr_session", {
      p_teacher_id: testTeacherId,
      p_class_id: testClassId,
      p_subject_id: subjectId2,
      p_period_id: period1.id,
      p_session_date: testDateConcurrent,
    }),
    supabase.rpc("start_or_resume_qr_session", {
      p_teacher_id: testTeacherId,
      p_class_id: testClassId,
      p_subject_id: subjectId1,
      p_period_id: period1.id,
      p_session_date: testDateConcurrent,
    }),
    supabase.rpc("start_or_resume_qr_session", {
      p_teacher_id: testTeacherId,
      p_class_id: testClassId,
      p_subject_id: subjectId2,
      p_period_id: period1.id,
      p_session_date: testDateConcurrent,
    }),
  ]

  const mixedResults = await Promise.all(mixedPromises)
  const createdOrResumed = mixedResults.filter(r => r.data?.success === true)
  const blocked = mixedResults.filter(r => r.data?.success === false)

  const { data: rowsMixedInDb } = await supabase
    .from("attendance_sessions")
    .select("id, subject_id")
    .eq("teacher_id", testTeacherId)
    .eq("class_id", testClassId)
    .eq("period_id", period1.id)
    .eq("session_date", testDateConcurrent)

  assert(
    rowsMixedInDb?.length === 1,
    "CASE I: Exactly 1 database session exists in the occupied slot",
    `DB rows: ${rowsMixedInDb?.length}`
  )
  assert(
    blocked.length > 0,
    "CASE I: Unauthorized/Conflicting requests were safely blocked",
    `Blocked requests: ${blocked.length}`
  )

  // ----------------------------------------------------
  // CASE J, K, L, M: Period Attendance, Overrides, and Biometric Evidence Non-Regression
  // ----------------------------------------------------
  console.log("\n--- CASE J, K, L, M: Attendance Decision, Override, & Biometric Evidence ---")
  const { data: students } = await supabase.from("students").select("id").eq("class_id", testClassId).limit(1)
  if (students && students.length > 0) {
    const studentId = students[0].id
    const targetSessionId = rowsMixedInDb && rowsMixedInDb.length > 0 ? rowsMixedInDb[0].id : resA.sessionId

    // Initial student record: present with face_verified = true
    await supabase.from("period_attendance").delete().eq("session_id", targetSessionId)
    await supabase.from("period_attendance").insert({
      session_id: targetSessionId,
      student_id: studentId,
      status: "present",
      face_verified: true,
    })

    // CASE K: Present -> Absent override
    await supabase.from("period_attendance").upsert({
      session_id: targetSessionId,
      student_id: studentId,
      status: "absent",
      override_by_teacher: true,
      override_reason: "Left early",
    }, { onConflict: "session_id,student_id" })

    const { data: pa1 } = await supabase
      .from("period_attendance")
      .select("*")
      .eq("session_id", targetSessionId)
      .eq("student_id", studentId)
    assert(pa1?.length === 1 && pa1[0].status === "absent", "CASE K: Present -> Absent updated in-place (No duplicate record)")
    assert(pa1[0].face_verified === true, "CASE M: face_verified remains preserved as evidence when status=absent")

    // CASE L: Absent -> Present override
    await supabase.from("period_attendance").upsert({
      session_id: targetSessionId,
      student_id: studentId,
      status: "present",
      override_by_teacher: true,
      override_reason: "Verified by teacher",
    }, { onConflict: "session_id,student_id" })

    const { data: pa2 } = await supabase
      .from("period_attendance")
      .select("*")
      .eq("session_id", targetSessionId)
      .eq("student_id", studentId)
    assert(pa2?.length === 1 && pa2[0].status === "present", "CASE L: Absent -> Present updated in-place (No duplicate record)")
  }

  // ----------------------------------------------------
  // CASE S: Unauthorized Teacher Attempt
  // ----------------------------------------------------
  console.log("\n--- CASE S: Unauthorized Teacher Access ---")
  const { data: allTeachers } = await supabase.from("teachers").select("id").neq("id", testTeacherId).limit(5)
  let unauthorizedTeacherId = null
  for (const t of (allTeachers || [])) {
    const { data: unauthCheck } = await supabase
      .from("teacher_assignments")
      .select("id")
      .eq("teacher_id", t.id)
      .eq("class_id", testClassId)
      .eq("subject_id", subjectId1)
    if (!unauthCheck || unauthCheck.length === 0) {
      unauthorizedTeacherId = t.id
      break
    }
  }

  if (unauthorizedTeacherId) {
    const { data: unauthRes, error: unauthErr } = await supabase.rpc("start_or_resume_qr_session", {
      p_teacher_id: unauthorizedTeacherId,
      p_class_id: testClassId,
      p_subject_id: subjectId1,
      p_period_id: period1.id,
      p_session_date: testDateA,
    })
    assert(
      (unauthRes?.success === false && unauthRes?.action === "timetable_not_authorized") || (unauthErr && unauthErr.message.includes("Forbidden")),
      "CASE S: Unauthorized teacher rejected with timetable_not_authorized / Forbidden",
      `Result: ${unauthRes?.action || unauthErr?.message}`
    )
  }

  // ----------------------------------------------------
  // Database Trigger Direct Protection Test
  // ----------------------------------------------------
  console.log("\n--- Database Trigger Protection ---")
  const { error: rawInsertErr } = await supabase.from("attendance_sessions").insert({
    teacher_id: testTeacherId,
    class_id: testClassId,
    subject_id: subjectId2,
    period_id: period1.id,
    session_date: testDateA,
    status: "active",
  })
  assert(
    rawInsertErr !== null && rawInsertErr.message.includes("Conflict"),
    "Database trigger blocks raw conflicting INSERTs directly",
    `Trigger message: ${rawInsertErr?.message}`
  )

  // Cleanup test dates
  await supabase.from("attendance_sessions").delete().in("session_date", [testDateA, testDateB, testDateConcurrent])

  console.log(`\n==========================================================================`)
  console.log(`FINAL RESULT: ${passedCount} / ${totalCount} TESTS PASSED`)
  console.log(`==========================================================================`)
}

runTests().catch(err => {
  console.error("Test runner crashed:", err)
  process.exit(1)
})
