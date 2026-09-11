import { supabase } from "../lib/supabase"
import { supabaseTenant } from "../lib/supabaseTenant"

// ─── STAFF-SIDE FUNCTIONS (called from TenantProfile by staff) ───────────────

// Creating/resetting a tenant portal login needs the Supabase Auth Admin API
// (create a user, set a password directly) — that requires the service-role
// key, which never runs in the browser. Both go through the admin-ops Edge
// Function instead. See supabase/functions/admin-ops/index.ts.
const callAdminOps = async (action, payload) => {
  const { data, error } = await supabase.functions.invoke("admin-ops", { body: { action, payload } })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
}

export const createTenantPortalLogin = (tenantId, username, password) =>
  callAdminOps("createTenantPortalLogin", { tenantId, username, password })

export const resetTenantPortalPassword = (tenantPortalUserId, newPassword) =>
  callAdminOps("resetTenantPortalPassword", { tenantPortalUserId, newPassword })

// Just a tenants-table flag — no Auth Admin API needed, safe on the regular
// client (gated by the existing "Permission-based update tenants" RLS policy).
export const toggleTenantPortalAccess = async (tenantId, active) => {
  const { error } = await supabase
    .from("tenants")
    .update({ portal_active: active })
    .eq("id", tenantId)
  if (error) throw error
}

// Powers the staff Messages inbox (MessagesList.jsx) — one row per tenant
// with an active conversation, most recent activity first.
export const getConversations = async () => {
  const { data, error } = await supabase
    .from("tenant_conversations")
    .select("*")
    .order("last_message_at", { ascending: false })
  if (error) throw error
  return data
}

// Total unread tenant messages across every conversation — badge on the
// staff sidebar's Messages nav item.
export const getUnreadMessageCount = async () => {
  const { count, error } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("sender_type", "tenant")
    .eq("is_read", false)
  if (error) throw error
  return count || 0
}

// Called when staff opens a tenant's conversation — marks that tenant's
// unread messages as read (never marks staff's own messages).
export const markTenantMessagesRead = async (tenantId) => {
  const { error } = await supabase
    .from("messages")
    .update({ is_read: true })
    .eq("tenant_id", tenantId)
    .eq("sender_type", "tenant")
    .eq("is_read", false)
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

// STAFF-ONLY — uses the staff `supabase` client, called from TenantProfile.jsx.
// The tenant portal MUST use getMyMessagesAsTenant (below) instead: a tenant
// has no session on this client, so RLS silently returns zero rows here (not
// an error) if this is ever called from the portal by mistake.
export const getMyMessages = async (tenantId) => {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true })
  if (error) throw error
  return data
}

// ─── TENANT PORTAL DATA (uses supabaseTenant — scoped to tenant's own data) ──
// (Tenant portal auth itself lives in TenantAuthContext.jsx.)

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

// Unread staff messages for this tenant — badge on the tenant portal
// sidebar's Messages nav item.
export const getUnreadMessageCountForTenant = async (tenantId) => {
  const { count, error } = await supabaseTenant
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("sender_type", "staff")
    .eq("is_read", false)
  if (error) throw error
  return count || 0
}

// Called when the tenant opens the Messages page — marks staff's messages
// as read (never marks the tenant's own messages).
export const markStaffMessagesReadForTenant = async (tenantId) => {
  const { error } = await supabaseTenant
    .from("messages")
    .update({ is_read: true })
    .eq("tenant_id", tenantId)
    .eq("sender_type", "staff")
    .eq("is_read", false)
  if (error) throw error
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