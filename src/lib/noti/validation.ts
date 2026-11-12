import { z } from "zod";

// Rejects anything that looks like markup so stored text can never carry a script.
const safeText = (max: number) =>
  z
    .string()
    .trim()
    .min(1, "This field cannot be empty")
    .max(max, `Must be ${max} characters or fewer`)
    .refine((v) => !/[<>]/.test(v), "Angle brackets (< >) are not allowed");

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date");

export const NOTE_BODY_MAX = 4000;

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email").max(255);

export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(128)
  .regex(/[a-z]/, "Add a lowercase letter")
  .regex(/[A-Z]/, "Add an uppercase letter")
  .regex(/[0-9]/, "Add a number");

export const signUpSchema = z.object({
  name: safeText(80),
  email: emailSchema,
  password: passwordSchema,
  // Admin accounts are never self-registered.
  role: z.enum(["teacher", "student", "parent"]),
});

export const signInSchema = z.object({ email: emailSchema, password: z.string().min(1).max(128) });

export const noteSchema = z.object({
  studentId: z.string().min(1),
  classId: z.string().min(1),
  title: safeText(120),
  body: safeText(NOTE_BODY_MAX),
});

export const noteEditSchema = z.object({ title: safeText(120), body: safeText(NOTE_BODY_MAX) });

export const goalSchema = z
  .object({ studentId: z.string().min(1), title: safeText(160), startDate: isoDate, targetDate: isoDate })
  .refine((g) => g.targetDate > g.startDate, {
    message: "Target date must be after the start date",
    path: ["targetDate"],
  });

export const homeworkSchema = z.object({
  studentId: z.string().min(1),
  title: safeText(200),
  dueDate: isoDate,
  noteId: z.string().optional(),
  goalId: z.string().optional(),
});

export const LINK_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const linkCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/, "Codes are 8 letters or numbers");

export const slotSchema = z.object({
  classId: z.string().min(1),
  start: z.number().int(),
  durationMin: z.number().int().min(15).max(180),
});

export const repertoireSchema = z.object({
  studentId: z.string().min(1),
  title: safeText(120),
  composer: safeText(80),
  grade: safeText(30),
});

export const teacherInviteSchema = z.object({ name: safeText(80), email: emailSchema, password: passwordSchema });

export const kenyanPhoneSchema = z
  .string()
  .trim()
  .regex(/^(?:\+?254|0)(7|1)\d{8}$/, "Use a Kenyan number like 0712345678");
