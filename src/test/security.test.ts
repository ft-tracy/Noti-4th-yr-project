// Access-control and business-rule tests, named after the Test Plan IDs.
import { describe, expect, it, beforeEach } from "vitest";
import type { Db, User } from "@/lib/noti/types";
import { makeSeed } from "@/lib/noti/seed";
import {
  bookSlot, cancelBooking, createNote, createSlot, editNote, getNote, issueLinkCode, markAttendance, notesFor,
  progressRatio, redeemLinkCode, setGoal, signNote, visibleStudents, weeklyRollup, EDIT_WINDOW_MS, LINK_CODE_TTL_MS, NotiError,
} from "@/lib/noti/service";
import { runSecurityChecks } from "@/lib/noti/security-checks";

let db: Db;
const u = (id: string) => db.users.find((x) => x.id === id) as User;
const forbidden = (fn: () => unknown) => expect(fn).toThrow(NotiError);

beforeEach(async () => { db = await makeSeed(); });

describe("Role-based access (RLS)", () => {
  it("RLS-01 teacher only sees assigned students", () => {
    expect(visibleStudents(db, u("u-t1")).map((s) => s.id).sort()).toEqual(["u-s1", "u-s3"]);
  });
  it("RLS-02 student only sees own notes", () => {
    expect(notesFor(db, u("u-s1"), "u-s2")).toEqual([]);
    expect(notesFor(db, u("u-s1"), "u-s1").every((n) => n.studentId === "u-s1")).toBe(true);
  });
  it("RLS-03 parent sees both linked children and nobody else", () => {
    expect(visibleStudents(db, u("u-p1")).map((s) => s.id).sort()).toEqual(["u-s1", "u-s2"]);
  });
  it("RLS-04 parent cannot edit a note", () => forbidden(() => editNote(db, u("u-p1"), "n3", { title: "a", body: "b" })));
  it("RLS-05 student B cannot fetch student A's note by id", () => expect(getNote(db, u("u-s2"), "n1")).toBeNull());
  it("RLS-06 unassigned teacher loses access", () => {
    const next = { ...db, enrolments: db.enrolments.filter((e) => e.studentId !== "u-s3") };
    expect(visibleStudents(next, u("u-t1")).map((s) => s.id)).toEqual(["u-s1"]);
  });
});

describe("Notes, signing and goals", () => {
  it("PRG-01 teacher note appears as pending for the student", () => {
    const next = createNote(db, u("u-t1"), { studentId: "u-s3", classId: "c-piano", title: "Scales", body: "G major" });
    expect(notesFor(next, u("u-s3"), "u-s3")).toHaveLength(1);
    expect(progressRatio(next, u("u-s3"), "u-s3")).toEqual({ signed: 0, total: 1, percent: 0 });
  });
  it("PRG-01 teacher cannot write for a learner outside their class", () =>
    forbidden(() => createNote(db, u("u-t1"), { studentId: "u-s2", classId: "c-piano", title: "x", body: "y" })));
  it("PRG-02 signing records signer and an audit event", () => {
    const next = signNote(db, u("u-s1"), "n3", 1000);
    expect(next.signatures.find((s) => s.noteId === "n3")).toMatchObject({ signerId: "u-s1", signedAt: 1000 });
    expect(next.audit.at(-1)).toMatchObject({ action: "note.signed", targetId: "n3" });
  });
  it("PRG-03 a note cannot be signed twice", () => {
    const once = signNote(db, u("u-s1"), "n3");
    forbidden(() => signNote(once, u("u-s1"), "n3"));
  });
  it("PRG-04 empty or over-long note is rejected", () => {
    forbidden(() => createNote(db, u("u-t1"), { studentId: "u-s1", classId: "c-piano", title: "x", body: "  " }));
    forbidden(() => createNote(db, u("u-t1"), { studentId: "u-s1", classId: "c-piano", title: "x", body: "a".repeat(4001) }));
  });
  it("PRG-05 goal ending before it starts is rejected", () =>
    forbidden(() => setGoal(db, u("u-t1"), { studentId: "u-s1", title: "Grade 3", startDate: "2026-12-01", targetDate: "2026-11-01" })));
  it("PRG-06 3 of 5 signed shows 60%", () => {
    let d = createNote(db, u("u-t1"), { studentId: "u-s1", classId: "c-piano", title: "a", body: "b" });
    d = createNote(d, u("u-t1"), { studentId: "u-s1", classId: "c-piano", title: "c", body: "d" });
    d = signNote(d, u("u-s1"), "n3");
    expect(progressRatio(d, u("u-p1"), "u-s1")).toEqual({ signed: 3, total: 5, percent: 60 });
  });
  it("notes can be edited within 24 hours but not after", () => {
    const now = db.notes.find((n) => n.id === "n3")!.createdAt;
    expect(() => editNote(db, u("u-t1"), "n3", { title: "ok", body: "ok" }, now + 1000)).not.toThrow();
    forbidden(() => editNote(db, u("u-t1"), "n3", { title: "late", body: "late" }, now + EDIT_WINDOW_MS + 1));
  });
  it("signed notes cannot be edited", () => {
    forbidden(() => editNote(signNote(db, u("u-s1"), "n3"), u("u-t1"), "n3", { title: "x", body: "y" }));
  });
});

describe("Parent linking", () => {
  it("code is 8 characters, single-use and expires after 7 days", () => {
    const { db: d, code } = issueLinkCode(db, u("u-t1"), "u-s3", 0);
    expect(code).toMatch(/^[A-Z2-9]{8}$/);
    expect(redeemLinkCode(d, u("u-p1"), code, LINK_CODE_TTL_MS + 1).error).toBeTruthy();
    const ok = redeemLinkCode(d, u("u-p1"), code, 1000);
    expect(ok.error).toBeUndefined();
    expect(redeemLinkCode(ok.db, u("u-p1"), code, 2000).error).toBeTruthy();
  });
  it("locks out after 5 wrong codes", () => {
    let d = db;
    for (let i = 0; i < 5; i++) d = redeemLinkCode(d, u("u-p1"), "ZZZZZZZZ", 1000).db;
    forbidden(() => redeemLinkCode(d, u("u-p1"), "ZZZZZZZZ", 1000));
  });
});

describe("Scheduling and attendance", () => {
  it("SCH-01/02 only one student can book a slot", () => {
    const d = bookSlot(db, u("u-s1"), "sl4");
    expect(d.slots.find((s) => s.id === "sl4")?.bookedBy).toBe("u-s1");
    forbidden(() => bookSlot(d, u("u-s3"), "sl4"));
  });
  it("SCH-03 cancelling frees the slot", () => {
    const d = cancelBooking(bookSlot(db, u("u-s1"), "sl4"), u("u-s1"), "sl4");
    expect(d.slots.find((s) => s.id === "sl4")?.bookedBy).toBeUndefined();
  });
  it("SCH-04 slots in the past cannot be booked or created", () => {
    forbidden(() => bookSlot({ ...db, slots: db.slots.map((s) => (s.id === "sl4" ? { ...s, start: 1 } : s)) }, u("u-s1"), "sl4"));
    forbidden(() => createSlot(db, u("u-t1"), { classId: "c-piano", start: Date.now() - 1000, durationMin: 45 }));
  });
  it("ATT-01/02 marking present updates the weekly rollup the parent sees", () => {
    expect(weeklyRollup(db, u("u-p1"), "u-s1")).toMatchObject({ present: 1, absent: 1, rate: 50 });
    const d = markAttendance(db, u("u-t1"), "sl2", "present");
    expect(weeklyRollup(d, u("u-p1"), "u-s1")).toMatchObject({ present: 2, absent: 0, rate: 100 });
  });
  it("ATT-03 teacher cannot mark another teacher's lesson", () => forbidden(() => markAttendance(db, u("u-t2"), "sl1", "present")));
});

describe("In-app security check", () => {
  it("every probe passes", async () => {
    const results = await runSecurityChecks();
    expect(results.filter((r) => !r.passed)).toEqual([]);
  });
});
