// Domain model for Noti. Mirrors the reconciled schema (Implementation Plan §3.1)
// so the in-browser store can later be swapped for PostgreSQL tables one-to-one.
export type Role = "teacher" | "student" | "parent" | "admin";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  schoolId: string;
  passwordHash: string;
  salt: string;
  createdAt: number;
}

export interface School { id: string; name: string }

export interface ClassGroup {
  id: string;
  schoolId: string;
  teacherId: string;
  name: string;
  instrument: string;
  context: "private" | "school";
  termFeeKes: number;
}

export interface Enrolment { classId: string; studentId: string }

export interface ProgressNote {
  id: string;
  classId: string;
  teacherId: string;
  studentId: string;
  title: string;
  body: string;
  status: "sent" | "withdrawn";
  createdAt: number;
  editedAt?: number | undefined;
}

export interface Signature { id: string; noteId: string; signerId: string; signedAt: number }

export interface Goal {
  id: string;
  studentId: string;
  teacherId: string;
  title: string;
  startDate: string; // yyyy-mm-dd
  targetDate: string;
  achieved: boolean;
}

export interface Homework {
  id: string;
  studentId: string;
  teacherId: string;
  title: string;
  dueDate: string;
  noteId?: string | undefined;
  goalId?: string | undefined;
  completedAt?: number | undefined;
}

export interface LinkCode {
  code: string;
  studentId: string;
  issuedBy: string;
  expiresAt: number;
  usedAt?: number | undefined;
  usedBy?: string | undefined;
}

export interface ParentLink { parentId: string; studentId: string; verifiedAt: number }

export interface LessonSlot {
  id: string;
  teacherId: string;
  classId: string;
  start: number;
  durationMin: number;
  bookedBy?: string | undefined;
}

export type AttendanceStatus = "present" | "absent" | "excused";
export interface Attendance {
  id: string;
  slotId: string;
  studentId: string;
  status: AttendanceStatus;
  markedBy: string;
  markedAt: number;
}

export type RepertoireStatus = "learning" | "polishing" | "mastered";
export interface RepertoireItem {
  id: string;
  studentId: string;
  title: string;
  composer: string;
  grade: string;
  status: RepertoireStatus;
}

export interface AuditEvent {
  id: string;
  at: number;
  actorId: string;
  action: string;
  targetId: string;
}

export interface Db {
  version: 1;
  schools: School[];
  users: User[];
  classes: ClassGroup[];
  enrolments: Enrolment[];
  notes: ProgressNote[];
  signatures: Signature[];
  goals: Goal[];
  homework: Homework[];
  linkCodes: LinkCode[];
  parentLinks: ParentLink[];
  slots: LessonSlot[];
  attendance: Attendance[];
  repertoire: RepertoireItem[];
  audit: AuditEvent[];
  failedAttempts: { key: string; at: number }[];
}
