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

  // Security deposit and advance deposit are settled once — only on the
  // tenant's very first invoice — never again on the invoices that follow.
  // Security is ADDED (refundable amount now being billed); advance deposit
  // is SUBTRACTED (already handed over at signing, credited against what's due).
  const { count: priorInvoiceCount, error: countError } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenant.id)
  if (countError) throw countError

  const isFirstInvoice = priorInvoiceCount === 0
  const securityDeposit = isFirstInvoice ? Number(tenant.security_deposit || 0) : 0
  const advanceDeposit = isFirstInvoice ? Number(tenant.advance_deposit || 0) : 0
  const rentAmount = Number(tenant.monthly_rent)
  // Tax is a percentage of rent, set once on the tenant — unlike security/
  // advance deposit, it applies to EVERY invoice, not just the first one.
  // The percentage is recomputed against THIS invoice's rent (so it tracks
  // rent escalation correctly) and the resulting PKR amount is snapshotted
  // onto the invoice, same as before.
  const taxPercentage = Number(tenant.tax_percentage || 0)
  const taxAmount = taxPercentage > 0 ? Math.round(rentAmount * taxPercentage / 100) : 0

  const payload = {
    tenant_id: tenant.id,
    building_id: tenant.building_id,
    unit_id: tenant.unit_id,
    invoice_number: invoiceNumber,
    month,
    year,
    rent_amount: rentAmount,
    maintenance_amount: Number(tenant.maintenance_charges || 0),
    security_deposit_amount: securityDeposit,
    advance_deposit_amount: advanceDeposit,
    tax_amount: taxAmount,
    tax_percentage: taxPercentage,
    tax_type: taxAmount > 0 ? (tenant.tax_type || "Tax") : null,
    other_charges: 0,
    total_amount: rentAmount + Number(tenant.maintenance_charges || 0) + securityDeposit - advanceDeposit + taxAmount,
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

export const invoiceExists = async (tenantId, month, year) => {
  const { data } = await supabase
    .from("invoices")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("month", month)
    .eq("year", year)
    .single()
  return !!data
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
  // tax_amount is intentionally NOT recalculated here — it's snapshotted once
  // at generation time as rent × the tenant's tax_percentage (see
  // generateInvoice), not built up from line items. It's just read here so
  // it can be included in the total, same as rent/maintenance.
  const { data: invoice, error: invErr } = await supabase
    .from("invoices")
    .select("rent_amount, maintenance_amount, security_deposit_amount, advance_deposit_amount, tax_amount")
    .eq("id", invoiceId)
    .single()
  if (invErr) throw invErr

  const [
    { data: charges, error: chErr },
    { data: discounts, error: discErr },
    { data: securityInstallments, error: secErr },
  ] = await Promise.all([
    supabase.from("utility_charges").select("amount").eq("invoice_id", invoiceId),
    supabase.from("invoice_discounts").select("amount").eq("invoice_id", invoiceId),
    supabase.from("invoice_security_installments").select("amount").eq("invoice_id", invoiceId),
  ])
  if (chErr) throw chErr
  if (discErr) throw discErr
  if (secErr) throw secErr

  const utilityTotal = charges.reduce((sum, c) => sum + Number(c.amount), 0)
  const discountTotal = discounts.reduce((sum, d) => sum + Number(d.amount), 0)
  const securityInstallmentTotal = securityInstallments.reduce((sum, s) => sum + Number(s.amount), 0)
  const total = Number(invoice.rent_amount)
    + Number(invoice.maintenance_amount || 0)
    + Number(invoice.security_deposit_amount || 0)
    - Number(invoice.advance_deposit_amount || 0)
    + utilityTotal + Number(invoice.tax_amount || 0) - discountTotal + securityInstallmentTotal

  const { error: updErr } = await supabase
    .from("invoices")
    .update({
      other_charges: utilityTotal,
      discount_amount: discountTotal,
      security_installment_amount: securityInstallmentTotal,
      total_amount: total,
    })
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

// ─── Security deposit installments ─────────────────────────────────────────
// Lets staff manually add a security-deposit installment to ANY invoice, for
// tenants paying their security deposit split across two or more months
// (e.g. half this month with rent, the rest next month) instead of the full
// amount auto-billed on the first invoice.

export const getSecurityInstallments = async (invoiceId) => {
  const { data, error } = await supabase
    .from("invoice_security_installments")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("created_at")
  if (error) throw error
  return data
}

export const addSecurityInstallment = async (invoiceId, amount, notes = null) => {
  const { error } = await supabase
    .from("invoice_security_installments")
    .insert([{ invoice_id: invoiceId, amount: Number(amount), notes }])
  if (error) throw error
  await recalculateInvoiceTotal(invoiceId)
}

export const deleteSecurityInstallment = async (id, invoiceId) => {
  const { error } = await supabase.from("invoice_security_installments").delete().eq("id", id)
  if (error) throw error
  await recalculateInvoiceTotal(invoiceId)
}

export const deleteUtilityCharge = async (id, invoiceId) => {
  const { error } = await supabase.from("utility_charges").delete().eq("id", id)
  if (error) throw error
  await recalculateInvoiceTotal(invoiceId)
}

// Tax used to be a manually-entered per-invoice line item here. It's now a
// percentage-of-rent field on the tenant (tax_type/tax_percentage), applied automatically to
// every invoice in generateInvoice() — see AddTenant.jsx/EditTenant.jsx.

// ─── Invoice discount ───────────────────────────────────────────────────────
// Manually-entered discount lines, kept in their own table (not mixed into
// utility/tax "additional charges") since they subtract from the invoice
// total instead of adding to it. discount_type is free text, same as tax.

export const getInvoiceDiscounts = async (invoiceId) => {
  const { data, error } = await supabase
    .from("invoice_discounts")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("created_at")
  if (error) throw error
  return data
}

export const addInvoiceDiscount = async (invoiceId, discountType, amount) => {
  const { error } = await supabase
    .from("invoice_discounts")
    .insert([{ invoice_id: invoiceId, discount_type: discountType, amount: Number(amount) }])
  if (error) throw error
  await recalculateInvoiceTotal(invoiceId)
}

export const deleteInvoiceDiscount = async (id, invoiceId) => {
  const { error } = await supabase.from("invoice_discounts").delete().eq("id", id)
  if (error) throw error
  await recalculateInvoiceTotal(invoiceId)
}