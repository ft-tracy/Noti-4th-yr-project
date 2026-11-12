# Noti security model and pre-launch checklist

## Important: current stage

This build stores data in the browser (localStorage) so the full flow can be demonstrated
without a server. **Browser storage is not a security boundary** — anyone can edit it with
developer tools. The access rules in `src/lib/noti/service.ts` are written and tested
exactly as the database policies will be, but they only become enforceable once they run on
a server. **Do not add real learners until step 1 of the checklist is done.**

## Controls in place (OWASP Top 10 2021)

| Risk | Control | Where |
| --- | --- | --- |
| A01 Broken access control | Every action checks the actor's role and relationship (teacher→class, parent→link, student→self, admin→school). Unknown and forbidden records return the same "not found". | `service.ts`, tests RLS-01…08 |
| A02 Cryptographic failures | PBKDF2-SHA256, 100k iterations, 16-byte random salt per user. Link codes use `crypto.getRandomValues`. HSTS header. | `auth.ts`, `server.ts` |
| A03 Injection / XSS | Zod validation on every input; `<` and `>` rejected; React escapes all output; no `dangerouslySetInnerHTML`. CSP header. | `validation.ts` |
| A04 Insecure design | 24h edit window, single signature, audit log, single-use 7-day link codes. | `service.ts` |
| A05 Misconfiguration | Security headers: CSP, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, COOP. CSRF protection on server functions. | `server.ts`, `start.ts` |
| A07 Auth failures | Strong password rule, generic sign-in errors, lockout after 5 failures for 15 min, 8h session expiry, no self-registration as admin. | `auth.ts`, `store.tsx` |
| A09 Logging | Append-only audit log of signing, editing, withdrawing, linking, booking and attendance. | `audit` table |

## How to test before real users

1. `npm test` — 23 automated tests named after the Test Plan IDs.
2. Sign in as `owner@noti.test` → **Security check** tab → **Run check** (18 probes).
3. Manual: sign in as a student and type `/dashboard/teacher` → "Access denied" (AUTH-06).
4. Production headers: after publishing, check the site at https://securityheaders.com
   and https://observatory.mozilla.org (target grade A).
5. Dependency audit: `npm audit --omit=dev`.
6. Optional scan: OWASP ZAP baseline scan against the staging URL.

## Pre-launch checklist

1. Move data to PostgreSQL with Row-Level Security; port each function in `service.ts` to a
   validated server function and each visibility rule to an RLS policy; rerun the tests.
2. Turn on email confirmation and password reset.
3. Delete demo accounts (`*@noti.test`).
4. Keep M-Pesa (Daraja) keys only as server environment variables.
5. Collect consent from the school and parents (Kenya Data Protection Act, 2019).
6. Enable backups and test one restore.
