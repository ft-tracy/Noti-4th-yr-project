// Password hashing (PBKDF2-SHA256, 100k rounds, per-user salt) and sign-in rules.
import type { Db, User } from "./types";
import { signInSchema, signUpSchema, teacherInviteSchema } from "./validation";
import { NotiError, isLockedOut, recordFailure } from "./service";

const toHex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");

export function newSalt() {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return toHex(b.buffer);
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: new TextEncoder().encode(salt), iterations: 100_000, hash: "SHA-256" },
    key,
    256,
  );
  return toHex(bits);
}

function firstIssue(r: { success: boolean; error?: { issues: { message: string }[] } }) {
  return r.error?.issues[0]?.message ?? "Invalid input";
}

async function makeUser(db: Db, data: { name: string; email: string; password: string }, role: User["role"], schoolId: string) {
  if (db.users.some((u) => u.email === data.email)) throw new NotiError("An account with this email already exists", "conflict");
  const salt = newSalt();
  const user: User = {
    id: crypto.randomUUID(), email: data.email, name: data.name, role, schoolId, salt,
    passwordHash: await hashPassword(data.password, salt), createdAt: Date.now(),
  };
  return user;
}

export async function signUp(db: Db, input: unknown): Promise<{ db: Db; user: User }> {
  const r = signUpSchema.safeParse(input);
  if (!r.success) throw new NotiError(firstIssue(r));
  const user = await makeUser(db, r.data, r.data.role, db.schools[0]?.id ?? "independent");
  return { db: { ...db, users: [...db.users, user] }, user };
}

export const GENERIC_SIGNIN_ERROR = "Email or password is incorrect";

export async function signIn(db: Db, input: unknown, now = Date.now()): Promise<{ db: Db; user?: User; error?: string }> {
  const r = signInSchema.safeParse(input);
  if (!r.success) return { db, error: GENERIC_SIGNIN_ERROR };
  const key = `login:${r.data.email}`;
  if (isLockedOut(db, key, now)) return { db, error: "Too many attempts. Try again in 15 minutes." };
  const user = db.users.find((u) => u.email === r.data.email);
  // Hash even when the user is missing so timing does not reveal which emails exist.
  const hash = await hashPassword(r.data.password, user?.salt ?? "no-such-user-salt");
  if (!user || hash !== user.passwordHash) return { db: recordFailure(db, key, now), error: GENERIC_SIGNIN_ERROR };
  return { db: { ...db, failedAttempts: db.failedAttempts.filter((f) => f.key !== key) }, user };
}

export async function addTeacher(db: Db, actor: User, input: unknown): Promise<Db> {
  if (actor.role !== "admin") throw new NotiError("Only school owners can add teachers", "forbidden");
  const r = teacherInviteSchema.safeParse(input);
  if (!r.success) throw new NotiError(firstIssue(r));
  const user = await makeUser(db, r.data, "teacher", actor.schoolId);
  return { ...db, users: [...db.users, user] };
}

export function changeRole(db: Db, actor: User, userId: string, role: "teacher" | "student" | "parent"): Db {
  if (actor.role !== "admin") throw new NotiError("Only school owners can change roles", "forbidden");
  const target = db.users.find((u) => u.id === userId);
  if (!target || target.schoolId !== actor.schoolId || target.role === "admin") throw new NotiError("You cannot change this account", "forbidden");
  return { ...db, users: db.users.map((u) => (u.id === userId ? { ...u, role } : u)) };
}
