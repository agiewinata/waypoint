# Waypoint: Plan, Phase 3 (Backend Integration)

Revision: 2 (2026-11-15). Owner: PM / tech lead. This replaces the Phase 0–2 plan, which is in git history at `17c532f`. Phases 0–2 and the 25-screen mock frontend are done.

---

## 1. Project Overview

Phase 3 connects the existing mock frontend to real data so the core marketplace loop works end to end on a local machine:

> Owner lists a car with STNK + Insurance → Admin approves it → Customer uploads KTP + SIM → Admin verifies → Customer books (with location consent) → Owner confirms → Customer pays into simulated escrow (Held) → Owner starts the rental → Customer's device reports location, which the Owner sees → Owner completes the rental → escrow released (Owner gets 95%) → both parties see notifications for each step. Either party can raise a dispute, and an Admin resolves it.

Naming rule (unchanged): DB/code **Renter = Owner**, **Rentee = Customer**. The UI says only "Owner" and "Customer".

### IN scope
- Auth guards. The `/dashboard` layout guard already exists (Phase 2). We add page-level role guards on every wired page and role checks on every API route.
- Dashboard hub driven by `getProfilesForUser()`, and the sign-out button rendered in the header and side nav.
- Vehicles: public browse/search and detail pages, Owner create with document upload and submit, and the "My cars" list.
- Bookings: create with an overlap guard and consent, Owner and Customer lists, and Owner transitions (confirm / decline / start / complete).
- Documents: encrypted upload (KTP, SIM, STNK, Insurance) and an authorized decrypt-on-view endpoint.
- Payments: a simulated escrow state machine (Held → Released / Failed) and the 95% Owner payout.
- Admin: three queues (verifications, vehicles, disputes) and three actions (document verify/reject, vehicle approve/reject, dispute review/resolve/reject).
- Disputes: raise (`POST /api/disputes`). Added by PM because admin dispute resolution and the escrow-release block can't be tested without it.
- Location: consent-gated ingest during an Active booking, plus the Owner tracking view using the existing SVG with real points and auto-refresh.
- Notifications: a DB-backed feed, written by every state transition, with a mark-read API.
- One schema migration: a `Notification` table and `Booking.locationConsentAt`.

### OUT of scope (do not build)
- Real payment gateway (Midtrans). Escrow stays simulated.
- Real-time chat. `/messages` stays mock.
- Password-reset email. `/auth/reset-password` stays mock.
- Map library (MapLibre). Tracking keeps the SVG.
- Push notifications, email, SMS.
- Admin analytics and charts. Admin list pages beyond the console: `/dashboard/admin/verifications`, `/vehicles`, `/bookings`, `/users`. Nav links to these become in-page anchors or are removed.
- **Admin approval of bookings (`approvedByAdminID`).** Spec §4 lists it as a payment precondition. It is deferred to Phase 4. In Phase 3 the payment precondition is: booking Confirmed + Customer has Verified KTP and Verified SIM.
- Customer booking cancellation, vehicle editing after creation, and Owner (Renter) document upload. Owner profile verification stays as-is.
- Wiring `/account`, `/profile/setup` and `/messages`. They keep their mock header. The hub links to the working `/dashboard/{owner,customer}/new` pages instead.
- Mobile app, CI/CD, Docker, deployment.

---

## 2. Approaches Considered

### 2.1 Mutation transport. **Chosen: REST route handlers over a shared service layer**
| Option | Verdict |
|---|---|
| **Thin `route.ts` handlers that call `src/server/<domain>.ts` services** | **Chosen.** The scope requires named REST endpoints. They have stable URLs that integration tests and the security agent can hit directly with `fetch`. Phase 2 already uses this pattern. |
| Server Actions | Rejected. They have no stable public URL, which makes direct-API security testing awkward. We would also have to duplicate them to satisfy the endpoint list. |
| Both (actions for forms, routes for tests) | Rejected. Two entry points per mutation doubles the authz surface. |

### 2.2 Initial page data. **Chosen: server components call service functions directly**
| Option | Verdict |
|---|---|
| **`page.tsx` (server) calls `src/server/*` and passes plain DTOs to a client view** | **Chosen.** No HTTP hop and no loading spinner. Authz runs in the same function the API uses, and the constraint forbids client fetch for initial data. |
| Server component `fetch`es its own `/api/*` | Rejected. It needs an absolute URL and cookie forwarding, and adds a needless network round trip. |
| Client-side fetch (`useEffect`/SWR) | Rejected. It violates the style constraint and shows a spinner on every page. |

### 2.3 Authorization. **Chosen: central `src/server/authz.ts` + ownership checks inside services**
| Option | Verdict |
|---|---|
| **One helper module (API variants throw 401/403, page variants redirect/404), with every service checking ownership by session-derived IDs** | **Chosen.** One place to audit, and ownership is checked right next to the query. |
| Next 16 `proxy.ts` (middleware) | Rejected as the primary control. It only sees cookies, so it can't check "is this booking yours". It adds nothing over the existing layout guard. |
| Layout-only guards | Rejected. Layouts aren't a security boundary under partial rendering, and they don't protect API routes. |

### 2.4 Notifications. **Chosen: new `Notification` table, written inside each transition's transaction**
| Option | Verdict |
|---|---|
| **DB table + `notify(tx, …)` helper** | **Chosen.** It persists, keeps read state, and the timestamp is the event time. |
| Derive the feed from existing tables | Rejected. Vehicle and Booking have no `updatedAt`, so "approved" and "confirmed" events have no time. Read state can't be stored. |
| In-memory store | Rejected. It's lost on restart or dev HMR and is per process. |

### 2.5 File upload. **Chosen: `multipart/form-data` → encrypt in memory → LONGBLOB**
| Option | Verdict |
|---|---|
| **Multipart to the route handler, size checked before parsing, magic-byte sniff, `encryptFile`, store** | **Chosen.** Reuses the Phase 1 helper, and nothing is written to disk unencrypted. |
| Base64 in JSON | Rejected. It's 33% larger and doubles memory. |
| Presigned direct-to-bucket | Rejected. We have no bucket, and it would bypass server-side encryption. |

### 2.6 Booking overlap race. **Chosen: interactive transaction with `SELECT … FOR UPDATE` on the Vehicle row**
| Option | Verdict |
|---|---|
| **Lock the vehicle row, then overlap check, then insert, all in one `db.$transaction`** | **Chosen.** It serializes bookings per vehicle only and is simple. |
| SERIALIZABLE isolation | Rejected. MySQL gap locks cause deadlocks and the retry logic adds complexity. |
| DB constraint | Rejected. MySQL can't express a date-range exclusion constraint. |

---

## 3. Conventions (binding on every task)

1. **Route handler shape.** Every new `src/app/api/**/route.ts` exports handlers wrapped in `route()` from `src/server/http.ts`. The handler (1) calls an `authz` helper, (2) parses input with a zod schema from `src/lib/validation/*`, (3) calls one service function, and (4) returns JSON. No Prisma calls in route files.
2. **Error contract.** Every error body is `{ error: string, fields?: Record<string, string[]> }`. Status codes: 400 validation or malformed body, 401 no session, 403 wrong role / not yours / bad Origin, 404 not found, 409 state conflict or duplicate, 429 location rate limit (the only extra code), 500 `{ "error": "Internal error" }`. On 500, log server-side with `console.error("[METHOD path]", err)`. Never send `err.message` or a stack trace to the client.
3. **Identity comes from the session only.** `userID`, `renterID`, `renteeID`, `adminID`, `status`, `totalPrice`, `amount`, `verificationStatus`, `verifiedByAdminID`, `resolvedByAdminID` and `recordedAt` are never in a zod input schema. Zod's default `z.object` strips unknown keys, so don't use `.passthrough()`.
4. **Origin check.** `route()` rejects any non-GET request whose `Origin` header is missing or not in `BETTER_AUTH_TRUSTED_ORIGINS` (fallback `BETTER_AUTH_URL`) with 403 `{ error: "Forbidden" }`. Tests must send `Origin: http://localhost:3000` (see CLAUDE.md §3).
5. **DTOs only across the server→client boundary.** Prisma `Decimal` becomes `number` (rupiah), `Date` becomes an ISO string, and `@db.Date` columns become `"YYYY-MM-DD"`. Never pass a Prisma model object to a `"use client"` component. Services export their DTO types.
6. **Next 16.** `params` and `searchParams` are Promises, so `await` them. Every wired page under `/dashboard`, plus `/trips/[id]`, `/disputes/raise/[id]`, `/booking/success` and `/notifications`, exports `dynamic = "force-dynamic"`. Do not add `cacheComponents` or `partialPrefetching`.
7. **Page splitting.** When a wired page is currently `"use client"`, turn `page.tsx` into an async server component that runs the guard, loads data and renders `<SiteHeader/>`. Move the interactive part to the client component named in the File Map under `src/components/<area>/`. Only client components import `framer-motion`, `useState` and similar.
8. **Page guards.** Every wired page calls one guard from `src/server/authz.ts` as its first statement (`requireUserPage`, `requireOwnerPage`, `requireCustomerPage`, `requireAdminPage`). If the record isn't the viewer's, the page calls `notFound()`, while APIs return 403. Don't put `redirect()`/`notFound()` inside a `try`, because they throw on purpose.
9. **No mock data in wired pages.** Delete the mock `const` arrays and objects. UI config consts (`NAV_ITEMS`, `STEPS`) may stay. Mock badge numbers become real counts or are removed. Cities and vehicle types come from `CITIES` / `VEHICLE_TYPES` in `src/lib/validation/vehicle.ts`. Use `formatIDR` / `formatDate` from `src/lib/format.ts`, not per-page copies.
10. **No `any`.** Prisma error checks use `isPrismaError(err, "P2002" | "P2025")` in `http.ts`, which narrows from `unknown`.
11. **Dates.** All "today" logic uses `todayJakarta()` (Asia/Jakarta). Date-only values are stored as UTC midnight via `parseDateOnly`. `endDate` is the return date: nights = `endDate − startDate`, and overdue = `status === "Active" && endDate < todayJakarta()`.
12. **Notifications.** Every state change in §4 calls `notify(tx, …)` inside the same transaction. A recipient with a null `userID` is a no-op.
13. **Dependencies.** Phase 3 adds **no npm packages**. If a task thinks it needs one, it asks the PM.

---

## 4. API Contract

"Owner" means the caller has a Renter profile, "Customer" a Rentee profile, and "Admin" an Admin row. "Owner of X" means `X.vehicle.renterID === caller's renterID`. All bodies are JSON unless noted. Every route can also return 401/403 per §3. The table lists the domain-specific errors.

| # | Method & path | Caller | Input (zod) | Success | Domain errors |
|---|---|---|---|---|---|
| A1 | `GET /api/vehicles` | public | query: `city?` ∈ CITIES, `type?` ∈ VehicleType, `minPrice?`, `maxPrice?` (int ≥ 0, min ≤ max), `q?` (≤ 60, matches make/model), `page?`=1, `pageSize?`=24 (1–50) | 200 `{ items: PublicVehicle[], page, pageSize, total }`. Only `status=Approved AND pricePerDay>0`, newest first | 400 |
| A2 | `GET /api/vehicles/mine` | Owner | none | 200 `{ items: OwnerVehicle[] }` | none |
| A3 | `POST /api/vehicles` | Owner | `{ vin` (`/^[A-HJ-NPR-Z0-9]{17}$/`, uppercased), `make`, `model` (1–50), `year` (1990…currentYear+1), `plateNumber` (uppercased, `/^[A-Z]{1,2} \d{1,4} [A-Z]{0,3}$/`), `type`, `city` ∈ CITIES, `pricePerDay` (int 50,000–10,000,000) `}` | 201 `{ listingCode }`. Status `Draft`. Code is `WP-` plus 6 random Crockford-base32 chars, retried up to 3 times on collision | 409 VIN or plate exists (pre-checked in the transaction, P2002 as fallback) |
| A4 | `PATCH /api/vehicles/[code]` | Owner of vehicle | `{ action: "submit" }` | 200 `{ listingCode, status: "Pending" }` | 404; 409 if status ∉ {Draft, Rejected}, STNK or Insurance missing (needs a doc with status Pending or Verified), or price ≤ 0 |
| A5 | `POST /api/documents` | KTP/SIM: Customer. STNK/Insurance: Owner of `listingCode` | multipart: `type` ∈ DocumentType, `file`, `listingCode` (required iff STNK/Insurance, forbidden otherwise) | 201 `{ id, type, status: "Pending" }`. Encrypted with `encryptFile`, stored as `new Uint8Array(...)`. KTP/SIM upload sets Rentee `verificationStatus` to Pending if it was Unverified or Rejected | 400 if `Content-Length` > 6 MiB (checked **before** `formData()`), `file.size` > 5 MiB, or magic bytes not JPEG/PNG/PDF; 404 vehicle; 409 if a Pending/Verified doc of that type already exists for that parent, or the vehicle is not Draft/Rejected |
| A6 | `GET /api/documents/[id]/file` | Admin, or the user who owns the doc's parent (Rentee, Renter or vehicle's Renter). **Not** an Owner viewing a Customer's doc | none | 200 decrypted bytes. Headers: `Content-Type` sniffed after decrypt, `Content-Disposition: inline; filename="<type>-<id>.<ext>"`, `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff`. Authz runs **before** `decryptFile` | 404 |
| B1 | `GET /api/bookings` | Owner or Customer | query: `as` ∈ {owner, customer} (required, caller must hold that role), `status?` ∈ BookingStatus | 200 `{ items: BookingSummary[] }` scoped to the caller | 400 |
| B2 | `POST /api/bookings` | Customer | `{ listingCode, startDate, endDate` (`"YYYY-MM-DD"`), `locationConsent: boolean }` | 201 `{ id, totalPrice }`. Status Pending, `totalPrice = nights × pricePerDay` (server-computed with Decimal), `locationConsentAt = consent ? now : null`. Owner gets a notification | 400 if `endDate ≤ startDate`, `startDate < todayJakarta()`, nights > 30, or start > 180 days ahead; 403 when booking your own vehicle; 404 if the vehicle is missing or not Approved with price > 0; 409 on overlap with any booking of that vehicle whose status ∉ {Declined, Cancelled} (`existing.start < new.end AND existing.end > new.start`) |
| B3 | `PATCH /api/bookings/[id]` | Owner of booking | `{ action: "confirm" \| "decline" \| "start" \| "complete" }` | 200 `{ id, status }`. Transitions: confirm Pending→Confirmed; decline Pending→Declined; start Confirmed→Active (needs a Held payment and `todayJakarta() ≥ startDate`); complete Active→Completed. Customer gets a notification | 404; 409 on an invalid transition or unmet precondition (message names it) |
| P1 | `POST /api/payments` | Customer of booking | `{ bookingId, method: "BankTransfer" \| "EWallet" \| "Card" }` | 201 `{ id, status: "Held", amount }`. `amount = booking.totalPrice`, `paidAt = now`. Owner gets a notification | 404; 409 if the booking is not Confirmed, the Customer lacks a Verified KTP **and** a Verified SIM, or a Held/Released payment already exists |
| P2 | `PATCH /api/payments/[id]` | release: Owner of booking or Admin. fail: Admin | `{ action: "release" \| "fail" }` | 200 `{ id, status, ownerPayout? }`. Release: Held→Released, `escrowReleaseDate = now`, `ownerPayout = amount − 5%`. Fail: Held→Failed | 404; 409 if not Held, the booking is not Completed (release), or there is an Open/UnderReview dispute on the booking (release) |
| D1 | `POST /api/disputes` | Customer of booking (`raisedBy: Rentee`) or Owner of booking (`raisedBy: Renter`), derived server-side | `{ bookingId, description` (20–2000, trimmed) `}` | 201 `{ id }`. Counterpart and all Admins get a notification | 404; 409 if the booking status ∉ {Confirmed, Active, Completed} or an Open/UnderReview dispute exists |
| L1 | `POST /api/location` | Customer of booking | `{ bookingId, latitude` (−90…90), `longitude` (−180…180), `accuracy?` (0–10,000), `speedKph?` (0–400) `}` | 201 `{ id, overdue }`. In one transaction: insert LocationLog (`recordedAt = server now`) and set Rentee `lastKnownLat/Lng/lastSeenAt` | 404; 409 if booking not Active or `locationConsentAt` is null; 429 if the last log for this booking is < 10 s old |
| N1 | `GET /api/notifications` | signed-in | none | 200 `{ items: NotificationDTO[]` (latest 50) `, unread }` | none |
| N2 | `PATCH /api/notifications` | signed-in | `{ all: true }` or `{ ids: string[] }` (1–100) | 200 `{ updated }`, always scoped `WHERE userID = session` | 400 |
| AD1 | `GET /api/admin/verifications` | Admin | none | 200 `{ items }`: Pending docs with `renteeID` set (KTP/SIM), oldest first, with Customer name | none |
| AD2 | `GET /api/admin/vehicles` | Admin | none | 200 `{ items }`: vehicles with status Pending, with Owner name and doc ids | none |
| AD3 | `GET /api/admin/disputes` | Admin | none | 200 `{ items }`: disputes with status Open or UnderReview | none |
| AD4 | `PATCH /api/admin/documents/[id]` | Admin | `{ action: "verify" \| "reject" }` | 200 `{ id, status }`. Sets `verifiedByAdminID` and `verifiedAt`, then recomputes Rentee `verificationStatus` from the latest KTP and SIM (both Verified → Verified; any Rejected → Rejected; else Pending). Doc owner gets a notification | 404; 409 if the doc is not Pending |
| AD5 | `PATCH /api/admin/vehicles/[code]` | Admin | `{ action: "approve" \| "reject" }` | 200 `{ listingCode, status }`. Approve runs `assertVehiclePriceValid` and marks the vehicle's Pending docs Verified. Reject marks them Rejected. Owner gets a notification | 404; 409 if not Pending or STNK/Insurance missing |
| AD6 | `PATCH /api/admin/disputes/[id]` | Admin | `{ action: "review" \| "resolve" \| "reject" }` | 200 `{ id, status }`. review Open→UnderReview; resolve/reject Open\|UnderReview → Resolved/Rejected, setting `resolvedByAdminID` and `resolvedAt`. Both parties get a notification | 404; 409 on an invalid transition |

**DTO privacy.** `PublicVehicle` = `{ listingCode, make, model, year, type, city, pricePerDay, ownerFirstName }`. No VIN, plate, renterID or contact details. An Owner sees a Customer's name and `verificationStatus` only, never their documents, phone or location outside an Active booking of their own vehicle.

---

## 5. KPIs / Definition of Done

Run everything with the dev server up and a freshly seeded DB. Each KPI names its proof.

1. **K1 Build.** `npx tsc --noEmit`, `npm run lint` and `npm run build` each exit 0.
2. **K2 Migration.** On a dropped and recreated DB (CLAUDE.md §1 workaround), `npx prisma migrate dev` applies both migrations and the seed exits 0. The new migration SQL contains no `DROP` of `Booking_endDate_after_startDate`. `tests/integration/schema.test.ts` still passes.
3. **K3 Unit.** `npm run test:unit` passes, including the new tests for dates, money, the vehicle/document/booking zod schemas and the magic-byte sniffer.
4. **K4 Integration.** `npm run test:integration` passes: all suites in the File Map, plus the existing `auth-profiles` and `schema` suites.
5. **K5 401 sweep.** `authz.test.ts` calls every route in §4 with no session and gets 401. A1 is the exception and returns 200. Mutating calls without an `Origin` header get 403.
6. **K6 Role and ownership.** `authz.test.ts` proves:
   - a Customer-only user gets 403 on A2–A4, B3 and every AD route;
   - user B gets 403 on user A's booking (B3), payment (P1/P2), document file (A6) and location (L1);
   - an Owner gets 403 on A6 for their Customer's KTP;
   - a non-admin GET of `/dashboard/admin` returns 404.
7. **K7 Page guards.** With no session, `fetch(<page>, { redirect: "manual" })` on `/dashboard`, `/dashboard/owner`, `/dashboard/customer`, `/trips/<id>` and `/notifications` returns 307 with a Location header ending in `/auth/signin`. A signed-in user without an Owner profile hitting `/dashboard/owner` is redirected to `/dashboard/owner/new`.
8. **K8 Mass assignment.** A test POSTs B2 with `totalPrice: 1, status: "Confirmed", renteeID: "<other>"` and P1 with `amount: 1`. The stored rows have server-computed values and the session's IDs.
9. **K9 Business rules.** Each rule has a test that asserts its result:
   - overlap returns 409;
   - two concurrent B2 calls on the same dates (`Promise.all`) give exactly one 201 and one 409;
   - `endDate ≤ startDate` returns 400;
   - a Draft/Pending vehicle returns 404 on B2;
   - payment without Verified KTP + SIM returns 409;
   - release while a dispute is Open returns 409;
   - release on a 1,000,000 booking returns `ownerPayout: 950000`;
   - location on a non-Active booking returns 409, without consent 409, and within 10 s 429.
10. **K10 Encryption.** `documents.test.ts` uploads a PNG and then checks four things:
    - The stored `fileData` does not start with the PNG magic bytes and differs from the plaintext.
    - A6 returns byte-identical plaintext to the uploader and to an Admin.
    - It returns 403 to another user.
    - A 5 MiB + 1 byte file gets 400, and a `.png`-named text file gets 400.
11. **K11 Error hygiene.** Every new `route.ts` imports `route` from `@/server/http`: `grep -L "from \"@/server/http\"" $(find src/app/api -name route.ts | grep -v -e betterauth -e /profile/)` prints nothing. No route returns `err.message`: `grep -rn "message" src/app/api` shows no response bodies built from caught errors.
12. **K12 No mock data.** For every page listed under Tasks 10–16, `grep -nE "^const [A-Z_]+ = [\[{]" <page and its client components>` shows only `NAV_ITEMS` / `STEPS`. The `as any` in `src/app/dashboard/customer/page.tsx` is gone.
13. **K13 Terminology.** `grep -rnE "Renter|Rentee" src/app src/components --include=*.tsx` matches only identifiers, imports or type names, never JSX text or string literals shown to users.
14. **K14 No `any`.** `grep -rnE ":\s*any\b|as any|<any>" src` returns nothing.
15. **K15 Sign-out.** On any wired page the header account menu and the dashboard side nav show "Sign out". Clicking it lands on `/auth/signin`, and `/dashboard` then redirects to sign-in.
16. **K16 E2E.** `tests/integration/e2e-flow.test.ts` drives the full §1 loop through the API:
    - owner signup → profile → A3 → A5×2 → A4;
    - admin AD5 approve → vehicle visible in A1;
    - customer signup → profile → A5×2 → AD4×2;
    - B2 with consent → B3 confirm → P1 → B3 start → L1 → B3 complete → P2 release;
    - N1 for the owner contains booking-created, payment-held and payment-released entries.

    The customer agent repeats the same loop through the UI.
17. **K17 Security.** The security report has zero unresolved high or critical findings.
18. **K18 Bloat.** No new npm dependencies, no files outside the File Map, and no duplicated `formatIDR` in wired pages.

---

## 6. Task Breakdown

Every task: work only in the files the File Map (§7) assigns to it. Run `npx tsc --noEmit` and your own tests before handing back. Leave shared files (Tasks 1–2) alone after they're done; route change requests to the PM.

### Wave 0: foundation (sequential)

**T1. Schema migration + seed refresh** `[SEQUENTIAL: first]`
- `schema.prisma`:
  - Add `model Notification { notificationID String @id @default(cuid()); userID String; type String @db.VarChar(40); title String @db.VarChar(140); body String @db.VarChar(500); href String? @db.VarChar(200); readAt DateTime?; createdAt DateTime @default(now()); user User @relation(fields:[userID], references:[id], onDelete: Cascade); @@index([userID, createdAt]) }`.
  - Add `notifications Notification[]` to `User`. This is the only auth-model edit.
  - Add `locationConsentAt DateTime?` to `Booking`.
- `npx prisma migrate dev --name phase3_notifications_consent`. Read the generated SQL and confirm it does not touch the CHECK.
- Seed:
  - Delete `notification` first in the wipe order.
  - Replace the hard-coded 2026 booking dates with dates relative to `todayJakarta`-equivalent "today". Don't import from `src/lib/dates.ts`, because T2 runs after; inline a 3-line helper.
  - Final data:
    - ≥ 6 Approved vehicles across ≥ 4 cities in CITIES and ≥ 4 types, each with Verified STNK + Insurance.
    - 1 Pending vehicle with Pending STNK + Insurance.
    - The "Customer-only" user has Verified KTP + SIM and Rentee `Verified`.
    - A second Customer (the dual-role user) has one Pending KTP.
    - Bookings: one Pending (future), one Confirmed (future), one Active (start = today−1, end = today+2, `locationConsentAt` set, Held payment, the 3 LocationLogs) and one Completed with a Released payment.
    - Disputes: one Open, one Resolved.
    - ≥ 2 notifications per seeded user.
  - Keep `db.$disconnect()` in `finally`.

Done when: K2 passes and every table, including Notification, has ≥ 2 rows except Verification.

**T2. Shared server infrastructure** `[SEQUENTIAL: depends on T1]`
- `src/server/http.ts`:
  - `class HttpError(status, message, fields?)`.
  - `route(handler)`, which does the Origin check (§3.4) and maps HttpError → its status, `ZodError` → 400 with `z.flattenError(e).fieldErrors`, anything else → logged 500.
  - `readJson(req, schema)` (malformed JSON → 400), `readQuery(req, schema)`, `isPrismaError(err, code)`.
- `src/server/authz.ts`:
  - API variants `requireUser()`, `requireOwner()`, `requireCustomer()`, `requireAdmin()` and `getActor()`. Each returns `{ user, renter, rentee, admin }` with the required one non-null, or throws HttpError 401/403.
  - Page variants `requireUserPage()` (→ `/auth/signin`), `requireOwnerPage()` (→ `/dashboard/owner/new`), `requireCustomerPage()` (→ `/dashboard/customer/new`) and `requireAdminPage()` (→ `notFound()`).
  - Build on `requireSession()` and `getProfilesForUser()`.
- `src/server/notifications.ts`:
  - `NotificationType` string union.
  - `notify(tx, { userID, type, title, body, href })` (null `userID` is a no-op) and `notifyAdmins(tx, …)`.
  - `listNotifications(userId, limit = 50)`, `countUnread(userId)` and `markRead(userId, ids | "all")`.
  - `tx` is typed `Prisma.TransactionClient | typeof db`.
- `src/lib/dates.ts`: `todayJakarta()`, `parseDateOnly()`, `toDateOnly()`, `nightsBetween()` and `rangesOverlap()`.
- `src/lib/money.ts`: `PLATFORM_FEE_RATE = 0.05`, `toRupiah(decimal)`, and `ownerPayout(amount) → { fee, payout }` in integer-cent arithmetic.
- `src/lib/format.ts`: `formatIDR(n)` and `formatDate(iso)` (id-ID, Asia/Jakarta).
- `tests/integration/helpers.ts`:
  - A cookie-jar `api(jar, method, path, body?)` that always sends `Origin`.
  - `newUser()`, `asOwner()`, `asCustomer()` and `asAdmin()` (seeded admin from `ADMIN_EMAIL`/`ADMIN_PASSWORD`).
  - DB fixtures: `createApprovedVehicle(renterID)`, `verifyCustomer(renteeID)` and `cleanup()`. All use random suffixes.
- `tests/unit/dates.test.ts` and `tests/unit/money.test.ts`.
- Add `BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:3000` to `.env.example`.
- Delete the unused `vitest.integration.config.ts`, which the `.mts` file supersedes, and remove it from `tsconfig.json` `exclude`.

Done when: the unit tests pass, `tsc` is clean, and `helpers.ts` can sign up a user and create an Owner profile in a throwaway test.

### Wave 1: domain backends (PARALLEL after T2, plus T3)

Each backend task owns its validation file, service file, route files and one integration test file. Services query other tables directly through `db`, never by importing another Wave-1 service. That is what keeps them parallel-safe.

**T3. App shell: header, sign-out, dashboard hub** `[PARALLEL; depends on T2]`
- `SignOutButton`: restyle with design tokens (`.btn-ghost`) and add an optional `variant` prop.
- Render it in the `Header` account menu (desktop and mobile) and in the `SideNav` account footer.
- New `src/components/ui/SiteHeader.tsx` (async server component): session, `countUnread` and initials, then `<Header … />`. Signed-out users get the existing "Sign in" state.
- `src/app/dashboard/page.tsx`:
  - `requireUserPage()` and `getProfilesForUser()`. Show the user's name and email.
  - Owner and Customer cards link to their dashboards when the profile exists. Otherwise show "Create Owner profile" → `/dashboard/owner/new` or "Create Customer profile" → `/dashboard/customer/new`.
  - The Admin card appears only when an Admin row exists.
  - Each profile shows its verification status via `StatusTag`.

Done when: K15 passes on `/dashboard`, and the hub shows the right cards for the seeded owner-only, customer-only, dual and admin users.

**T4. Vehicles backend** `[PARALLEL; depends on T2]`
- In `validation/vehicle.ts`, add `CITIES` (Jakarta, Bandung, Surabaya, Yogyakarta, Bali, Medan, Semarang, Makassar), `VEHICLE_TYPES`, `VehicleCreateInput` and `VehicleSearchQuery`. Keep `assertVehiclePriceValid`.
- `src/server/vehicles.ts`: `listPublicVehicles`, `getPublicVehicle(code)`, `listVehiclesForOwner(renterID)`, `createVehicle(renterID, input)` and `submitVehicle(renterID, code)`.
- Routes A1–A4.
- Extend `tests/unit/vehicle.test.ts` (schemas) and write `tests/integration/vehicles.test.ts`.

Done when: A1–A4 behave per §4, including 409s, and the integration test passes.

**T5. Documents backend** `[PARALLEL; depends on T2]`
- In `validation/document.ts`, add `DocumentUploadFields`, `MAX_UPLOAD_BYTES = 5 MiB` and `sniffMime(bytes): "image/jpeg" | "image/png" | "application/pdf" | null`.
- `src/server/documents.ts`: `uploadDocument(actor, fields, bytes)`, `getDocumentFileForViewer(actor, id)` (authz first, then decrypt; use `Buffer.from(doc.fileData)` per CLAUDE.md §1) and `listCustomerDocuments(renteeID)` (status-only DTO for the verify page). Call `assertDocumentHasExactlyOneParent` before insert.
- Routes A5 and A6.
- Extend `tests/unit/document.test.ts` (sniffer) and write `tests/integration/documents.test.ts`.

Done when: K10 passes.

**T6. Bookings backend** `[PARALLEL; depends on T2]`
- `src/lib/validation/booking.ts`: `BookingCreateInput` (with refinements), `BookingListQuery`, `BookingAction`.
- `src/server/bookings.ts`:
  - `createBooking(renteeID, userId, input)`. In an interactive transaction, run `` tx.$queryRaw`SELECT VIN FROM Vehicle WHERE VIN = ${vin} FOR UPDATE` ``, then the overlap check, then insert, then notify. Use only tagged-template raw SQL, never `$queryRawUnsafe`.
  - `listBookingsForOwner(renterID, status?)` and `listBookingsForCustomer(renteeID, status?)`.
  - `getBookingDetail(actor, id)`, which returns a DTO with `viewerRole`, vehicle, customer name and verification, payment summary, open-dispute flag, `overdue` and `locationConsent`; null if not the viewer's.
  - `transitionBooking(renterID, id, action)`.
- Routes B1–B3.
- `tests/unit/booking.test.ts` and `tests/integration/bookings.test.ts`, which includes the concurrency case from K9.

Done when: the B rows of K9 pass.

**T7. Payments backend** `[PARALLEL; depends on T2]`
- `src/lib/validation/payment.ts`.
- `src/server/payments.ts`: `createPayment(renteeID, input)`, `transitionPayment(actor, id, action)` and `getOwnerEarnings(renterID)` (Held total, Released gross / fee / net, payout rows).
- Routes P1 and P2.
- `tests/integration/payments.test.ts`.

Done when: the P rows of K9 pass, including the 950,000 payout.

**T8. Admin backend** `[PARALLEL; depends on T2]`
- `src/lib/validation/admin.ts`: the three action schemas.
- `src/server/admin.ts`:
  - The three queue functions, plus `getAdminStats()` (counts for the 3 queues and Active bookings).
  - `getVehicleForReview(code)` (full vehicle, owner name, doc ids/types/status) and `getDisputeForReview(id)` (dispute, booking, both parties' names, payment status).
  - The three action functions (AD4–AD6), each in one transaction with `notify`.
- Routes AD1–AD6.
- `tests/integration/admin.test.ts`.

Done when: AD1–AD6 behave per §4 and Rentee status recompute is tested (KTP Verified + SIM Pending → Pending; both Verified → Verified).

**T9. Disputes + location backend** `[PARALLEL; depends on T2]`
- `src/lib/validation/dispute.ts` and `src/lib/validation/location.ts`.
- `src/server/disputes.ts`: `raiseDispute(actor, input)`.
- `src/server/location.ts`: `recordLocation(renteeID, input)` and `getTrackingForOwner(renterID, bookingId)` (latest 20 points, newest first, Rentee `lastSeenAt`, `overdue`; null if not the owner's).
- Routes D1 and L1.
- `tests/integration/disputes-location.test.ts`.

Done when: the D and L rows of K9 pass.

### Wave 2: page wiring (PARALLEL with each other; each starts when its listed dependencies are done)

Every page follows conventions §3.6–3.9 and renders `<SiteHeader/>` (Admin: `variant="ink"`). Mutations use `fetch` to the §4 route, show the `error`/`fields` message on failure, and call `router.refresh()` or navigate on success.

**T10. Browse, vehicle detail, booking success** `[depends on T3, T4, T6]`
- `/`: the server page awaits `searchParams` and calls `listPublicVehicles`. `BrowseClient` holds the filter UI and updates the URL with `router.replace`, so filtering re-renders on the server. Stats-strip numbers come from real counts or are removed. Show an empty state when there are no results.
- `VehicleCard` takes a `PublicVehicle` and links to `/vehicles/[listingCode]`.
- `/vehicles/[id]`: the segment is the listingCode. Call `getPublicVehicle`, or `notFound()`.
- `BookingCard` (client):
  - Date inputs (min = `todayJakarta()`, passed from the server), live nights × price, a location-consent checkbox with one sentence explaining tracking runs only during an active rental, then POST B2. On 201, go to `/booking/success?id=`.
  - Signed out: show a "Sign in to book" link. Signed in without a Customer profile: show a "Create Customer profile" link. The server page passes the viewer state.
- `/booking/success`: server page, `requireUserPage`, `getBookingDetail` (viewer must be the customer), otherwise `notFound()`. The animated part moves to `SuccessView`.

Done when: a seeded Approved car can be found by city/type/price, booked, and the success page shows the real booking.

**T11. Owner listing flow** `[depends on T3, T4, T5]`
- `/dashboard/owner/list`: server page (`requireOwnerPage`) plus the `ListCarForm` client.
- On submit, call these in order: A3 → A5 (STNK) → A5 (Insurance) → A4. The form remembers which calls succeeded. On failure it shows the error and a "Retry" that resumes from the failed call; it does not re-POST the vehicle. On success it links to My cars.
- Client-side checks mirror the zod rules: JPEG/PNG/PDF only, ≤ 5 MB.
- `/dashboard/owner/cars`: `listVehiclesForOwner`, with a real empty state.

Done when: a new owner can list a car that then appears as Pending in AD2.

**T12. Owner operations** `[depends on T3, T6, T7]`
- `/dashboard/owner`: KPI tiles (approved cars, Pending requests, Held escrow, Released net), the Pending request list linking to `/dashboard/owner/bookings/[id]`, and the car grid.
- `/dashboard/owner/bookings/[id]`:
  - `getBookingDetail` (viewer must be the owner), otherwise `notFound()`.
  - Checklist: owner confirmed / Customer verified / payment Held.
  - `BookingActions` client shows only the valid buttons for the current status: Confirm/Decline when Pending, Start when Confirmed and Held, Complete when Active, then "Release payout" (P2) when Completed and Held. It also links to tracking when Active and to raise a dispute.
- `/dashboard/owner/earnings`: `getOwnerEarnings`, showing gross, 5% fee and net, plus the payout table.

Done when: an owner can take a booking from Pending to Released from the UI.

**T13. Customer dashboard, verification, checkout** `[depends on T3, T5, T6, T7]`
- `/dashboard/customer`:
  - Trips table from `listBookingsForCustomer`, linking to `/trips/[id]`. Confirmed and unpaid trips link to checkout.
  - Verification banner from Rentee `verificationStatus`. Remove the `as any`.
- `/dashboard/customer/verify`: the server passes `listCustomerDocuments`. The `VerifyUploadForm` client uploads KTP and SIM (A5) and shows the per-doc status. Re-upload is allowed only when Rejected or missing.
- `/dashboard/customer/checkout/[id]`:
  - `getBookingDetail` (viewer must be the customer).
  - The server-computed checklist (Confirmed, KTP + SIM Verified, not already paid) disables Pay with a reason.
  - `CheckoutForm` POSTs P1, then navigates to `/trips/[id]`.

Done when: the seeded verified customer can pay for their Confirmed booking, and an unverified one sees why Pay is disabled.

**T14. Trip detail, live tracking, raise dispute** `[depends on T3, T6, T7, T9]`
- `/trips/[id]`:
  - `requireUserPage` and `getBookingDetail` (customer or owner of the booking).
  - Timeline from the status, plus an escrow breakdown using `ownerPayout`.
  - If the viewer is the customer and the booking is Active with consent, render `LocationReporter`. It calls `navigator.geolocation.watchPosition`, POSTs L1 at most every 15 s, stops on 409, and shows "Sharing location" / "Location off" plus any permission-denied state.
  - Link to raise a dispute.
- `/dashboard/owner/tracking/[id]`: `requireOwnerPage` and `getTrackingForOwner` (null → `notFound()`). `TrackingMap` client plots the real points on the existing SVG, centered on the latest point, with an overdue highlight. `AutoRefresh` calls `router.refresh()` every 15 s. Show an empty state when there are no points yet.
- `/disputes/raise/[id]`: the server checks access through `getBookingDetail`. `RaiseDisputeForm` POSTs D1. The evidence upload UI is removed (OUT).

Done when: a location posted for the seeded Active booking appears on the owner's tracking page within 15 s, and a dispute raised on it appears in AD3.

**T15. Admin console and review pages** `[depends on T3, T5, T8]`
- `/dashboard/admin`:
  - `requireAdminPage`, `getAdminStats` and the three queues.
  - `NAV_ITEMS` points only at `/dashboard/admin` and the in-page anchors `#verifications`, `#vehicles`, `#disputes`. Remove Bookings and Users.
  - Verification rows use `DocumentReviewActions`: "View file" (A6, `target="_blank" rel="noopener"`) and Verify / Reject (AD4). This replaces the dead `/dashboard/admin/verifications/[id]` link.
- `/dashboard/admin/vehicles/[code]`: `getVehicleForReview` (null → `notFound()`), doc links to A6, and the `VehicleReviewActions` client (AD5).
- `/dashboard/admin/disputes/[id]`: `getDisputeForReview` and the `DisputeReviewActions` client (AD6), showing only valid transitions.

Done when: the seeded admin can clear all three seeded queues from the UI, and a non-admin gets 404.

**T16. Notifications API and page** `[depends on T2 for the API, T3 for the page]`
- `src/lib/validation/notification.ts` and routes N1/N2.
- `/notifications`: `requireUserPage` and `listNotifications`. The `NotificationList` client keeps the existing per-type icons, adds "Mark all read" (N2 `{ all: true }`), and marks one read on click before navigating to `href`.
- `tests/integration/notifications.test.ts` proves a user can't mark another user's notification.

Done when: notifications from the K16 flow appear, mark-read persists across reloads, and the header badge count drops.

### Wave 3: verification (sequential, last)

**T17. Cross-cutting tests and full KPI run** `[depends on T1–T16]`
- `tests/integration/authz.test.ts` (K5–K8) and `tests/integration/e2e-flow.test.ts` (K16).
- Run K1–K16 and K18. Paste each command and its output into the hand-back note.
- Failures go back to the owning task, never fixed in place.

Done when: K1–K16 and K18 are green. K17 is the security agent's.

### Dependency graph
```
T1 ─ T2 ─┬─ T3 ─────────────┐
         ├─ T4 ─┐           │
         ├─ T5 ─┤           ├─ T10 (T3,T4,T6)   T11 (T3,T4,T5)
         ├─ T6 ─┤  Wave 2 ──┤  T12 (T3,T6,T7)   T13 (T3,T5,T6,T7)
         ├─ T7 ─┤           │  T14 (T3,T6,T7,T9) T15 (T3,T5,T8)
         ├─ T8 ─┤           │  T16 (T2 api; T3 page)
         └─ T9 ─┘           └──────────────────────────── T17
```
Peak parallelism is 7 coders in Wave 1 (T3–T9) and 7 in Wave 2 (T10–T16). With 3 coders, a sensible order is: [T4, T6, T3] → [T5, T7, T10] → [T8, T9, T11] → [T12, T13, T15] → [T14, T16] → T17.

---

## 7. File Map

All paths are under `d:\waypoint\`. Each file has exactly one owner task. "Touch" means editing an existing file. No two tasks own the same file. Any file not listed here needs PM approval.

| Task | Creates | Touches |
|---|---|---|
| T1 | `prisma/migrations/<ts>_phase3_notifications_consent/migration.sql` | `prisma/schema.prisma`, `prisma/seed.ts` |
| T2 | `src/server/http.ts`, `src/server/authz.ts`, `src/server/notifications.ts`, `src/lib/dates.ts`, `src/lib/money.ts`, `src/lib/format.ts`, `tests/integration/helpers.ts`, `tests/unit/dates.test.ts`, `tests/unit/money.test.ts` | `.env.example`, `tsconfig.json`; **deletes** `vitest.integration.config.ts` |
| T3 | `src/components/ui/SiteHeader.tsx` | `src/components/ui/Header.tsx`, `src/components/ui/SideNav.tsx`, `src/components/auth/SignOutButton.tsx`, `src/app/dashboard/page.tsx` |
| T4 | `src/server/vehicles.ts`, `src/app/api/vehicles/route.ts` (GET, POST), `src/app/api/vehicles/mine/route.ts`, `src/app/api/vehicles/[code]/route.ts`, `tests/integration/vehicles.test.ts` | `src/lib/validation/vehicle.ts`, `tests/unit/vehicle.test.ts` |
| T5 | `src/server/documents.ts`, `src/app/api/documents/route.ts`, `src/app/api/documents/[id]/file/route.ts`, `tests/integration/documents.test.ts` | `src/lib/validation/document.ts`, `tests/unit/document.test.ts` |
| T6 | `src/lib/validation/booking.ts`, `src/server/bookings.ts`, `src/app/api/bookings/route.ts` (GET, POST), `src/app/api/bookings/[id]/route.ts`, `tests/unit/booking.test.ts`, `tests/integration/bookings.test.ts` | none |
| T7 | `src/lib/validation/payment.ts`, `src/server/payments.ts`, `src/app/api/payments/route.ts`, `src/app/api/payments/[id]/route.ts`, `tests/integration/payments.test.ts` | none |
| T8 | `src/lib/validation/admin.ts`, `src/server/admin.ts`, `src/app/api/admin/verifications/route.ts`, `src/app/api/admin/vehicles/route.ts`, `src/app/api/admin/disputes/route.ts`, `src/app/api/admin/documents/[id]/route.ts`, `src/app/api/admin/vehicles/[code]/route.ts`, `src/app/api/admin/disputes/[id]/route.ts`, `tests/integration/admin.test.ts` | none |
| T9 | `src/lib/validation/dispute.ts`, `src/lib/validation/location.ts`, `src/server/disputes.ts`, `src/server/location.ts`, `src/app/api/disputes/route.ts`, `src/app/api/location/route.ts`, `tests/integration/disputes-location.test.ts` | none |
| T10 | `src/components/browse/BrowseClient.tsx`, `src/components/booking/BookingCard.tsx`, `src/components/booking/SuccessView.tsx` | `src/app/page.tsx`, `src/app/vehicles/[id]/page.tsx`, `src/app/booking/success/page.tsx`, `src/components/ui/VehicleCard.tsx` |
| T11 | `src/components/owner/ListCarForm.tsx` | `src/app/dashboard/owner/list/page.tsx`, `src/app/dashboard/owner/cars/page.tsx` |
| T12 | `src/components/owner/BookingActions.tsx` | `src/app/dashboard/owner/page.tsx`, `src/app/dashboard/owner/bookings/[id]/page.tsx`, `src/app/dashboard/owner/earnings/page.tsx` |
| T13 | `src/components/customer/VerifyUploadForm.tsx`, `src/components/customer/CheckoutForm.tsx` | `src/app/dashboard/customer/page.tsx`, `src/app/dashboard/customer/verify/page.tsx`, `src/app/dashboard/customer/checkout/[id]/page.tsx` |
| T14 | `src/components/trips/LocationReporter.tsx`, `src/components/owner/TrackingMap.tsx`, `src/components/ui/AutoRefresh.tsx`, `src/components/disputes/RaiseDisputeForm.tsx` | `src/app/trips/[id]/page.tsx`, `src/app/dashboard/owner/tracking/[id]/page.tsx`, `src/app/disputes/raise/[id]/page.tsx` |
| T15 | `src/components/admin/DocumentReviewActions.tsx`, `src/components/admin/VehicleReviewActions.tsx`, `src/components/admin/DisputeReviewActions.tsx` | `src/app/dashboard/admin/page.tsx`, `src/app/dashboard/admin/vehicles/[code]/page.tsx`, `src/app/dashboard/admin/disputes/[id]/page.tsx` |
| T16 | `src/lib/validation/notification.ts`, `src/app/api/notifications/route.ts` (GET, PATCH), `src/components/notifications/NotificationList.tsx`, `tests/integration/notifications.test.ts` | `src/app/notifications/page.tsx` |
| T17 | `tests/integration/authz.test.ts`, `tests/integration/e2e-flow.test.ts` | none |

Collision rules:
- `prisma/schema.prisma` is frozen after T1. `src/server/{http,authz,notifications}.ts` and `src/lib/{dates,money,format}.ts` are frozen after T2. A change request goes to the PM, who either assigns it to the original task or revises the plan.
- Wave-2 tasks **import** from Wave-1 services and never edit them. If a page needs a field a service doesn't return, the request goes to the owning Wave-1 task.
- These stay untouched in Phase 3: `src/lib/auth.ts`, `src/lib/auth-client.ts`, `src/lib/db.ts`, `src/lib/crypto/file-encryption.ts`, `src/server/{session,profiles,provision-user}.ts`, the profile routes, `/account`, `/messages`, `/profile/setup` and `/auth/*`.

---

## 8. Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | Prisma `Decimal`/`Date` objects are passed to client components, causing the RSC error "Only plain objects…" or wrong money math | Convention §3.5: services return DTOs, and money uses `toRupiah`/`ownerPayout` with integer cents. `npm run build` plus clicking through every wired page in T17 catches leaks. |
| R2 | A double-booking race lets two concurrent requests both pass the overlap check | `SELECT … FOR UPDATE` on the Vehicle row inside the transaction (§2.6), proven by the concurrent `Promise.all` test in K9. |
| R3 | IDOR: one user reads or changes another's booking, document, payment or location | Every service takes session-derived IDs and filters by them. Page variants `notFound()`. K6 tests each resource with a second user. Decryption happens only after authz (A6). |
| R4 | The Phase 3 migration drifts from or drops the hand-edited `CHECK (endDate > startDate)` | T1 reads the generated SQL before applying it. K2 re-runs `schema.test.ts`, which asserts the CHECK still rejects bad rows. |
| R5 | Prisma 7 + mariadb adapter P2002 errors may lack `meta.target`, so we can't tell a VIN conflict from a plate conflict | Pre-check uniqueness inside the transaction for a precise 409 message, and fall back to a generic 409 on `isPrismaError(e, "P2002")`. Don't parse `meta`. |
| R6 | Large or malicious uploads (memory exhaustion, HTML/SVG served back as a document) | Reject on `Content-Length` before `formData()`, enforce a 5 MiB cap, allowlist JPEG/PNG/PDF by magic bytes (ignore the client MIME type), serve with `nosniff` + `no-store` and the sniffed type. |
| R7 | CSRF on cookie-authenticated custom routes (Better Auth's Origin check covers only `/api/auth/*`) | The `route()` wrapper enforces Origin on every non-GET (§3.4), on top of SameSite=Lax cookies. K5 asserts it. |
| R8 | Timezone off-by-one: UTC "today" is yesterday in WIB before 07:00, so bookings, overdue and `start` checks go wrong | One `todayJakarta()` helper with unit tests. Date-only columns go through `parseDateOnly`. No bare `new Date()` comparisons for dates. |
| R9 | Location data abuse: flooding, tracking without consent, tracking after return | Server checks Active + `locationConsentAt` + ownership on every reading, uses server-side `recordedAt`, and enforces a 10 s minimum interval (429). `LocationReporter` stops on 409. |
| R10 | Splitting 16 client pages breaks the existing animations/UI, or a coder leaves mock data behind | Only the data source changes and visual markup is moved as-is. K12 grep. The customer agent clicks through every wired page. |
| R11 | Integration tests are flaky because they depend on seed state or the dev server | Tests create their own fixtures through `helpers.ts` with random suffixes and clean up. The only seed dependency is the admin login. The tests and the run command document "dev server must be running". |
| R12 | Scope creep: deferring admin booking approval disagrees with spec §4 | Recorded explicitly in OUT. The payment precondition is coded in one place (`createPayment`), so adding `approvedByAdminID` in Phase 4 is a one-line check plus one admin route. |

---

## PM Review (2026-11-16, Phase 3 build at `71a2972`)

**Verdict: NEEDS REVISION.** This is a small, focused fix list. The core build is solid. Every KPI is met, or its skip is justified, except where the new onboarding work broke conventions (items M1 to M4 below).

**What I re-ran:** `tsc` exit 0; `test:unit` 86/86; `test:integration` 187 pass, 3 skip. I ran the K11–K14/K18 greps myself and probed the live server with a throwaway user, which I have since deleted.

### Architectural change: accepted retroactively
I accept the unified onboarding (one `Profile` row, then Owner and Customer turned on separately). It is simpler than choosing a role at sign-up. Plan amendments:
- The file map gains the third migration `add_profile_table`, `src/middleware.ts`, `/onboarding` (page and `OnboardingForm`), `/api/onboarding` and `/api/profile/enable-{listing,renting}`.
- `src/server/profiles.ts` comes off the frozen list.
- K2 now reads "applies all three migrations". I checked the new SQL: it only creates `Profile` and has no `DROP`.

### KPI results
| KPI | Result | Notes |
|---|---|---|
| K1 Build | PASS | 10 lint warnings, all in tests. Cleaning them up is optional. |
| K2 Migration | PASS (SQL reviewed) | I did not re-run it on a fresh DB. T17 should repeat it after the fixes. |
| K3 Unit / K4 Integration | PASS | Re-run by PM. |
| K5 401 sweep | PASS for the §4 routes | The new routes have no negative tests yet (see M4). |
| K6 / K7 skips | ACCEPTED | Root cause: the root `src/app/loading.tsx` makes the page stream, so `redirect()` and `notFound()` arrive inside the RSC payload with HTTP 200. Verified live: a non-admin GET of `/dashboard/admin` gets 200 with the not-found UI and no queue data. `/dashboard/owner` contains `NEXT_REDIRECT;replace;/dashboard/owner/new;307`. The API layer (K5) is the real boundary. |
| K8 Mass assignment / K9 Rules / K10 Encryption / K16 E2E | PASS | Integration suites are green. |
| K11 Error hygiene | **FAIL (minor)** | All routes import `@/server/http`, but `enable-listing/route.ts:18` and `enable-renting/route.ts:18` return `err.message` (M3). |
| K12 No mock data | PASS | The only extra consts are config (`ALLOWED_MIME_TYPES`, `ACCEPTED_TYPES`, `DISPUTABLE_STATUSES`), not mock data. The `as any` is gone. |
| K13 Terminology | PASS | The grep returns nothing. |
| K14 No `any` | PASS | Every match is in the gitignored, generated `src/generated/prisma/**`. The KPI grep is amended to `--exclude-dir=generated`. |
| K15 Sign-out | Deferred to the customer agent | Not re-checked in this review. |
| K17 Security | Pending | Waiting on the security agent. |
| K18 Bloat | **FAIL** | No new dependencies, and `formatIDR` is defined once. The legacy profile path is duplicated and dead (M4). |

### Must fix
- **M1. State change on GET.** `src/app/dashboard/owner/new/page.tsx:16` and `customer/new/page.tsx:16` call `enableListing` / `enableRenting` while the page renders.
  - Verified live: a plain GET made the probe user an Owner.
  - This skips the §3.4 Origin/CSRF check. A cross-site link can turn on a role for the victim.
  - It also means `requireOwnerPage` and `requireCustomerPage` never actually block, because they just redirect into the page that auto-promotes.
  - Fix: make each page a confirm card with a client button that POSTs to `/api/profile/enable-*` and then calls `router.push`. Today the UI never calls these APIs; only the tests do.
- **M2. Malformed JSON returns 500.** `src/app/api/onboarding/route.ts:9` calls `req.json()` unguarded. Verified live: `{not json` gives 500. Replace lines 9–17 with `readJson(req, OnboardingInput)`.
- **M3. K11.** In both enable routes, replace `new HttpError(400, err.message)` with a literal: `new HttpError(409, "Complete onboarding first")`. This is a state conflict, so it should be 409 per §3.2.
- **M4. K18: one profile-creation path.**
  - Delete `src/app/api/profile/owner/route.ts` and `src/app/api/profile/customer/route.ts`, plus the legacy helpers in `src/server/profiles.ts:96-134`. They create a Renter or Rentee without a `Profile` row, which leaves the account in an inconsistent state.
  - Delete `ProfileInput` in `src/lib/validation/profile.ts` and the unimported `src/components/profile/ProfileForm.tsx`.
  - Port `tests/integration/auth-profiles.test.ts` to `/api/onboarding` and `/api/profile/enable-*`. Cover: 201, idempotent repeat, 401 with no session, 403 with no Origin, 400 on malformed or invalid input, and 409 when enabling before onboarding.
  - Fix the stale header comment in `e2e-flow.test.ts:7,13`.

### Should fix (same pass, cheap)
- **S1.** Rename `src/middleware.ts` to `src/proxy.ts` (export `proxy`). Next 16.4 logs "middleware file convention is deprecated". Keep the logic the same.
- **S2.** Turn the 3 skips into real assertions instead of `it.skip`:
  - K6: the body has no admin queue data.
  - K7: the body contains `NEXT_REDIRECT;replace;/dashboard/owner/new`.
  - The K7 owner fixture (`authz.test.ts:604`) must call `setupProfile` first. Otherwise the layout redirects to `/onboarding` and `requireOwnerPage` is never reached.
- **S3.** `src/server/bookings.ts:93` turns any `Error` into a 400 using its message. Throw and catch a dedicated `BookingDateError` so unexpected errors still produce a 500.

**Next step (loop step 2 → back to coding):** a coding agent does M1–M4 and S1–S3, commits after each item, then re-runs K1, K4, K11 and K18 and pastes the output. When that is clean, the PM re-reviews and sends the build to the security agent (step 3).
