# Waypoint: Build Plan, Phases 0 to 2

Revision: 1 (2026-11-13). Owner: PM / tech lead. Covers Phase 0 (setup), Phase 1 (schema), Phase 2 (auth and profiles).

Environment I checked on 2026-11-13: Node 24.11.1 and npm 11.6.2. A local MySQL service (`MySQL97`, so MySQL 9.7) is running and listening on :3306. Docker 29.4 is installed. `d:\waypoint` is empty and is not a git repo. The `mysql` CLI is not on PATH, so use `prisma` or a Node script for any DB checks.

---

## 1. Project Overview

Waypoint is a peer-to-peer car rental web app. Car owners list vehicles and customers rent them, with admins verifying documents and resolving disputes. These three phases lay the foundation. Phase 0 is a runnable Next.js (App Router, TypeScript) app wired to local MySQL through Prisma. Phase 1 is the full relational schema: 9 owned tables, 7 enums plus the `DisputeRaiser` enum, Better Auth's 4 tables, hand-edited SQL CHECK constraints and a realistic seed. The spec says "8 owned tables" but it lists 9 (Renter, Rentee, Admin, Vehicle, Document, Booking, Payment, LocationLog, Dispute). We build all 9. Phase 2 is working sign-up and sign-in with email+password and Google through Better Auth. In Phase 2 a signed-in user can create an Owner profile, a Customer profile, or both. Admins are provisioned only by script. Naming rule that applies everywhere: in the DB and code, **Renter = car OWNER** and **Rentee = CUSTOMER**. In the UI we always show **"Owner"** and **"Customer"**, never "Renter" or "Rentee".

### Scope

IN: everything listed in Phases 0, 1 and 2 of the spec, the AES-256-GCM encrypt/decrypt helper (the seed needs it to store valid encrypted Document blobs), the two code-enforced rules (Document has exactly one parent; `pricePerDay > 0` when Approved) as pure validator functions, and tests that prove the KPIs.

OUT (explicitly, do not build):
- Vehicle listing, search, booking, payment, location tracking, dispute **features or UI** (tables and seed only)
- Document upload UI or API (crypto helper only)
- Email verification and password reset emails (no mail provider yet, so `requireEmailVerification: false`)
- Admin UI beyond a "You are an Admin" badge on `/dashboard`
- Role-based route protection beyond "must be signed in"
- Middleware/proxy-based auth (we use server-side session checks in layouts and routes instead)
- Deployment, CI, Docker compose (the local MySQL already exists)
- Any styling work beyond the create-next-app defaults (Tailwind)

---

## 2. Approaches Considered

### 2.1 Auth library — **Chosen: Better Auth + Prisma adapter**
| Option | Verdict |
|---|---|
| **Better Auth** (prismaAdapter, `provider: "mysql"`) | **Chosen.** The spec mandates it. It supports email+password and Google natively, keeps sessions in our own MySQL, and its CLI generates the 4 auth models into our Prisma schema. |
| Auth.js (NextAuth v5) | Rejected. Its Credentials provider can't use database sessions, so email+password would force JWT sessions. We'd end up running two session models. |
| Hosted (Clerk / Auth0) | Rejected. User identities would live outside our DB, which breaks the "User is the FK target for Renter/Rentee/Admin" design and adds a vendor dependency. |

### 2.2 Schema migration strategy — **Chosen: `prisma migrate dev --create-only` + hand-edited SQL**
| Option | Verdict |
|---|---|
| **Prisma Migrate, create-only, then hand-edit, then apply** | **Chosen.** Prisma can't express CHECK constraints, so we generate the SQL, append the CHECKs and apply it. The migration history is versioned and reproducible with `prisma migrate reset`. |
| `prisma db push` only | Rejected for Phase 1+. There's no history and nowhere to add CHECKs. We use it **only** in Phase 0 to prove connectivity, and never again after Task 5. |
| SQL-first (hand-written DDL, then `prisma db pull`) | Rejected. The Prisma schema would stop being the source of truth, and Better Auth's CLI generates into `schema.prisma`, so the two would drift. |

### 2.3 File storage — **Chosen: AES-256-GCM encrypted LONGBLOB in MySQL**
| Option | Verdict |
|---|---|
| **Encrypted BLOB in MySQL** (`fileData` LONGBLOB, `iv`, `authTag`; key from `FILE_ENCRYPTION_KEY`) | **Chosen.** This is the spec default. There's no extra infrastructure, a single backup covers everything, and the data is encrypted at rest at the app layer. Document volume (KTP/SIM/STNK scans) is small. |
| Object storage (S3 / R2) with SSE | Rejected for now. It needs extra credentials and infrastructure and has its own access-control surface. We can revisit if blob size becomes a DB problem. |
| Local filesystem | Rejected. It breaks with multiple instances or serverless, and the files would be backed up separately from the rows that reference them. |

### 2.4 Owned-table primary keys — **Chosen: `String @id @default(cuid())`**
Auto-increment Int IDs are rejected because they can be guessed (IDOR risk in later phases). cuid matches Better Auth's string `User.id`. Exception: `Vehicle.VIN` is a natural key (`VarChar(17)`), as the spec requires.

---

## 3. KPIs / Definition of Done

Every KPI must be demonstrated by a command the reviewer can run. "It works on my machine" does not count.

### Phase 0
- P0-1: `npm run dev` serves `http://localhost:3000` with HTTP 200, and `npm run build` exits 0.
- P0-2: `npx prisma db push` against `DATABASE_URL` exits 0. Done when Better Auth's 4 tables exist. A connectivity proof with an empty schema is not enough.
- P0-3: `npx tsc --noEmit` and `npm run lint` each exit 0.
- P0-4: `.env` is git-ignored. `.env.example` lists every variable with no real values. `grep -ri "secret\|password" src prisma scripts` finds no literal credentials.

### Phase 1
- P1-1: `npx prisma migrate reset --force` applies all migrations from scratch and runs the seed, exiting 0.
- P1-2: The schema contains exactly these models: User, Account, Session, Verification, Renter, Rentee, Admin, Vehicle, Document, Booking, Payment, LocationLog, Dispute. Every field, FK, enum and enum value matches §1/Phase 1 of the spec.
- P1-3: The migration SQL contains a hand-added `CHECK (endDate > startDate)` on Booking. It's visible in `prisma/migrations/*/migration.sql` with a `-- HAND-EDITED` comment.
- P1-4: Integration test `tests/integration/schema.test.ts` passes and proves that:
  - (a) inserting a Booking with `endDate <= startDate` is rejected by MySQL
  - (b) a duplicate `plateNumber`, `listingCode` or `VIN` is rejected
  - (c) a second Renter or Rentee for the same `userID` is rejected
  - (d) a FK to a non-existent row is rejected
- P1-5: Unit tests prove that `assertDocumentHasExactlyOneParent` rejects 0 and 2+ parents and accepts exactly 1. They also prove that `assertVehiclePriceValid` rejects `pricePerDay <= 0` when status is `Approved`.
- P1-6: Unit tests prove that `encryptFile` then `decryptFile` round-trips. A tampered ciphertext, IV or authTag must throw, and a key that isn't 32 bytes must throw at load.
- P1-7: After seeding, every one of the 13 tables has at least 2 rows, except `Verification`, which may be 0. Seeded Document blobs decrypt successfully with the seed key.

### Phase 2
- P2-1: A new user can sign up at `/auth/signup` (email+password) and gets redirected to `/dashboard`, and that user can then sign out and sign back in at `/auth/signin`.
- P2-2: Clicking "Continue with Google" redirects to `accounts.google.com` with `redirect_uri=http://localhost:3000/api/auth/callback/google`. With real credentials in `.env`, the full round trip lands on `/dashboard`. If no credentials are available, this KPI is a manual sign-off item and is not a blocker.
- P2-3: `/dashboard` with no session redirects to `/auth/signin`. With a session it shows the user's profiles (Owner / Customer / Admin) and a link to create each missing Owner or Customer profile.
- P2-4: A signed-in user can create an Owner profile, a Customer profile, or both. A second attempt at the same profile type returns 409. An unauthenticated call returns 401. Invalid input returns 400 with field errors and no stack trace.
- P2-5: `userID` and `verificationStatus` are **never** read from the request body. They come from the session or are forced to `Unverified`. An integration test proves that a body-supplied `userID` is ignored.
- P2-6: No code path creates an Admin row except `scripts/create-admin.ts` and `prisma/seed.ts`. `grep -r "admin.create" src` returns nothing. A seeded admin can sign in at `/auth/signin`, and the dashboard shows the Admin badge.
- P2-7: No UI string says "Renter" or "Rentee". `grep -rn "Renter\|Rentee" src/app --include=*.tsx` finds them only in identifiers or imports, never in rendered text.
- P2-8: `npm test` (unit + integration) passes, and `npm run build` exits 0.

### Global
- G-1: The security report has zero unresolved high or critical findings.
- G-2: There are no unused dependencies or dead files, and every file in the File Map has an owner task.

---

## 4. Task Breakdown

Conventions for all tasks:
- Source lives under `d:\waypoint\src`.
- Import alias is `@/*`.
- Validation uses zod.
- Tests use Vitest.
- Scripts run with `tsx`.

**Task 1 is the ONLY task that edits `package.json` dependencies.** If a later task needs a package, it tells the PM rather than installing it.

### Phase 0 — Setup (sequential)

**1. Scaffold Next.js app and all tooling** `[PARALLEL-SAFE]` (first task, nothing before it)

Steps:
- Run `npx create-next-app@latest . --ts --app --src-dir --eslint --tailwind --import-alias "@/*" --use-npm` in `d:\waypoint`.
- Install runtime deps: `@prisma/client better-auth zod`.
- Install dev deps: `prisma tsx vitest dotenv @types/node`. If the installed Prisma major version is 7 or higher, also install `@prisma/adapter-mariadb` (Prisma 7 requires a driver adapter).
- Add these npm scripts: `test` (`vitest run`), `test:unit`, `test:integration`, `db:seed` (`tsx prisma/seed.ts`), `admin:create` (`tsx scripts/create-admin.ts`).
- Set `"prisma": { "seed": "tsx prisma/seed.ts" }`, or set the seed in `prisma.config.ts` on Prisma 7+.
- Write `.env.example` with these keys:
  - `DATABASE_URL=mysql://USER:PASS@localhost:3306/waypoint`
  - `BETTER_AUTH_SECRET=`
  - `BETTER_AUTH_URL=http://localhost:3000`
  - `GOOGLE_CLIENT_ID=`
  - `GOOGLE_CLIENT_SECRET=`
  - `FILE_ENCRYPTION_KEY=` (base64 of 32 bytes)
  - `ADMIN_EMAIL=`
  - `ADMIN_PASSWORD=`
  - `ADMIN_NAME=`
  - `TEST_BASE_URL=http://localhost:3000`
- Make sure `.gitignore` covers `.env*` except `.env.example`.
- Write `vitest.config.ts` with two projects: `unit` (`tests/unit/**`) and `integration` (`tests/integration/**`, run sequentially, load `.env`).
- Run `git init`.

Done when: P0-1 (dev server part) and P0-3 pass, and `.env.example` is complete.

**2. Prisma init and DB client** `[DEPENDS ON #1]`

Steps:
- Run `npx prisma init --datasource-provider mysql`. Keep only the datasource and generator blocks in `schema.prisma`.
- Create the `waypoint` DB.
- Write `src/lib/db.ts`: a PrismaClient singleton that is globalThis-cached in dev and uses the mariadb adapter if on Prisma 7+.
- Verify `SELECT VERSION()` reports >= 8.0.16 so CHECKs are enforced. 9.7 is expected.

Done when: `npx prisma db push` connects and exits 0 on the empty schema, and `src/lib/db.ts` compiles.

**3. Better Auth core** `[DEPENDS ON #2]`

Steps:
- Write `src/lib/auth.ts`:
  - `betterAuth({ database: prismaAdapter(db, { provider: "mysql" }), emailAndPassword: { enabled: true, minPasswordLength: 10, requireEmailVerification: false }, socialProviders: { google: { clientId, clientSecret } }, plugins: [nextCookies()] })`
  - It throws at startup if `BETTER_AUTH_SECRET` is missing.
  - Google is enabled only if both Google env vars are set.
- Write `src/lib/auth-client.ts` using `createAuthClient` from `better-auth/react`.
- Write the route handler `src/app/api/auth/[...betterauth]/route.ts`: `export const { GET, POST } = toNextJsHandler(auth)`. **GET is required as well as POST**, because the OAuth callback and get-session use GET.
- Run `npx @better-auth/cli generate` to write the User, Account, Session and Verification models into `schema.prisma`. **Do not hand-modify these models** except to add the back-relations Task 4 needs.
- Run `npx prisma db push`.

Done when: P0-2 passes, the 4 auth tables exist, and `GET /api/auth/get-session` returns 200 with `null`.

### Phase 1 — Schema

**4. Owned models and enums in schema.prisma** `[DEPENDS ON #3]` (same file as #3, so this must be sequential)

Add the 7 enums from the spec, plus `DisputeRaiser { Renter Rentee }` for `Dispute.raisedBy`.

Add the 9 owned models with these field rules:
- PKs are `String @id @default(cuid())` except `Vehicle.VIN String @id @db.VarChar(17)`.
- Money fields are `Decimal @db.Decimal(12,2)`.
- Lat/lng fields are `Decimal @db.Decimal(9,6)`.
- `accuracy` and `speedKph` are `Decimal? @db.Decimal(8,2)`.
- `startDate` and `endDate` are `DateTime @db.Date`.
- `fileData` is `Bytes @db.LongBlob`, `iv` is `String @db.VarChar(32)` and `authTag` is `String @db.VarChar(32)` (both hex).
- `description` is `String @db.Text`.
- Every `createdAt` is `@default(now())`.

Keys and uniques:
- `Renter.userID` and `Rentee.userID` are `String? @unique`.
- `Admin.userID` is `String @unique`. This is a PM decision: one admin profile per user.
- `Vehicle.listingCode` and `Vehicle.plateNumber` are `@unique`.
- Default `verificationStatus` is `Unverified` and default `Vehicle.status` is `Draft`.
- Add `@@index` on every FK column.

Delete behaviour:
- Profiles use `onDelete: Restrict`.
- `Document` parent FKs use `Restrict`.
- `verifiedByAdminID`, `approvedByAdminID` and `resolvedByAdminID` use `SetNull`.

Add back-relation fields to the Better Auth `User` model (`renter Renter?`, `rentee Rentee?`, `admin Admin?`). This is the only edit allowed to auth models.

Field names must match the spec exactly (`renterID`, `vehicleVIN`, etc.). Do not run db push.

Done when: `npx prisma validate` and `npx prisma format` are clean and P1-2 holds by inspection.

**5. Initial migration with hand-edited SQL** `[DEPENDS ON #4]`

Steps:
- Drop the db-push state with `npx prisma migrate reset --force --skip-seed`.
- Run `npx prisma migrate dev --name init --create-only`.
- Append the following to the generated `migration.sql`:
  ```sql
  -- HAND-EDITED: spec constraint
  ALTER TABLE `Booking` ADD CONSTRAINT `Booking_endDate_after_startDate` CHECK (`endDate` > `startDate`);
  ```
- Apply with `npx prisma migrate dev`.

Do **not** add a DB CHECK for the Document exactly-one-parent rule or the price rule. MySQL forbids CHECKs on columns that carry FK referential actions, and the spec assigns both rules to app code.

Never use `db push` from this point on.

Done when: P1-3 passes and `npx prisma migrate status` reports that it's up to date.

**6. Domain validators and file-encryption helper with unit tests** `[DEPENDS ON #1]` (`[PARALLEL-SAFE]` with #2 to #5 and #7: it's pure TypeScript with no DB)

Files to write:
- `src/lib/validation/document.ts` exports `assertDocumentHasExactlyOneParent({ vehicleVIN, renterID, renteeID })`.
- `src/lib/validation/vehicle.ts` exports `assertVehiclePriceValid({ status, pricePerDay })`.
  - `status` is a string union that mirrors the enum; don't import Prisma types, so the task stays independent.
  - It accepts number, string or Decimal-like values.
- `src/lib/crypto/file-encryption.ts`:
  - `encryptFile(buf): { fileData: Buffer; iv: string; authTag: string }` uses `aes-256-gcm` with a random 12-byte IV, and stores the IV and authTag as hex.
  - `decryptFile({ fileData, iv, authTag }): Buffer`.
  - The key comes from `FILE_ENCRYPTION_KEY` (base64) and must decode to 32 bytes, otherwise it throws.
  - Uses `node:crypto` only.
- Matching unit tests.

Done when: P1-5 and P1-6 pass via `npm run test:unit`.

**7. User/admin provisioning helper and create-admin script** `[DEPENDS ON #5]`

Files to write:
- `src/server/provision-user.ts` exports `createCredentialUser({ email, name, password })`.
  - It hashes the password with `hashPassword` from `better-auth/crypto`.
  - In one transaction it creates `User` plus `Account { providerId: "credential", accountId: user.id, password: hash }`.
  - It's idempotent on email.
- The same file exports `ensureAdmin({ userId, name, email, permission })`.
- `scripts/create-admin.ts` reads `ADMIN_EMAIL`, `ADMIN_PASSWORD` and `ADMIN_NAME` from env (never argv, never hardcoded), validates them with zod (password >= 10 chars) and calls both functions.
- The script prints the admin email only, never the password.

Done when: `npm run admin:create` creates an admin that can sign in through `POST /api/auth/sign-in/email` (status 200, session cookie set), and running it twice does not duplicate rows.

**8. Seed script** `[DEPENDS ON #6, #7]`

Write `prisma/seed.ts`. It wipes the owned tables in FK-safe order, then creates:
- 4 users through `createCredentialUser` with password `process.env.SEED_USER_PASSWORD ?? random` (the generated password is printed once):
  - 1 Renter only
  - 1 Rentee only
  - 1 with both Renter and Rentee
  - 1 admin through `ensureAdmin`, using the `ADMIN_*` env vars
- 1 Renter with `userID = null`, to exercise nullability.
- 3 Vehicles covering at least 3 `VehicleType` values and Draft/Pending/Approved statuses. Approved vehicles must pass `assertVehiclePriceValid`.
- 4 Documents, one of each `DocumentType`, encrypted through `encryptFile` from a small dummy buffer. Each must pass `assertDocumentHasExactlyOneParent`.
- 3 Bookings (Pending, Confirmed, Completed), all with `endDate > startDate`.
- 2 Payments (Held, Released).
- 3 LocationLogs (Jakarta-area coordinates).
- 2 Disputes (one raised by Renter and Open, one raised by Rentee and Resolved by the admin).

Add `SEED_USER_PASSWORD` to `.env.example`. This is the only `.env.example` edit allowed outside Task 1, and it must be announced in the PR note.

Done when: P1-1 and P1-7 pass.

**9. Schema integration tests** `[DEPENDS ON #5]` (`[PARALLEL-SAFE]` with #6, #7, #8)

Write `tests/integration/schema.test.ts`. It creates its own fixture rows with unique random suffixes and deletes them in `afterAll`, so it doesn't depend on the seed.

Done when: P1-4 passes via `npm run test:integration`.

### Phase 2 — Auth and profiles

**10. Auth pages** `[DEPENDS ON #3]` (`[PARALLEL-SAFE]` with #4 to #9 and #11)

Pages:
- `src/app/auth/signup/page.tsx` has name, email and password fields and uses `authClient.signUp.email`.
- `src/app/auth/signin/page.tsx` has email and password fields and uses `authClient.signIn.email`.
- Both pages have a "Continue with Google" button that calls `authClient.signIn.social({ provider: "google", callbackURL: "/dashboard" })`.
- Both are client components. They show the error message Better Auth returns and never raw error objects.
- On success, `router.push("/dashboard")`.
- Shared form UI goes in `src/components/auth/AuthForm.tsx`.
- `src/app/page.tsx`: replace the boilerplate with links to sign in and sign up.

Done when: P2-1 and P2-2 can be exercised manually. P2-3 needs #12.

**11. Profile API (Owner and Customer)** `[DEPENDS ON #5]` (`[PARALLEL-SAFE]` with #10 and #12)

Files to write:
- `src/server/session.ts` exports `requireSession()`, which wraps `auth.api.getSession({ headers: await headers() })` and returns `null` when there's no session.
- `src/lib/validation/profile.ts` holds the zod schema `ProfileInput`:
  - `name`: 1 to 100 characters, trimmed.
  - `email`: valid email, max 191. It defaults to the session email if omitted.
  - `phone`: matches `/^\+?[0-9 ()-]{7,20}$/`.
  - `address`: 1 to 500 characters.
  - Use a plain `z.object` (not `.strict()` and not `.passthrough()`). Zod drops unknown keys such as `userID` and `verificationStatus` by default.
- `src/server/profiles.ts` exports `getProfilesForUser(userId) -> { renter, rentee, admin }` and `createRenterProfile(userId, input)` and `createRenteeProfile(userId, input)`.
  - These set `userID` from the argument and force `verificationStatus: Unverified`.
  - They map Prisma `P2002` to a `ProfileExistsError`.

API contract (also binding on Task 12):
- `POST /api/profile/owner` writes a Renter.
- `POST /api/profile/customer` writes a Rentee.
- The body is `{ name, email?, phone, address }`.
- Responses:

| Status | Body |
|---|---|
| 201 | `{ id }` |
| 400 | `{ error: "Invalid input", fields }` |
| 401 | `{ error: "Unauthorized" }` |
| 409 | `{ error: "Profile already exists" }` |
| 500 | `{ error: "Internal error" }` (log server-side, no stack trace to the client) |

- Route files are `src/app/api/profile/owner/route.ts` and `src/app/api/profile/customer/route.ts`. Both are thin and call `src/server/profiles.ts`.

Done when: P2-4 and P2-5 pass via #13's tests.

**12. Dashboard and profile-creation pages** `[DEPENDS ON #3, #5]` (`[PARALLEL-SAFE]` with #10 and #11: it codes against the #11 contract and imports `getProfilesForUser` and `ProfileInput` from the #11 file paths, so final verification waits for #11)

Pages and components:
- `src/app/dashboard/layout.tsx` is a server component. It calls `requireSession()` and redirects to `/auth/signin` if the result is `null`.
- `src/app/dashboard/page.tsx` shows the user's name and email.
  - It shows cards for **Owner** and **Customer** profiles: either the profile summary with its verification status, or a "Create Owner profile" / "Create Customer profile" link.
  - It shows an **Admin** badge if an Admin row exists.
  - It has a sign-out button.
- `src/app/dashboard/owner/new/page.tsx` and `src/app/dashboard/customer/new/page.tsx` share `src/components/profile/ProfileForm.tsx`.
  - The form POSTs to the #11 endpoint, shows the field errors from a 400, and redirects to `/dashboard` on 201 or 409.
- `src/components/auth/SignOutButton.tsx`.

Done when: P2-3, P2-6 (badge part) and P2-7 pass.

**13. Phase 2 integration tests and end-to-end verification** `[DEPENDS ON #8, #10, #11, #12]`

Write `tests/integration/auth-profiles.test.ts`. It runs against `TEST_BASE_URL` with the dev server running and uses `fetch` with a manual cookie jar. It covers:
- Sign up a random email.
- Get the session.
- POST owner returns 201, and a second POST returns 409.
- POST customer returns 201.
- An unauthenticated POST returns 401.
- An invalid phone returns 400.
- A body with `userID: "<other>"` is ignored, so the profile is linked to the session user.
- The seeded admin signs in and gets 200.

Then run the full KPI checklist: `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`, `npx prisma migrate reset --force`, and the greps from P0-4, P2-6 and P2-7. Paste the outputs into the PR note for review.

Done when: every Phase 0, 1 and 2 KPI passes. P2-2's full Google round trip may be marked manual.

### Parallelism summary
```
#1 ─┬─ #2 ── #3 ─┬─ #4 ── #5 ─┬─ #7 ── #8 ─┐
    │            │            ├─ #9        │
    │            │            ├─ #11 ──────┤
    │            │            └─ #12 ──────┼─ #13
    │            └─ #10 ───────────────────┘
    └─ #6 ─────────────────────── (#8) 
```
At most 3 to 4 coders can work at once after #5: #7 then #8, plus #9, #11 and #12. #10 and #6 can start much earlier.

---

## 5. File Map

All paths are under `d:\waypoint`. **One owner task per file.** "Touch" means editing a file that another task created, which is allowed only as listed.

| Task | Creates | Touches |
|---|---|---|
| 1 | `d:\waypoint\package.json`, `d:\waypoint\package-lock.json`, `d:\waypoint\tsconfig.json`, `d:\waypoint\next.config.ts`, `d:\waypoint\eslint.config.mjs`, `d:\waypoint\.gitignore`, `d:\waypoint\.env.example`, `d:\waypoint\vitest.config.ts`, `d:\waypoint\src\app\layout.tsx`, `d:\waypoint\src\app\globals.css`, (create-next-app boilerplate) | none |
| 2 | `d:\waypoint\prisma\schema.prisma` (datasource and generator only), `d:\waypoint\prisma.config.ts` (only if Prisma 7+), `d:\waypoint\src\lib\db.ts`, `d:\waypoint\.env` (local, git-ignored) | none |
| 3 | `d:\waypoint\src\lib\auth.ts`, `d:\waypoint\src\lib\auth-client.ts`, `d:\waypoint\src\app\api\auth\[...betterauth]\route.ts` | `d:\waypoint\prisma\schema.prisma` (CLI-generated auth models), `d:\waypoint\.env` |
| 4 | none | `d:\waypoint\prisma\schema.prisma` (enums, owned models, User back-relations) |
| 5 | `d:\waypoint\prisma\migrations\<timestamp>_init\migration.sql`, `d:\waypoint\prisma\migrations\migration_lock.toml` | none |
| 6 | `d:\waypoint\src\lib\validation\document.ts`, `d:\waypoint\src\lib\validation\vehicle.ts`, `d:\waypoint\src\lib\crypto\file-encryption.ts`, `d:\waypoint\tests\unit\document.test.ts`, `d:\waypoint\tests\unit\vehicle.test.ts`, `d:\waypoint\tests\unit\file-encryption.test.ts` | none |
| 7 | `d:\waypoint\src\server\provision-user.ts`, `d:\waypoint\scripts\create-admin.ts` | none |
| 8 | `d:\waypoint\prisma\seed.ts` | `d:\waypoint\.env.example` (add `SEED_USER_PASSWORD` only) |
| 9 | `d:\waypoint\tests\integration\schema.test.ts` | none |
| 10 | `d:\waypoint\src\app\auth\signin\page.tsx`, `d:\waypoint\src\app\auth\signup\page.tsx`, `d:\waypoint\src\components\auth\AuthForm.tsx` | `d:\waypoint\src\app\page.tsx` (replace boilerplate) |
| 11 | `d:\waypoint\src\server\session.ts`, `d:\waypoint\src\server\profiles.ts`, `d:\waypoint\src\lib\validation\profile.ts`, `d:\waypoint\src\app\api\profile\owner\route.ts`, `d:\waypoint\src\app\api\profile\customer\route.ts` | none |
| 12 | `d:\waypoint\src\app\dashboard\layout.tsx`, `d:\waypoint\src\app\dashboard\page.tsx`, `d:\waypoint\src\app\dashboard\owner\new\page.tsx`, `d:\waypoint\src\app\dashboard\customer\new\page.tsx`, `d:\waypoint\src\components\profile\ProfileForm.tsx`, `d:\waypoint\src\components\auth\SignOutButton.tsx` | none (imports from #11 paths) |
| 13 | `d:\waypoint\tests\integration\auth-profiles.test.ts` | none (fixes go back to the owning task) |

Collision rules:
- `schema.prisma` is edited by #2, then #3, then #4, strictly in that order, and is frozen after #5. Any later schema change becomes a new migration and needs a plan revision.
- `package.json` is owned by #1 only.
- Coders must not create files that aren't in this map. If one is needed, ask the PM first, and the map gets updated.

---

## 6. Risks

| Risk | Mitigation |
|---|---|
| Prisma 7 changed setup: `prisma.config.ts`, a required driver adapter, and a required generator output path | Task 1 records the installed major version. If it's 7 or higher, Task 2 uses `@prisma/adapter-mariadb` and `prisma.config.ts`. Better Auth's prismaAdapter takes whatever client instance we pass it. |
| MySQL 9.7 is newer than Prisma's documented support range | Task 2 smoke-tests db push. Fallback: `docker run mysql:8.4` on port 3307 (Docker is installed). |
| `migrate dev` needs a shadow DB, which needs the CREATE DATABASE privilege | Use a local user with CREATE rights. If that's blocked, set `shadowDatabaseUrl`. |
| Better Auth CLI regeneration overwrites our User back-relations | Run the CLI only in Task 3. After that, auth models change only by hand and only for back-relations. |
| CHECK silently dropped (MySQL < 8.0.16) or lost on schema regeneration | Version check in Task 2, plus test P1-4(a) proves it's enforced. |
| Google OAuth can't be tested without credentials | Google is enabled only when env vars are present. P2-2's redirect check is automated and the full round trip is a manual sign-off. |
| Admin created through signup | There is no signup path that writes Admin (P2-6 grep). Better Auth `User` gets no `role` additional field, because roles are profile tables. |
| Mass assignment of `userID` / `verificationStatus` through the profile API | Pick known keys with zod. The service layer sets both fields itself (P2-5 test). |
| Encryption key leakage or misuse | The key is read from env only, its length is validated at load, and a fresh IV is generated per encryption. Rotating the key is OUT of scope and is noted for a later phase. |
| UI says "Renter/Rentee" | P2-7 grep in the review checklist. |
