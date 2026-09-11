import { supabase } from "../lib/supabase"

// Pulls together everything that needs the staff's attention right now,
// straight from existing tables — no separate "notifications" table needed.
// Cleared items are filtered out entirely; read/unread state comes from
// notification_status, scoped to the current user.
export const getNotifications = async (userId) => {
  const today = new Date().toISOString().split("T")[0]
  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

  const [overdueInvoices, expiringLeases, openTickets, unrepliedMessages, statusRows] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, invoice_number, total_amount, tenants(full_name)")
      .eq("status", "overdue")
      .order("due_date", { ascending: true })
      .limit(5),

    supabase
      .from("tenants")
      .select("id, full_name, lease_end")
      .eq("status", "active")
      .gte("lease_end", today)
      .lte("lease_end", in30Days)
      .order("lease_end", { ascending: true })
      .limit(5),

    supabase
      .from("maintenance")
      .select("id, title, priority")
      .in("status", ["open", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(5),

    // Conversations where the tenant's message is the latest one — i.e.
    // staff hasn't replied yet. Keyed by message_id (not tenant_id) so a
    // fresh message from the same tenant always shows as unread again,
    // even if an earlier one from them was already marked read/cleared.
    supabase
      .from("tenant_conversations")
      .select("message_id, tenant_id, tenant_name, last_message, last_message_at")
      .eq("last_sender_type", "tenant")
      .order("last_message_at", { ascending: false })
      .limit(5),

    userId
      ? supabase.from("notification_status").select("notification_key, status").eq("user_id", userId)
      : Promise.resolve({ data: [] }),
  ])

  const statusMap = new Map((statusRows.data || []).map(r => [r.notification_key, r.status]))

  const items = []

  overdueInvoices.data?.forEach(inv => items.push({
    id: `invoice-${inv.id}`,
    type: "overdue_invoice",
    title: `Overdue: ${inv.invoice_number}`,
    subtitle: `${inv.tenants?.full_name || "Tenant"} — PKR ${Number(inv.total_amount).toLocaleString("en-PK")}`,
    link: `/invoices/${inv.id}`,
  }))

  expiringLeases.data?.forEach(t => items.push({
    id: `lease-${t.id}`,
    type: "lease_expiring",
    title: `Lease expiring soon`,
    subtitle: `${t.full_name} — ends ${new Date(t.lease_end).toLocaleDateString("en-PK", { day: "2-digit", month: "short" })}`,
    link: `/tenants/${t.id}`,
  }))

  openTickets.data?.forEach(t => items.push({
    id: `ticket-${t.id}`,
    type: "open_ticket",
    title: `Open maintenance: ${t.title}`,
    subtitle: t.priority ? `Priority: ${t.priority}` : null,
    link: `/maintenance/${t.id}`,
  }))

  unrepliedMessages.data?.forEach(m => items.push({
    id: `message-${m.message_id}`,
    type: "new_message",
    title: `New message from ${m.tenant_name}`,
    subtitle: m.last_message,
    link: `/messages?tenant=${m.tenant_id}`,
  }))

  return items
    .filter(n => statusMap.get(n.id) !== "cleared")
    .map(n => ({ ...n, read: statusMap.get(n.id) === "read" }))
}

export const markNotificationRead = async (userId, key) => {
  if (!userId) return
  const { error } = await supabase
    .from("notification_status")
    .upsert([{ user_id: userId, notification_key: key, status: "read" }], { onConflict: "user_id,notification_key" })
  if (error) throw error
}

export const clearNotification = async (userId, key) => {
  if (!userId) return
  const { error } = await supabase
    .from("notification_status")
    .upsert([{ user_id: userId, notification_key: key, status: "cleared" }], { onConflict: "user_id,notification_key" })
  if (error) throw error
}

export const markAllNotificationsRead = async (userId, keys) => {
  if (!userId || keys.length === 0) return
  const { error } = await supabase
    .from("notification_status")
    .upsert(keys.map(key => ({ user_id: userId, notification_key: key, status: "read" })), { onConflict: "user_id,notification_key" })
  if (error) throw error
}

export const clearAllNotifications = async (userId, keys) => {
  if (!userId || keys.length === 0) return
  const { error } = await supabase
    .from("notification_status")
    .upsert(keys.map(key => ({ user_id: userId, notification_key: key, status: "cleared" })), { onConflict: "user_id,notification_key" })
  if (error) throw error
}