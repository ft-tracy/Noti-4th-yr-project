// Invented demo data only (Test Plan: no real learner data before the pilot).
import type { Db, User } from "./types";
import { hashPassword, newSalt } from "./auth";

export const DEMO_PASSWORD = "NotiDemo2026";
const DAY = 86400000;

export async function makeSeed(now = Date.now()): Promise<Db> {
  const school = { id: "school-1", name: "Kilimani Music Studio" };
  const mk = async (id: string, name: string, email: string, role: User["role"]): Promise<User> => {
    const salt = newSalt();
    return { id, name, email, role, schoolId: school.id, salt, passwordHash: await hashPassword(DEMO_PASSWORD, salt), createdAt: now - 60 * DAY };
  };
  const users = await Promise.all([
    mk("u-admin", "Grace Wanjiku", "owner@noti.test", "admin"),
    mk("u-t1", "Mr. Daniel Otieno", "daniel@noti.test", "teacher"),
    mk("u-t2", "Ms. Amina Hassan", "amina@noti.test", "teacher"),
    mk("u-s1", "Wanjiru Kamau", "wanjiru@noti.test", "student"),
    mk("u-s2", "Brian Kamau", "brian@noti.test", "student"),
    mk("u-s3", "Zawadi Mwangi", "zawadi@noti.test", "student"),
    mk("u-p1", "Mrs. Lucy Kamau", "lucy@noti.test", "parent"),
  ]);
  const hourAt = (dayOffset: number, h: number) => {
    const d = new Date(now + dayOffset * DAY);
    d.setHours(h, 0, 0, 0);
    return d.getTime();
  };
  const iso = (offset: number) => new Date(now + offset * DAY).toISOString().slice(0, 10);
  return {
    version: 1,
    schools: [school],
    users,
    classes: [
      { id: "c-piano", schoolId: school.id, teacherId: "u-t1", name: "Piano Grade 3", instrument: "Piano", context: "school", termFeeKes: 18000 },
      { id: "c-violin", schoolId: school.id, teacherId: "u-t2", name: "Violin Beginners", instrument: "Violin", context: "private", termFeeKes: 15000 },
    ],
    enrolments: [
      { classId: "c-piano", studentId: "u-s1" },
      { classId: "c-piano", studentId: "u-s3" },
      { classId: "c-violin", studentId: "u-s2" },
    ],
    notes: [
      { id: "n1", classId: "c-piano", teacherId: "u-t1", studentId: "u-s1", title: "C major scale, hands together", body: "Good evenness in the right hand. Left hand thumb-under still rushing. Practise slowly at 60 bpm, 10 minutes a day.", status: "sent", createdAt: now - 9 * DAY },
      { id: "n2", classId: "c-piano", teacherId: "u-t1", studentId: "u-s1", title: "Minuet in G - bars 1 to 16", body: "Notes are secure. Work on phrasing: lift at the end of each 4-bar phrase.", status: "sent", createdAt: now - 5 * DAY },
      { id: "n3", classId: "c-piano", teacherId: "u-t1", studentId: "u-s1", title: "Sight-reading and dynamics", body: "Read two short pieces. Watch for piano/forte markings before you start playing.", status: "sent", createdAt: now - 2 * 3600000 },
      { id: "n4", classId: "c-violin", teacherId: "u-t2", studentId: "u-s2", title: "Bow hold and open strings", body: "Bow hold is relaxed now. Keep the bow parallel to the bridge on the D and A strings.", status: "sent", createdAt: now - 4 * DAY },
    ],
    signatures: [
      { id: "sg1", noteId: "n1", signerId: "u-s1", signedAt: now - 8 * DAY },
      { id: "sg2", noteId: "n2", signerId: "u-s1", signedAt: now - 4 * DAY },
    ],
    goals: [
      { id: "g1", studentId: "u-s1", teacherId: "u-t1", title: "Pass ABRSM Grade 3 Piano", startDate: iso(-30), targetDate: iso(60), achieved: false },
      { id: "g2", studentId: "u-s2", teacherId: "u-t2", title: "Play Twinkle variations with clean bowing", startDate: iso(-14), targetDate: iso(30), achieved: false },
    ],
    homework: [
      { id: "h1", studentId: "u-s1", teacherId: "u-t1", title: "C major scale, 10 min daily", dueDate: iso(3), noteId: "n1" },
      { id: "h2", studentId: "u-s1", teacherId: "u-t1", title: "Minuet bars 1-16 with phrasing", dueDate: iso(5), goalId: "g1", completedAt: now - DAY },
      { id: "h3", studentId: "u-s2", teacherId: "u-t2", title: "Open strings with a mirror, 5 min", dueDate: iso(2) },
    ],
    linkCodes: [],
    parentLinks: [
      { parentId: "u-p1", studentId: "u-s1", verifiedAt: now - 30 * DAY },
      { parentId: "u-p1", studentId: "u-s2", verifiedAt: now - 30 * DAY },
    ],
    slots: [
      { id: "sl1", teacherId: "u-t1", classId: "c-piano", start: hourAt(-6, 16), durationMin: 45, bookedBy: "u-s1" },
      { id: "sl2", teacherId: "u-t1", classId: "c-piano", start: hourAt(-3, 16), durationMin: 45, bookedBy: "u-s1" },
      { id: "sl3", teacherId: "u-t2", classId: "c-violin", start: hourAt(-2, 15), durationMin: 30, bookedBy: "u-s2" },
      { id: "sl4", teacherId: "u-t1", classId: "c-piano", start: hourAt(2, 16), durationMin: 45 },
      { id: "sl5", teacherId: "u-t1", classId: "c-piano", start: hourAt(4, 10), durationMin: 45 },
      { id: "sl6", teacherId: "u-t2", classId: "c-violin", start: hourAt(3, 15), durationMin: 30 },
    ],
    attendance: [
      { id: "a1", slotId: "sl1", studentId: "u-s1", status: "present", markedBy: "u-t1", markedAt: hourAt(-6, 17) },
      { id: "a2", slotId: "sl2", studentId: "u-s1", status: "absent", markedBy: "u-t1", markedAt: hourAt(-3, 17) },
      { id: "a3", slotId: "sl3", studentId: "u-s2", status: "present", markedBy: "u-t2", markedAt: hourAt(-2, 16) },
    ],
    repertoire: [
      { id: "r1", studentId: "u-s1", title: "Minuet in G", composer: "J.S. Bach (attr.)", grade: "Grade 3", status: "polishing" },
      { id: "r2", studentId: "u-s1", title: "Für Elise (A section)", composer: "Beethoven", grade: "Grade 3", status: "learning" },
      { id: "r3", studentId: "u-s1", title: "Ode to Joy", composer: "Beethoven", grade: "Grade 1", status: "mastered" },
      { id: "r4", studentId: "u-s2", title: "Twinkle Twinkle", composer: "Traditional", grade: "Initial", status: "polishing" },
    ],
    audit: [],
    failedAttempts: [],
  };
}
