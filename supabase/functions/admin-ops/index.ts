// Edge Function — the ONLY place in this project allowed to hold/use the
// Supabase service-role key. Everything here used to run client-side via
// src/lib/supabaseAdmin.js, which meant the service-role key (full
// admin/bypass-RLS access to the entire project) was shipped inside the
// production JS bundle — readable by anyone who opened devtools. See
// migrations/security_hardening.sql and the security audit notes for the
// full writeup.
//
// Deploy with:
//   supabase functions deploy admin-ops
// No extra secrets to set — SUPABASE_URL, SUPABASE_ANON_KEY and
// SUPABASE_SERVICE_ROLE_KEY are auto-injected into every Edge Function.

import { createClient } from "npm:@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  })
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS })

  try {
    const authHeader = req.headers.get("Authorization") ?? ""

    // "As the caller" client — respects RLS, used ONLY to verify who is
    // actually asking (via the existing is_staff()/is_owner() RPCs), never
    // to perform the privileged action itself.
    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user: caller } } = await callerClient.auth.getUser()
    if (!caller) return json({ error: "Not authenticated" }, 401)

    const { data: isOwner } = await callerClient.rpc("is_owner")
    const { data: isStaff } = await callerClient.rpc("is_staff")

    const { action, payload } = await req.json()

    // The service-role client — the only client in this whole project that
    // ever touches this key, and it never leaves this server-side function.
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    switch (action) {
      // ── Staff account management — Owner only ──────────────────────────
      case "createStaffUser": {
        if (!isOwner) return json({ error: "Only an Owner can create staff accounts" }, 403)
        const { username, password, display_name, role_id } = payload
        const email = `${String(username).toLowerCase().trim()}@propflow.internal`

        const { data: authData, error: authError } = await admin.auth.admin.createUser({
          email, password, email_confirm: true, user_metadata: { display_name },
        })
        if (authError) return json({ error: authError.message }, 400)

        const { data: profileData, error: profileError } = await admin
          .from("profiles")
          .upsert({
            id: authData.user.id,
            username: String(username).toLowerCase().trim(),
            display_name, role_id, is_active: true,
          }, { onConflict: "id" })
          .select()
          .single()
        if (profileError) return json({ error: "User created but profile setup failed: " + profileError.message }, 500)

        return json({ authData, profileData })
      }

      case "resetStaffPassword": {
        if (!isOwner) return json({ error: "Only an Owner can reset another staff member's password" }, 403)
        const { userId, newPassword } = payload
        const { error } = await admin.auth.admin.updateUserById(userId, { password: newPassword })
        if (error) return json({ error: error.message }, 400)
        return json({ ok: true })
      }

      case "deleteStaffUser": {
        if (!isOwner) return json({ error: "Only an Owner can delete a staff account" }, 403)
        const { userId } = payload
        const { error } = await admin.auth.admin.deleteUser(userId)
        if (error) return json({ error: error.message }, 400)
        return json({ ok: true })
      }

      // ── Tenant portal login management — any staff member ──────────────
      case "createTenantPortalLogin": {
        if (!isStaff) return json({ error: "Staff access required" }, 403)
        const { tenantId, username, password } = payload
        const email = `${String(username).toLowerCase().trim()}@tenant.propflow.internal`

        const { data: authData, error: authError } = await admin.auth.admin.createUser({
          email, password, email_confirm: true,
        })
        if (authError) return json({ error: authError.message }, 400)

        const { error: tenantError } = await admin
          .from("tenants")
          .update({
            portal_user_id: authData.user.id,
            portal_username: String(username).toLowerCase().trim(),
            portal_active: true,
          })
          .eq("id", tenantId)
        if (tenantError) return json({ error: tenantError.message }, 500)

        return json({ authData })
      }

      case "resetTenantPortalPassword": {
        if (!isStaff) return json({ error: "Staff access required" }, 403)
        const { tenantPortalUserId, newPassword } = payload
        const { error } = await admin.auth.admin.updateUserById(tenantPortalUserId, { password: newPassword })
        if (error) return json({ error: error.message }, 400)
        return json({ ok: true })
      }

      default:
        return json({ error: "Unknown action" }, 400)
    }
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unexpected error" }, 500)
  }
})
