# Noti

A web-based management system for music schools and private tutors — lesson notes with
student signing, goals and homework, parent linking, scheduling and attendance.

KCA University, School of Technology — Final Year Project (Software Development).
Nyambura Tracy Watiri, Reg. No. 24/07102. Supervisor: Beatrice Kagucia.

## Run locally

```bash
npm install
npm run dev      # http://localhost:8080
npm test         # unit + access-control (RLS-equivalent) suite
npm run build    # production build
```

## Demo accounts (invented data only)

All demo accounts use the password `NotiDemo2026`.

| Role | Email |
| --- | --- |
| School owner | owner@noti.test |
| Teacher | daniel@noti.test, amina@noti.test |
| Student | wanjiru@noti.test, brian@noti.test, zawadi@noti.test |
| Parent (2 children) | lucy@noti.test |

## Structure

- `src/lib/noti/types.ts` — domain model (matches the reconciled schema, Implementation Plan §3.1)
- `src/lib/noti/validation.ts` — Zod schemas for every input
- `src/lib/noti/service.ts` — business rules and per-role access policies
- `src/lib/noti/auth.ts` — PBKDF2 password hashing, sign-in lockout
- `src/lib/noti/store.tsx` — browser persistence (swap for a database later)
- `src/routes/` — pages; `src/components/` — UI
- `src/test/` — automated tests mapped to the Test Plan IDs

See `SECURITY.md` for the security model and pre-launch checklist.
