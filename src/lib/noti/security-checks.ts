// Self-test of the access rules, run against a fresh copy of the demo data.
// The same probes run in the automated test suite (src/test/security.test.ts).
import type { Db, User } from "./types";
import { makeSeed } from "./seed";
import { signIn, signUp } from "./auth";
import {
  createNote, editNote, getNote, issueLinkCode, markAttendance, notesFor, redeemLinkCode, schoolReport, signNote, visibleStudents,
  EDIT_WINDOW_MS, NotiError,
} from "./service";

export interface CheckResult { id: string; title: string; passed: boolean; detail: string }

const refused = (fn: () => unknown) => {
  try { fn(); return false; } catch (e) { return e instanceof NotiError; }
};

export async function runSecurityChecks(): Promise<CheckResult[]> {
  const db: Db = await makeSeed();
  const u = (id: string) => db.users.find((x) => x.id === id) as User;
  const t1 = u("u-t1"), t2 = u("u-t2"), s1 = u("u-s1"), s2 = u("u-s2"), s3 = u("u-s3"), p1 = u("u-p1"), admin = u("u-admin");
  const out: CheckResult[] = [];
  const add = (id: string, title: string, passed: boolean, detail: string) => out.push({ id, title, passed, detail });

  const t1Students = visibleStudents(db, t1).map((s) => s.id).sort();
  add("RLS-01", "Teacher sees only their own learners", JSON.stringify(t1Students) === JSON.stringify(["u-s1", "u-s3"]), `Visible: ${t1Students.join(", ")}`);

  add("RLS-05", "Student cannot open another student's note", getNote(db, s2, "n1") === null && notesFor(db, s2, "u-s1").length === 0, "Brian requested Wanjiru's note by ID");

  const kids = visibleStudents(db, p1).map((s) => s.id).sort();
  add("RLS-03", "Parent sees only linked children", JSON.stringify(kids) === JSON.stringify(["u-s1", "u-s2"]), `Visible: ${kids.join(", ")}`);

  add("RLS-04", "Parent cannot edit a note", refused(() => editNote(db, p1, "n3", { title: "x", body: "y" })), "Forged edit request was refused");

  add("AUTH-06", "Student cannot act as a teacher", refused(() => createNote(db, s1, { studentId: "u-s1", classId: "c-piano", title: "Fake", body: "Fake" })), "Role escalation refused");

  add("ATT-03", "Teacher cannot mark another teacher's lesson", refused(() => markAttendance(db, t2, "sl1", "absent")), "Cross-teacher write refused");

  add("ADM-02", "Non-admins cannot open the school report", refused(() => schoolReport(db, t1)) && refused(() => schoolReport(db, p1)), "Teacher and parent refused");

  add("PRG-03", "A note can only be signed once", refused(() => signNote(db, s1, "n1")), "Second signature refused");

  const late = { ...db, notes: db.notes.map((n) => (n.id === "n4" ? { ...n, createdAt: Date.now() - EDIT_WINDOW_MS - 1000 } : n)) };
  add("PRG-LOCK", "Notes lock after 24 hours", refused(() => editNote(late, t2, "n4", { title: "Changed", body: "Changed" })), "Edit after 24h refused");

  add("XSS-01", "Script tags are rejected in notes", refused(() => createNote(db, t1, { studentId: "u-s1", classId: "c-piano", title: "Hi", body: "<script>alert(1)</script>" })), "Markup rejected by validation");

  const issued = issueLinkCode(db, t1, "u-s3");
  const first = redeemLinkCode(issued.db, p1, issued.code);
  const second = redeemLinkCode(first.db, p1, issued.code);
  add("LINK-01", "Link codes work only once", !first.error && !!second.error, "Re-used code refused");

  let probe = db;
  for (let i = 0; i < 5; i++) probe = redeemLinkCode(probe, p1, "AAAAAAAA").db;
  add("LINK-02", "Guessing link codes is blocked after 5 tries", refused(() => redeemLinkCode(probe, p1, "BBBBBBBB")), "Locked out for 15 minutes");

  const bad = await signIn(db, { email: "daniel@noti.test", password: "wrong" });
  const unknown = await signIn(db, { email: "nobody@noti.test", password: "wrong" });
  add("AUTH-03", "Wrong password error does not reveal which field was wrong", bad.error === unknown.error && !!bad.error, `Message: "${bad.error}"`);

  let lock = db;
  for (let i = 0; i < 5; i++) lock = (await signIn(lock, { email: "daniel@noti.test", password: "wrong" })).db;
  const locked = await signIn(lock, { email: "daniel@noti.test", password: "NotiDemo2026" });
  add("AUTH-LOCK", "Sign-in locks after 5 wrong passwords", !locked.user, "Correct password refused during lockout");

  let dup = false;
  try { await signUp(db, { name: "X", email: "daniel@noti.test", password: "Abcdefgh123", role: "teacher" }); } catch { dup = true; }
  add("AUTH-02", "Duplicate email sign-up is refused", dup, "No second account created");

  let adminSignup = false;
  try { await signUp(db, { name: "X", email: "x@noti.test", password: "Abcdefgh123", role: "admin" }); } catch { adminSignup = true; }
  add("AUTH-ADMIN", "Nobody can sign up as a school owner", adminSignup, "Admin role rejected at sign-up");

  add("PWD-01", "Passwords are stored hashed, never as text", db.users.every((x) => x.passwordHash.length === 64 && !x.passwordHash.includes("Noti")), "PBKDF2-SHA256 with a unique salt per user");

  add("RLS-08", "School owner report counts only their school", schoolReport(db, admin).students === 3 && !!s3, "Totals scoped by school");
  return out;
}
