import { supabase } from "../lib/supabase"
import { supabaseAdmin } from "../lib/supabaseAdmin"
import { supabaseTenant } from "../lib/supabaseTenant"

// ─── STAFF-SIDE FUNCTIONS (called from TenantProfile by staff) ───────────────

export const createTenantPortalLogin = async (tenantId, username, password) => {
  const email = `${username.toLowerCase().trim()}@tenant.propflow.internal`

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (authError) throw authError

  const { error: tenantError } = await supabaseAdmin
    .from("tenants")
    .update({
      portal_user_id: authData.user.id,
      portal_username: username.toLowerCase().trim(),
      portal_active: true,
    })
    .eq("id", tenantId)

  if (tenantError) throw tenantError
  return authData
}

export const resetTenantPortalPassword = async (tenantPortalUserId, newPassword) => {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(
    tenantPortalUserId, { password: newPassword }
  )
  if (error) throw error
}

export const toggleTenantPortalAccess = async (tenantId, active) => {
  const { error } = await supabaseAdmin
    .from("tenants")
    .update({ portal_active: active })
    .eq("id", tenantId)
  if (error) throw error
}

export const sendMessageAsStaff = async (tenantId, senderName, body) => {
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase
    .from("messages")
    .insert([{
      tenant_id: tenantId,
      sender_type: "staff",
      sender_id: user.id,
      sender_name: senderName,
      body,
    }])
  if (error) throw error
}

export const getMyMessages = async (tenantId) => {
  // Called from both staff (uses supabase) and tenant portal (uses supabaseTenant)
  // We detect which client to use based on who's calling
  // Staff calls this via dynamic import in TenantProfile,
  // so we use regular supabase here for staff-side reads
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true })
  if (error) throw error
  return data
}

// ─── TENANT PORTAL AUTH ───────────────────────────────────────────────────────

export const tenantSignIn = async (username, password) => {
  const { data, error } = await supabaseTenant
    .rpc("get_tenant_email_by_username", { p_username: username.toLowerCase().trim() })

  if (error || !data || data.length === 0) {
    throw new Error("Invalid username or password")
  }

  const { email } = data[0]

  const { error: authError } = await supabaseTenant.auth.signInWithPassword({
    email,
    password,
  })

  if (authError) throw new Error("Invalid username or password")
}

// ─── TENANT PORTAL DATA (uses supabaseTenant — scoped to tenant's own data) ──

export const getMyTenantProfile = async () => {
  const { data, error } = await supabaseTenant
    .from("tenants")
    .select(`*, buildings ( name, address ), units ( unit_number, floor, type, bedrooms )`)
    .single()
  if (error) throw error
  return data
}

export const getMyInvoices = async () => {
  const { data, error } = await supabaseTenant
    .from("invoices")
    .select("*")
    .order("year", { ascending: false })
    .order("month", { ascending: false })
  if (error) throw error
  return data
}

export const getMyMaintenanceTickets = async () => {
  const { data, error } = await supabaseTenant
    .from("maintenance")
    .select("*")
    .order("created_at", { ascending: false })
  if (error) throw error
  return data
}

export const createMyMaintenanceTicket = async (tenantId, payload) => {
  const ticket_number = `TKT-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`
  const { data, error } = await supabaseTenant
    .from("maintenance")
    .insert([{ ...payload, tenant_id: tenantId, ticket_number, status: "open" }])
    .select()
    .single()
  if (error) throw error
  return data
}

export const getMyMessagesAsTenant = async (tenantId) => {
  const { data, error } = await supabaseTenant
    .from("messages")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true })
  if (error) throw error
  return data
}

export const sendMessageAsTenant = async (tenantId, senderName, body) => {
  const { data: { user } } = await supabaseTenant.auth.getUser()
  const { error } = await supabaseTenant
    .from("messages")
    .insert([{
      tenant_id: tenantId,
      sender_type: "tenant",
      sender_id: user.id,
      sender_name: senderName,
      body,
    }])
  if (error) throw error
}

// Export supabaseTenant so PortalMessages can use it for realtime
export { supabaseTenant }