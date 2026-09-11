# Final testing report

Full pass over the whole project before handover: production build, linter,
live database integrity checks, and a live re-verification of the security
fixes against the migrated key (see `migrations/security_hardening.sql` and
`DEPLOYMENT.md`).

## Summary

| Check | Result |
|---|---|
| Production build (`vite build`) | ✅ Clean |
| Linter (`npm run lint`) | ✅ Clean (13 errors found → 9 fixed, 4 reviewed & accepted as non-issues, see below) |
| `npm audit` | ✅ 0 vulnerabilities |
| Database RLS coverage | ✅ Every `public` table has RLS enabled |
| Orphaned data check | ✅ None found |
| Live re-test with new publishable key | ✅ Passed |

---

## Issues found and fixed

### 1. Real bug — `AuthContext.jsx`: variable used before it was declared
**Found by**: `npm run lint`
**Issue**: `fetchProfile` was called inside a `useEffect` but defined further down in the same component, after that effect. Worked by accident today only because of React's effect-timing (the whole component body runs before the effect callback fires), but it's fragile — anything that changes execution order (React Compiler, code reordering, a future refactor) could break login entirely with a `ReferenceError`.
**Fix**: Moved the `fetchProfile` function definition above the `useEffect` that uses it.
**File**: [src/context/AuthContext.jsx](src/context/AuthContext.jsx)

### 2. Dead code cleanup (7 spots)
**Found by**: `npm run lint` (`no-unused-vars`)
**Issue**: Unused imports/variables left over from earlier refactors in this project — harmless at runtime, but the kind of thing that makes a codebase confusing to maintain and occasionally hides a forgotten feature.
**Fix**: Removed each one after checking it was genuinely unused (not a half-wired feature):

| File | Removed |
|---|---|
| `src/pages/dashboard/Dashboard.jsx` | unused `user` from `useAuth()` |
| `src/pages/invoices/InvoiceDetail.jsx` | unused `formatDate` import |
| `src/pages/invoices/InvoiceList.jsx` | unused `refetch` from a query |
| `src/pages/maintenance/TicketDetail.jsx` | unused `role` from `useAuth()` (and the now-unused `useAuth` import itself) |
| `src/pages/reports/Reports.jsx` | unused `getEmployees` import, and a `resolvedTickets` list that was computed but never rendered anywhere (along with the `tickets` query that only fed it — was firing an unnecessary request on every Reports page load) |
| `src/pages/settings/RoleManagement.jsx` | unused `updateRole` import (there's no "rename role" UI currently — this wasn't wired to anything) |
| `src/pages/tenants/TenantProfile.jsx` | unused `formatDate` import |

### 3. Reviewed and left as-is (4 findings — not bugs)
These are still flagged by the linter but are correct, common, working React patterns. Fixing them would mean rewriting working code purely for lint-cleanliness, with real regression risk and no functional benefit — not worth it for a project about to go into a client trial.

- **`AuthContext.jsx` / `TenantAuthContext.jsx`** — `react-refresh/only-export-components`: both files export a Provider component *and* a hook (`useAuth`/`useTenantAuth`) from the same file. This only affects Vite's dev-mode hot-reload granularity — it has zero effect on the production build or app behavior.
- **`EditEmployee.jsx` / `EditTenant.jsx`** — `react-hooks/set-state-in-effect`: pre-filling the edit form's state once the employee/tenant record loads, done inside a `useEffect`. This is the standard pattern for "populate a form once async data arrives" and works correctly; the newer, stricter lint rule just prefers a different architecture for a marginal render-count optimization.

---

## Live database checks

Queried the production database directly to confirm data integrity after all the changes made across this project:

- **No orphaned tenants** — every `tenants.portal_user_id` correctly points to a real `auth.users` row (no dangling references from a half-finished portal account setup)
- **Tax percentage backfill held** — the two tenants that have a tax type set (GST/OTHER TAX) both have a correctly populated `tax_percentage`, confirming the earlier migration from flat tax amounts to percentage-of-rent stuck
- **RLS enabled on every table** — re-confirmed zero tables in the `public` schema have RLS disabled
- **`app_settings.invoice_bank_info` is still empty** — not a bug, just a reminder: nobody has filled in the bank/payment details in Settings yet, so invoices won't show a "Payment details" section until that's done

## Live security re-verification

Since `.env` was switched from the old legacy JWT anon key to the new **publishable key** (`sb_publishable_...`), re-ran the two most important checks from the original security audit directly against the new key, to make sure the key migration didn't accidentally loosen anything:

- `profiles` table (anon) → still returns zero rows — the earlier fix holds
- `buildings_public` view (anon) → still readable (as intended, read-only)

Both matched the expected, secured behaviour.

---

## What's still pending (not part of this pass — tracked in `DEPLOYMENT.md`)

- Rotating out the old **Legacy HS256 JWT secret** in the Supabase dashboard (final step of the key-leak fix — do this only after redeploying with the new keys and confirming the live site works, per `DEPLOYMENT.md`)
- Deploying the `admin-ops` Edge Function with the new secret key, so "Add user", password reset, and tenant portal login creation work on the live site
