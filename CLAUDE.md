# Waypoint — Build Lessons & Known Gotchas

A running record of every non-obvious problem hit while building this project, so future sessions don't repeat them.

---

## 1. Prisma 7 Breaking Changes

**Config file name changed.** The config file must be `prisma7.config.ts`, not `prisma.config.ts`. Prisma 7 renamed the file and will not pick up the old name.

**New generator provider.** The generator block in `schema.prisma` must use `provider = "prisma-client"`, not the old `provider = "prisma-client-js"`.

**Mandatory driver adapter.** Prisma 7 dropped its built-in connection pool. You must pass an adapter. For MySQL/MariaDB use `@prisma/adapter-mariadb` and wire it up in `src/lib/db.ts`. Direct `DATABASE_URL` connection no longer works without an adapter.

**`Bytes` fields return `Uint8Array<ArrayBuffer>`, not `Buffer`.** Any field typed `Bytes` in the schema is typed as `Uint8Array` in the generated client. Code that called `.toString("hex")` on a Bytes value will throw at runtime — wrap it with `Buffer.from(value).toString("hex")` instead. The `EncryptedFile` interface in `src/lib/crypto/file-encryption.ts` uses `Uint8Array` to match.

**`User.id` and `Account.id` have no `@default`.** Better Auth manages IDs at the application layer. When creating User or Account rows directly (e.g., in `createCredentialUser`), you must supply `randomUUID()` from `node:crypto` yourself.

**`prisma migrate reset` requires consent env var.** Running `prisma migrate reset` programmatically fails unless `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION=I_AM_USING_AN_AI_ASSISTANT_AND_PROCEEDING_WITH_CAUTION` is set. Workaround: drop and recreate the database via the mariadb Node module, then run `prisma migrate dev`.

**`prisma db execute --url` removed in v7.** The `--url` flag no longer exists. Use the mariadb Node module directly for raw SQL execution outside migrations.

---

## 2. MySQL 9 / mariadb Driver

**`allowPublicKeyRetrieval` required.** MySQL 9.7.2 uses RSA key exchange by default. Without `allowPublicKeyRetrieval: true` in the mariadb pool options AND in the `DATABASE_URL` query string, the connection is refused with an `Access denied` or `RSA public key` error.

Add to both places:
- `DATABASE_URL`: `mysql://root:admin@localhost:3306/waypoint?allowPublicKeyRetrieval=true`
- `src/lib/db.ts` `PrismaMariaDb` options: `allowPublicKeyRetrieval: true`

---

## 3. Better Auth 1.7.22

**`@better-auth/cli` is ECOMPROMISED.** npm blocks installation. Add the auth models (User, Account, Session, Verification) to `schema.prisma` manually by reading the Better Auth source under `node_modules/better-auth/`.

**`auth.api.getSession()` return shape.** Returns `{ session, user } | null`, not just a session object. Guard with `if (!result)` before accessing `.user`.

**Origin header required on POST requests.** Better Auth's CSRF protection rejects POST requests that have a missing or null `Origin` header with `403 {"code":"MISSING_OR_NULL_ORIGIN"}`. Node.js built-in `fetch` does not add an `Origin` header automatically, so test helpers must set it explicitly: `Origin: "http://localhost:3000"`. `curl` without Origin works (different HTTP client behaviour), which makes this easy to miss.

**`trustedOrigins` must be configured explicitly.** Even though `baseURL` is set to `http://localhost:3000`, add `BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:3000` to `.env` and wire it in `auth.ts` via `trustedOrigins: (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "").split(",").map(o => o.trim()).filter(Boolean)`.

---

## 4. Next.js 16

**`cacheComponents: true` and `partialPrefetching: true` incompatible with `dynamic = "force-dynamic"`.** Enabling these experimental options in `next.config.ts` causes a build error when any route segment exports `export const dynamic = "force-dynamic"`. Remove both from `next.config.ts`.

**Dashboard pages prerender during `npm run build`.** Server components that call `headers()` or `auth.api.getSession()` at the module level will throw during static prerender. Add `export const dynamic = "force-dynamic"` to `src/app/dashboard/layout.tsx` to opt the whole dashboard subtree out of static generation.

---

## 5. Vitest 5.x

**`test.workspace` removed.** The old `workspace` key inside `test` was removed in Vitest 4+. Use `test.projects` (an inline array) instead.

**`--project <name>` CLI flag breaks suite context in Vitest 5.1.0.** When running `vitest run --project integration`, the test runner loses the suite context and throws `Vitest failed to find the current suite`. The root cause is an ESM-in-CJS loading issue with the config file. Workaround:
- Create a separate `vitest.integration.config.mts` (note the `.mts` extension — forces ESM treatment).
- Add `pool: "vmForks"` to that config (and to the unit project in the main config).
- Use `vitest run --config vitest.integration.config.mts` as the `test:integration` script.
- Same fix applies to the unit project inside `vitest.config.ts`.

**`@types/node` peer-dep conflict.** Vitest 5.x requires `@types/node@^22`. Install it explicitly: `npm i -D @types/node@^22`.

**TypeScript analyzes `vitest.config.ts`.** Next.js `tsc` will try to type-check `vitest.config.ts` and fail because it's not part of the app module graph. Add `"vitest.config.ts"` (and `"vitest.integration.config.mts"`) to the `exclude` array in `tsconfig.json`.

---

## 6. Role Terminology

The database uses `Renter` (car owner) and `Rentee` (customer/renter). The UI must display these as **Owner** and **Customer** respectively. Never show "Renter" or "Rentee" in any user-facing text.

---

## 7. Seed & Scripts

**Always call `db.$disconnect()` at the end of scripts.** `prisma/seed.ts` and `scripts/create-admin.ts` run as standalone Node processes. Without `db.$disconnect()` in the `finally` block, the process hangs and never exits.

**Documents stored as `new Uint8Array(enc.fileData)`.** Prisma 7's `Bytes` field expects `Uint8Array`, not `Buffer`. The seed wraps encrypted file data with `new Uint8Array(enc.fileData)` before writing.

**`randomUUID` import in seed was removed.** The `randomUUID` import from `node:crypto` was added and later removed from `seed.ts` because `createCredentialUser` handles UUID generation internally. Don't re-add it without a reason.
