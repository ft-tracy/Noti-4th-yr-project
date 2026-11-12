// Business rules and access policies. Every function receives the acting user and
// refuses anything that user's role is not allowed to do — the same checks the
// database Row-Level Security policies will enforce once a server is connected.
import type { Attendance, AttendanceStatus, Db, ProgressNote, Role, User } from "./types";
import {
  LINK_CODE_ALPHABET,
  goalSchema,
  homeworkSchema,
  linkCodeSchema,
  noteEditSchema,
  noteSchema,
  repertoireSchema,
  slotSchema,
} from "./validation";

export class NotiError extends Error {
  constructor(
    message: string,
    public code: "forbidden" | "not_found" | "invalid" | "conflict" | "rate_limited" = "invalid",
  ) {
    super(message);
  }
}

export const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;
export const LINK_CODE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;

const uid = () => crypto.randomUUID();
const deny = (msg = "You do not have access to this record"): never => {
  throw new NotiError(msg, "forbidden");
};
const parse = <T>(schema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false; error: { issues: { message: string }[] } } }, v: unknown): T => {
  const r = schema.safeParse(v);
  if (!r.success) throw new NotiError(r.error.issues[0]?.message ?? "Invalid input", "invalid");
  return r.data;
};
function requireRole(actor: User, ...roles: Role[]) {
  if (!roles.includes(actor.role)) deny("Your role cannot perform this action");
}
function audit(db: Db, actor: User, action: string, targetId: string, now: number): Db {
  return { ...db, audit: [...db.audit, { id: uid(), at: now, actorId: actor.id, action, targetId }] };
}

// ---------- Visibility policies ----------
export function teacherStudentIds(db: Db, teacherId: string): Set<string> {
  const classIds = new Set(db.classes.filter((c) => c.teacherId === teacherId).map((c) => c.id));
  return new Set(db.enrolments.filter((e) => classIds.has(e.classId)).map((e) => e.studentId));
}
export function parentChildIds(db: Db, parentId: string): string[] {
  return db.parentLinks.filter((l) => l.parentId === parentId).map((l) => l.studentId);
}
export function canViewStudent(db: Db, actor: User, studentId: string): boolean {
  const student = db.users.find((u) => u.id === studentId && u.role === "student");
  if (!student) return false;
  switch (actor.role) {
    case "student":
      return actor.id === studentId;
    case "teacher":
      return teacherStudentIds(db, actor.id).has(studentId);
    case "parent":
      return parentChildIds(db, actor.id).includes(studentId);
    case "admin":
      return actor.schoolId === student.schoolId;
  }
}
export function visibleStudents(db: Db, actor: User): User[] {
  return db.users.filter((u) => u.role === "student" && canViewStudent(db, actor, u.id));
}
export function getNote(db: Db, actor: User, noteId: string): ProgressNote | null {
  const n = db.notes.find((x) => x.id === noteId);
  if (!n || !canViewStudent(db, actor, n.studentId)) return null; // never reveal existence
  return n;
}
export function notesFor(db: Db, actor: User, studentId: string): ProgressNote[] {
  if (!canViewStudent(db, actor, studentId)) return [];
  return db.notes
    .filter((n) => n.studentId === studentId && (n.status === "sent" || actor.role === "teacher"))
    .sort((a, b) => b.createdAt - a.createdAt);
}
export function signatureFor(db: Db, noteId: string) {
  return db.signatures.find((s) => s.noteId === noteId);
}
export function progressRatio(db: Db, actor: User, studentId: string) {
  const notes = notesFor(db, actor, studentId).filter((n) => n.status === "sent");
  const signed = notes.filter((n) => signatureFor(db, n.id)).length;
  return { signed, total: notes.length, percent: notes.length ? Math.round((signed / notes.length) * 100) : 0 };
}

// ---------- Notes and signing ----------
export function createNote(db: Db, actor: User, input: unknown, now = Date.now()): Db {
  requireRole(actor, "teacher");
  const data = parse(noteSchema, input);
  const cls = db.classes.find((c) => c.id === data.classId);
  if (!cls || cls.teacherId !== actor.id) deny("You can only write notes for your own classes");
  if (!db.enrolments.some((e) => e.classId === data.classId && e.studentId === data.studentId))
    deny("That learner is not in this class");
  const note: ProgressNote = { id: uid(), teacherId: actor.id, status: "sent", createdAt: now, ...data };
  return audit({ ...db, notes: [...db.notes, note] }, actor, "note.sent", note.id, now);
}

export function canEditNote(db: Db, actor: User, note: ProgressNote, now = Date.now()) {
  return (
    actor.id === note.teacherId &&
    note.status === "sent" &&
    !signatureFor(db, note.id) &&
    now - note.createdAt < EDIT_WINDOW_MS
  );
}
export function editNote(db: Db, actor: User, noteId: string, input: unknown, now = Date.now()): Db {
  const note = getNote(db, actor, noteId) ?? deny();
  if (!canEditNote(db, actor, note, now)) deny("Notes can only be edited by their author, within 24 hours and before signing");
  const data = parse(noteEditSchema, input);
  return audit(
    { ...db, notes: db.notes.map((n) => (n.id === noteId ? { ...n, ...data, editedAt: now } : n)) },
    actor, "note.edited", noteId, now,
  );
}
export function withdrawNote(db: Db, actor: User, noteId: string, now = Date.now()): Db {
  const note = getNote(db, actor, noteId) ?? deny();
  if (note.teacherId !== actor.id) deny("Only the author can withdraw a note");
  if (note.status === "withdrawn") throw new NotiError("Already withdrawn", "conflict");
  return audit(
    { ...db, notes: db.notes.map((n) => (n.id === noteId ? { ...n, status: "withdrawn" as const } : n)) },
    actor, "note.withdrawn", noteId, now,
  );
}
export function signNote(db: Db, actor: User, noteId: string, now = Date.now()): Db {
  requireRole(actor, "student");
  const note = getNote(db, actor, noteId) ?? deny();
  if (note.studentId !== actor.id) deny();
  if (note.status !== "sent") throw new NotiError("This note was withdrawn", "conflict");
  if (signatureFor(db, noteId)) throw new NotiError("You have already signed this note", "conflict");
  // Signature and audit row are written together: one never exists without the other.
  const next = { ...db, signatures: [...db.signatures, { id: uid(), noteId, signerId: actor.id, signedAt: now }] };
  return audit(next, actor, "note.signed", noteId, now);
}

// ---------- Goals, homework, repertoire ----------
function requireTeacherOf(db: Db, actor: User, studentId: string) {
  requireRole(actor, "teacher");
  if (!teacherStudentIds(db, actor.id).has(studentId)) deny("This learner is not in any of your classes");
}
export function setGoal(db: Db, actor: User, input: unknown, now = Date.now()): Db {
  const data = parse(goalSchema, input);
  requireTeacherOf(db, actor, data.studentId);
  const goal = { id: uid(), teacherId: actor.id, achieved: false, ...data };
  return audit({ ...db, goals: [...db.goals, goal] }, actor, "goal.set", goal.id, now);
}
export function toggleGoal(db: Db, actor: User, goalId: string): Db {
  const g = db.goals.find((x) => x.id === goalId) ?? deny();
  requireTeacherOf(db, actor, g.studentId);
  return { ...db, goals: db.goals.map((x) => (x.id === goalId ? { ...x, achieved: !x.achieved } : x)) };
}
export function assignHomework(db: Db, actor: User, input: unknown, now = Date.now()): Db {
  const data = parse(homeworkSchema, input);
  requireTeacherOf(db, actor, data.studentId);
  const hw = { id: uid(), teacherId: actor.id, ...data };
  return audit({ ...db, homework: [...db.homework, hw] }, actor, "homework.assigned", hw.id, now);
}
export function toggleHomework(db: Db, actor: User, homeworkId: string, now = Date.now()): Db {
  requireRole(actor, "student");
  const hw = db.homework.find((h) => h.id === homeworkId);
  if (!hw || hw.studentId !== actor.id) deny();
  return {
    ...db,
    homework: db.homework.map((h) => (h.id === homeworkId ? { ...h, completedAt: h.completedAt ? undefined : now } : h)),
  };
}
export function addRepertoire(db: Db, actor: User, input: unknown): Db {
  const data = parse(repertoireSchema, input);
  requireTeacherOf(db, actor, data.studentId);
  return { ...db, repertoire: [...db.repertoire, { id: uid(), status: "learning", ...data }] };
}
export function advanceRepertoire(db: Db, actor: User, itemId: string): Db {
  const item = db.repertoire.find((r) => r.id === itemId) ?? deny();
  requireTeacherOf(db, actor, item.studentId);
  const next = { learning: "polishing", polishing: "mastered", mastered: "learning" } as const;
  return { ...db, repertoire: db.repertoire.map((r) => (r.id === itemId ? { ...r, status: next[r.status] } : r)) };
}

// ---------- Parent linking ----------
function randomCode(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => LINK_CODE_ALPHABET[b % LINK_CODE_ALPHABET.length]).join("");
}
export function issueLinkCode(db: Db, actor: User, studentId: string, now = Date.now()): { db: Db; code: string } {
  requireTeacherOf(db, actor, studentId);
  let code = randomCode();
  while (db.linkCodes.some((c) => c.code === code)) code = randomCode();
  const next = { ...db, linkCodes: [...db.linkCodes, { code, studentId, issuedBy: actor.id, expiresAt: now + LINK_CODE_TTL_MS }] };
  return { db: audit(next, actor, "link_code.issued", studentId, now), code };
}
export function isLockedOut(db: Db, key: string, now = Date.now()) {
  return db.failedAttempts.filter((f) => f.key === key && now - f.at < LOCKOUT_WINDOW_MS).length >= MAX_FAILED_ATTEMPTS;
}
export function recordFailure(db: Db, key: string, now = Date.now()): Db {
  return { ...db, failedAttempts: [...db.failedAttempts.filter((f) => now - f.at < LOCKOUT_WINDOW_MS), { key, at: now }] };
}
/** Returns the new db; on a bad code returns the db with the failure recorded plus an error message. */
export function redeemLinkCode(db: Db, actor: User, rawCode: string, now = Date.now()): { db: Db; error?: string } {
  requireRole(actor, "parent");
  const key = `link:${actor.id}`;
  if (isLockedOut(db, key, now)) throw new NotiError("Too many wrong codes. Try again in 15 minutes.", "rate_limited");
  const fail = (error: string) => ({ db: recordFailure(db, key, now), error });
  const parsed = linkCodeSchema.safeParse(rawCode);
  if (!parsed.success) return fail("That code is not valid");
  const lc = db.linkCodes.find((c) => c.code === parsed.data);
  // Same message for unknown, used and expired codes so codes cannot be probed.
  if (!lc || lc.usedAt || lc.expiresAt <= now) return fail("That code is not valid or has expired");
  if (db.parentLinks.some((l) => l.parentId === actor.id && l.studentId === lc.studentId))
    return { db, error: "This child is already linked to your account" };
  const next: Db = {
    ...db,
    linkCodes: db.linkCodes.map((c) => (c.code === lc.code ? { ...c, usedAt: now, usedBy: actor.id } : c)),
    parentLinks: [...db.parentLinks, { parentId: actor.id, studentId: lc.studentId, verifiedAt: now }],
  };
  return { db: audit(next, actor, "parent.linked", lc.studentId, now) };
}

// ---------- Scheduling and attendance ----------
export function createSlot(db: Db, actor: User, input: unknown, now = Date.now()): Db {
  requireRole(actor, "teacher");
  const data = parse(slotSchema, input);
  const cls = db.classes.find((c) => c.id === data.classId);
  if (!cls || cls.teacherId !== actor.id) deny("You can only add slots to your own classes");
  if (data.start <= now) throw new NotiError("Slots must be in the future", "invalid");
  const end = data.start + data.durationMin * 60000;
  const clash = db.slots.some(
    (s) => s.teacherId === actor.id && data.start < s.start + s.durationMin * 60000 && s.start < end,
  );
  if (clash) throw new NotiError("This overlaps another of your slots", "conflict");
  return { ...db, slots: [...db.slots, { id: uid(), teacherId: actor.id, ...data }] };
}
export function bookSlot(db: Db, actor: User, slotId: string, now = Date.now()): Db {
  requireRole(actor, "student");
  const slot = db.slots.find((s) => s.id === slotId) ?? deny();
  if (!db.enrolments.some((e) => e.classId === slot.classId && e.studentId === actor.id))
    deny("You can only book slots in your own classes");
  if (slot.start <= now) throw new NotiError("You cannot book a slot in the past", "invalid");
  if (slot.bookedBy) throw new NotiError("Sorry, this slot was just taken", "conflict");
  return audit(
    { ...db, slots: db.slots.map((s) => (s.id === slotId ? { ...s, bookedBy: actor.id } : s)) },
    actor, "slot.booked", slotId, now,
  );
}
export function cancelBooking(db: Db, actor: User, slotId: string, now = Date.now()): Db {
  const slot = db.slots.find((s) => s.id === slotId) ?? deny();
  const isOwnerTeacher = actor.role === "teacher" && slot.teacherId === actor.id;
  if (slot.bookedBy !== actor.id && !isOwnerTeacher) deny();
  return audit(
    { ...db, slots: db.slots.map((s) => (s.id === slotId ? { ...s, bookedBy: undefined } : s)) },
    actor, "slot.cancelled", slotId, now,
  );
}
export function markAttendance(db: Db, actor: User, slotId: string, status: AttendanceStatus, now = Date.now()): Db {
  requireRole(actor, "teacher");
  const slot = db.slots.find((s) => s.id === slotId) ?? deny();
  if (slot.teacherId !== actor.id) deny("You can only mark your own lessons");
  if (!slot.bookedBy) throw new NotiError("Nobody is booked into this lesson", "invalid");
  const existing = db.attendance.find((a) => a.slotId === slotId);
  const rec: Attendance = { id: existing?.id ?? uid(), slotId, studentId: slot.bookedBy, status, markedBy: actor.id, markedAt: now };
  return audit(
    { ...db, attendance: existing ? db.attendance.map((a) => (a.id === rec.id ? rec : a)) : [...db.attendance, rec] },
    actor, "attendance.marked", slotId, now,
  );
}
export function weeklyRollup(db: Db, actor: User, studentId: string, now = Date.now()) {
  if (!canViewStudent(db, actor, studentId)) return { present: 0, absent: 0, excused: 0, rate: 0 };
  const since = now - 7 * 24 * 60 * 60 * 1000;
  const recs = db.attendance.filter((a) => {
    const slot = db.slots.find((s) => s.id === a.slotId);
    return a.studentId === studentId && slot && slot.start >= since && slot.start <= now;
  });
  const count = (s: AttendanceStatus) => recs.filter((r) => r.status === s).length;
  const present = count("present");
  return { present, absent: count("absent"), excused: count("excused"), rate: recs.length ? Math.round((present / recs.length) * 100) : 0 };
}

// ---------- Admin ----------
export function schoolReport(db: Db, actor: User) {
  requireRole(actor, "admin");
  const users = db.users.filter((u) => u.schoolId === actor.schoolId);
  const studentIds = new Set(users.filter((u) => u.role === "student").map((u) => u.id));
  const notes = db.notes.filter((n) => studentIds.has(n.studentId) && n.status === "sent");
  const signed = notes.filter((n) => signatureFor(db, n.id)).length;
  const att = db.attendance.filter((a) => studentIds.has(a.studentId));
  return {
    teachers: users.filter((u) => u.role === "teacher").length,
    students: studentIds.size,
    parents: users.filter((u) => u.role === "parent").length,
    notes: notes.length,
    signedPercent: notes.length ? Math.round((signed / notes.length) * 100) : 0,
    attendanceRate: att.length ? Math.round((att.filter((a) => a.status === "present").length / att.length) * 100) : 0,
  };
}
export function enrolStudent(db: Db, actor: User, classId: string, studentEmail: string): Db {
  requireRole(actor, "teacher", "admin");
  const cls = db.classes.find((c) => c.id === classId) ?? deny();
  if (actor.role === "teacher" && cls.teacherId !== actor.id) deny();
  if (actor.role === "admin" && cls.schoolId !== actor.schoolId) deny();
  const student = db.users.find((u) => u.email === studentEmail.trim().toLowerCase() && u.role === "student");
  if (!student) throw new NotiError("No student account uses that email", "not_found");
  if (db.enrolments.some((e) => e.classId === classId && e.studentId === student.id))
    throw new NotiError("Already enrolled", "conflict");
  return { ...db, enrolments: [...db.enrolments, { classId, studentId: student.id }] };
}
export function createClass(db: Db, actor: User, name: string, instrument: string, termFeeKes: number): Db {
  requireRole(actor, "teacher");
  if (!name.trim() || /[<>]/.test(name + instrument) || name.length > 80) throw new NotiError("Enter a valid class name");
  if (!Number.isFinite(termFeeKes) || termFeeKes < 0 || termFeeKes > 1_000_000) throw new NotiError("Enter a valid fee");
  return {
    ...db,
    classes: [...db.classes, { id: uid(), schoolId: actor.schoolId, teacherId: actor.id, name: name.trim(), instrument: instrument.trim() || "Piano", context: "private", termFeeKes }],
  };
}
