import { supabase } from "../lib/supabase"

const generateInvoiceNumber = async (month, year) => {
  const prefix = `INV-${year}-${String(month).padStart(2, "0")}`
  const { count } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true })
    .like("invoice_number", `${prefix}%`)
  return `${prefix}-${String((count || 0) + 1).padStart(4, "0")}`
}

export const getInvoices = async ({ status = "", building = "", search = "" } = {}) => {
  let query = supabase
    .from("invoices")
    .select(`
      *,
      tenants ( full_name, phone ),
      buildings ( name ),
      units ( unit_number )
    `)
    .order("created_at", { ascending: false })

  if (status) query = query.eq("status", status)
  if (building) query = query.eq("building_id", building)

  const { data, error } = await query
  if (error) throw error

  if (search) {
    return data.filter(inv =>
      inv.tenants?.full_name?.toLowerCase().includes(search.toLowerCase())
    )
  }
  return data
}

export const getInvoiceById = async (id) => {
  const { data, error } = await supabase
    .from("invoices")
    .select(`
      *,
      tenants ( * ),
      buildings ( * ),
      units ( * )
    `)
    .eq("id", id)
    .single()
  if (error) throw error
  return data
}

export const getInvoicesByTenant = async (tenantId) => {
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("year", { ascending: false })
    .order("month", { ascending: false })
  if (error) throw error
  return data
}

export const generateInvoice = async (tenant, month, year) => {
  const dueDate = new Date(year, month - 1, 5)
  const invoiceNumber = await generateInvoiceNumber(month, year)

  const payload = {
    tenant_id: tenant.id,
    building_id: tenant.building_id,
    unit_id: tenant.unit_id,
    invoice_number: invoiceNumber,
    month,
    year,
    rent_amount: Number(tenant.monthly_rent),
    maintenance_amount: Number(tenant.maintenance_charges || 0),
    other_charges: 0,
    total_amount: Number(tenant.monthly_rent) + Number(tenant.maintenance_charges || 0),
    due_date: dueDate.toISOString().split("T")[0],
    status: "pending",
  }

  const { data, error } = await supabase
    .from("invoices")
    .insert([payload])
    .select()
    .single()
  if (error) throw error
  return data
}

export const generateInvoicesForAll = async (tenants, month, year) => {
  const results = { success: 0, skipped: 0, errors: 0 }

  for (const tenant of tenants) {
    const { data: existing } = await supabase
      .from("invoices")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("month", month)
      .eq("year", year)
      .single()

    if (existing) { results.skipped++; continue }

    try {
      await generateInvoice(tenant, month, year)
      results.success++
    } catch {
      results.errors++
    }
  }
  return results
}

export const markAsPaid = async (id, paymentMethod, paidDate, instrumentNumber = "") => {
  const { data, error } = await supabase
    .from("invoices")
    .update({
      status: "paid",
      payment_method: paymentMethod,
      paid_date: paidDate,
      notes: instrumentNumber ? `Ref: ${instrumentNumber}` : null,
    })
    .eq("id", id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateInvoiceStatus = async (id, status) => {
  const { data, error } = await supabase
    .from("invoices")
    .update({ status })
    .eq("id", id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteInvoice = async (id) => {
  const { error } = await supabase.from("invoices").delete().eq("id", id)
  if (error) throw error
}

export const getInvoiceSummary = async () => {
  const { data, error } = await supabase
    .from("invoices")
    .select("status, total_amount")
  if (error) throw error

  return {
    total: data.length,
    paid: data.filter(i => i.status === "paid").length,
    pending: data.filter(i => i.status === "pending").length,
    overdue: data.filter(i => i.status === "overdue").length,
    totalCollected: data
      .filter(i => i.status === "paid")
      .reduce((sum, i) => sum + Number(i.total_amount), 0),
    totalPending: data
      .filter(i => i.status !== "paid")
      .reduce((sum, i) => sum + Number(i.total_amount), 0),
  }
}

// ─── Utility billing ───────────────────────────────────────────────────────
// Itemized utility charges (electricity/gas/water/internet/other) attached to
// an invoice. Each add/delete recalculates the invoice's other_charges + total.

export const getUtilityCharges = async (invoiceId) => {
  const { data, error } = await supabase
    .from("utility_charges")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("created_at")
  if (error) throw error
  return data
}

const recalculateInvoiceTotal = async (invoiceId) => {
  const { data: invoice, error: invErr } = await supabase
    .from("invoices")
    .select("rent_amount, maintenance_amount")
    .eq("id", invoiceId)
    .single()
  if (invErr) throw invErr

  const { data: charges, error: chErr } = await supabase
    .from("utility_charges")
    .select("amount")
    .eq("invoice_id", invoiceId)
  if (chErr) throw chErr

  const utilityTotal = charges.reduce((sum, c) => sum + Number(c.amount), 0)
  const total = Number(invoice.rent_amount) + Number(invoice.maintenance_amount || 0) + utilityTotal

  const { error: updErr } = await supabase
    .from("invoices")
    .update({ other_charges: utilityTotal, total_amount: total })
    .eq("id", invoiceId)
  if (updErr) throw updErr
}

export const addUtilityCharge = async (invoiceId, utilityType, amount, notes = null) => {
  const { error } = await supabase
    .from("utility_charges")
    .insert([{ invoice_id: invoiceId, utility_type: utilityType, amount: Number(amount), notes }])
  if (error) throw error
  await recalculateInvoiceTotal(invoiceId)
}

export const deleteUtilityCharge = async (id, invoiceId) => {
  const { error } = await supabase.from("utility_charges").delete().eq("id", id)
  if (error) throw error
  await recalculateInvoiceTotal(invoiceId)
}