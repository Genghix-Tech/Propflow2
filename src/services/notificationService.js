import { supabase } from "../lib/supabase"

// Pulls together everything that needs the staff's attention right now,
// straight from existing tables — no separate "notifications" table needed.
export const getNotifications = async () => {
  const today = new Date().toISOString().split("T")[0]
  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

  const [overdueInvoices, expiringLeases, newEnquiries, openTickets] = await Promise.all([
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
      .from("enquiries")
      .select("id, full_name, created_at")
      .eq("status", "new")
      .order("created_at", { ascending: false })
      .limit(5),

    supabase
      .from("maintenance")
      .select("id, title, priority")
      .in("status", ["open", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(5),
  ])

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

  newEnquiries.data?.forEach(e => items.push({
    id: `enquiry-${e.id}`,
    type: "new_enquiry",
    title: `New rental enquiry`,
    subtitle: e.full_name,
    link: `/enquiries`,
  }))

  openTickets.data?.forEach(t => items.push({
    id: `ticket-${t.id}`,
    type: "open_ticket",
    title: `Open maintenance: ${t.title}`,
    subtitle: t.priority ? `Priority: ${t.priority}` : null,
    link: `/maintenance/${t.id}`,
  }))

  return items
}
