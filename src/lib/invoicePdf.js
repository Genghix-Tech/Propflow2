// Builds the invoice PDF directly with jsPDF (text/vector drawing, not a screenshot).
// This keeps file size small and text crisp/selectable, unlike html2canvas-based exports.
//
// This file is dynamically imported only when the user clicks "Download PDF" —
// jsPDF never loads into the main bundle, so it costs nothing for users who don't use it.

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

const formatDateLong = (d) => {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
}

const formatMoney = (n) => `PKR ${Number(n || 0).toLocaleString("en-PK")}`

export async function generateInvoicePdf(invoice, utilityCharges = []) {
  const { jsPDF } = await import("jspdf")
  const doc = new jsPDF({ unit: "pt", format: "a4" })

  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 48
  let y = 56

  const brand = [24, 95, 165]   // matches --color-brand-500
  const gray900 = [17, 24, 39]
  const gray500 = [107, 114, 128]
  const gray400 = [156, 163, 175]

  // Header — brand + invoice number/status
  doc.setFont("helvetica", "bold")
  doc.setFontSize(18)
  doc.setTextColor(...gray900)
  doc.text("PropFlow", margin, y)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(...gray400)
  doc.text("Real Estate Management", margin, y + 14)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(16)
  doc.setTextColor(...gray900)
  doc.text(invoice.invoice_number || "", pageWidth - margin, y, { align: "right" })
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(...brand)
  doc.text((invoice.status || "").toUpperCase(), pageWidth - margin, y + 16, { align: "right" })

  y += 40
  doc.setDrawColor(230, 230, 230)
  doc.line(margin, y, pageWidth - margin, y)
  y += 28

  // Billed to / Invoice details — two columns
  const tenant = invoice.tenants
  const colWidth = (pageWidth - margin * 2) / 2

  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.setTextColor(...gray400)
  doc.text("BILLED TO", margin, y)
  doc.text("INVOICE DETAILS", margin + colWidth, y)
  y += 16

  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.setTextColor(...gray900)
  doc.text(tenant?.full_name || "—", margin, y)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(...gray500)
  const detailRows = [
    ["Invoice number", invoice.invoice_number || "—"],
    ["Period", `${MONTHS[invoice.month - 1] || ""} ${invoice.year || ""}`],
    ["Due date", formatDateLong(invoice.due_date)],
  ]
  if (invoice.paid_date) detailRows.push(["Paid on", formatDateLong(invoice.paid_date)])
  if (invoice.payment_method) detailRows.push(["Payment method", invoice.payment_method.replace(/_/g, " ")])

  let detailY = y
  detailRows.forEach(([label, value]) => {
    doc.setTextColor(...gray400)
    doc.text(label, margin + colWidth, detailY)
    doc.setTextColor(...gray900)
    doc.text(String(value), pageWidth - margin, detailY, { align: "right" })
    detailY += 14
  })

  y += 14
  doc.setTextColor(...gray500)
  doc.text(tenant?.phone || "", margin, y)
  y += 14
  doc.text(invoice.buildings?.name || "", margin, y)
  y += 14
  doc.text(invoice.units?.unit_number || "", margin, y)

  y = Math.max(y, detailY) + 28
  doc.setDrawColor(230, 230, 230)
  doc.line(margin, y, pageWidth - margin, y)
  y += 24

  // Charges table
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.setTextColor(...gray400)
  doc.text("DESCRIPTION", margin, y)
  doc.text("AMOUNT", pageWidth - margin, y, { align: "right" })
  y += 8
  doc.setDrawColor(230, 230, 230)
  doc.line(margin, y, pageWidth - margin, y)
  y += 18

  const UTILITY_LABELS = {
  electricity: "Electricity",
  gas: "Gas",
  water: "Water",
  internet: "Internet",
  other: "Other utility",
}

const lineItems = [
    [`Monthly rent — ${MONTHS[invoice.month - 1] || ""} ${invoice.year || ""}`, invoice.rent_amount],
  ]
  if (Number(invoice.maintenance_amount) > 0) lineItems.push(["Maintenance charges", invoice.maintenance_amount])
  utilityCharges.forEach(charge => {
    const label = UTILITY_LABELS[charge.utility_type] || charge.utility_type
    lineItems.push([charge.notes ? `${label} — ${charge.notes}` : label, charge.amount])
  })

  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  lineItems.forEach(([label, amount]) => {
    doc.setTextColor(...gray500)
    doc.text(label, margin, y)
    doc.setTextColor(...gray900)
    doc.text(formatMoney(amount), pageWidth - margin, y, { align: "right" })
    y += 20
  })

  y += 12
  doc.setDrawColor(230, 230, 230)
  doc.line(pageWidth - margin - 180, y, pageWidth - margin, y)
  y += 20

  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.setTextColor(...gray900)
  doc.text("Total due", pageWidth - margin - 180, y)
  doc.setTextColor(...brand)
  doc.text(formatMoney(invoice.total_amount), pageWidth - margin, y, { align: "right" })

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight()
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(...gray400)
  doc.text(
    "PropFlow · Real Estate Management · Thank you for your payment",
    pageWidth / 2, pageHeight - 40, { align: "center" }
  )

  doc.save(`${invoice.invoice_number || "invoice"}.pdf`)
}
