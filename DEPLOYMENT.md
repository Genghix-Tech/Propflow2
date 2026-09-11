# Deployment guide — Vercel + Supabase

This covers exactly what to set up on Vercel and Supabase after the security
hardening changes (see `migrations/security_hardening.sql` and
`supabase/functions/admin-ops/`). Follow this in order — steps are sequenced
so nothing breaks mid-way.

## 1. Vercel — Environment Variables

Go to your Vercel project → **Settings → Environment Variables**.

Set these two (apply to Production, Preview, and Development):

| Key | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://xwflvvulkkrnoqwbiszq.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | your **Publishable key** (`sb_publishable_...`) from Supabase Dashboard → Settings → API Keys |

**Delete/remove** this one if it exists in the list — it must never be a Vercel env var:

| Key | Action |
|---|---|
| `VITE_SUPABASE_SERVICE_ROLE_KEY` | **Delete** (any variable starting with `VITE_` gets baked into the browser bundle — a service-role/secret key must never have that prefix or live here at all) |

## 2. Vercel — Build settings

Vercel auto-detects this as a Vite project. Confirm these (Settings → General → Build & Development Settings):

- **Framework Preset**: Vite
- **Build Command**: `npm run build` (runs `vite build`)
- **Output Directory**: `dist`
- **Install Command**: `npm install`

No changes needed here unless Vercel shows something different — if so, set it to match the above.

## 3. Redeploy the frontend

Commit and push the updated `.env`-equivalent changes (the actual `.env` file itself is gitignored and never pushed — only the Vercel dashboard values above matter for the live site):

```bash
git add -A
git commit -m "Security hardening: remove client-side service role key, migrate to publishable key"
git push
```

If your Vercel project is connected to this GitHub repo, this triggers an automatic deploy. Otherwise, go to the Vercel dashboard → **Deployments → Redeploy**.

## 4. Supabase — Edge Function secret

The `admin-ops` Edge Function needs the **new Secret key** you generated (the one you already copied — see "Secret keys" section above), not the old legacy `service_role` key.

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<paste-your-new-secret-key-here>
```

## 5. Deploy the Edge Function

If not already deployed:

```bash
supabase login
supabase link --project-ref xwflvvulkkrnoqwbiszq
supabase functions deploy admin-ops
```

If it's already deployed and you're only updating the secret, just re-run the `secrets set` command above — no need to redeploy the function code itself, secrets apply immediately.

## 6. Verify everything works (in this order)

1. Open the live Vercel URL — app should load and the login page should appear (confirms the new **publishable key** works)
2. Log in as Owner — confirms auth + data loading works end-to-end
3. Go to **Settings → Add user**, create a test staff account — confirms the **Edge Function + new secret key** work
4. Test **password reset** for a user
5. Open a tenant profile → create/reset a **tenant portal login**

If all 5 pass, the migration is complete and safe.

## 7. Only after step 6 passes — revoke the old leaked key

Go to Supabase Dashboard → **Settings → JWT Keys**. Under "Previously used keys", find the row:

- **Type**: Legacy HS256 (Shared Secret)

Click the **⋮** (Actions) on that row → **Revoke**.

This permanently kills the old leaked `service_role` key (and the old legacy `anon` key, which you've already stopped using in step 1). Do this last, never before step 6 — revoking it earlier will break the currently-live site until the new keys are fully rolled out.

## Quick checklist

- [ ] Vercel: `VITE_SUPABASE_ANON_KEY` = new publishable key
- [ ] Vercel: `VITE_SUPABASE_SERVICE_ROLE_KEY` removed (if it ever existed there)
- [ ] Frontend redeployed
- [ ] `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...` run with the new secret key
- [ ] `admin-ops` Edge Function deployed
- [ ] Login, Add user, password reset, tenant portal login all tested live
- [ ] Legacy HS256 Shared Secret revoked in JWT Keys screen
