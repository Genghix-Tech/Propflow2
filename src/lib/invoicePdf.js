// Builds the invoice PDF directly with jsPDF (text/vector drawing, not a screenshot).
// This keeps file size small and text crisp/selectable, unlike html2canvas-based exports.
//
// This file is dynamically imported only when the user clicks "Download PDF" —
// jsPDF never loads into the main bundle, so it costs nothing for users who don't use it.
//
// Default template — plain text header (company name/tagline from config),
// no letterhead background image. Content is center-aligned down the page,
// no bordered table.

import { printGeneratedPdf } from "./printPdf"
import { COMPANY_NAME, COMPANY_TAGLINE } from "../config/branding"

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

const UTILITY_LABELS = {
  electricity: "Electricity",
  gas: "Gas",
  water: "Water",
  internet: "Internet",
  other: "Other utility",
}

const formatDateLong = (d) => {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
}

const formatMoney = (n) => `PKR ${Number(n || 0).toLocaleString("en-PK")}`

export async function generateInvoicePdf(invoice, utilityCharges = [], discountCharges = [], securityInstallments = [], bankInfo = "", options = {}) {
  const { jsPDF } = await import("jspdf")
  const doc = new jsPDF({ unit: "pt", format: "a4" })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // Symmetric margins, content centered on the page — no reserved logo column.
  const margin = 48
  const centerX = pageWidth / 2
  const maxTextWidth = pageWidth - margin * 2 - 20

  const brand = [24, 95, 165]   // matches --color-brand-500
  const gray900 = [17, 24, 39]
  const gray700 = [55, 65, 81]
  const gray500 = [107, 114, 128]
  const gray400 = [156, 163, 175]
  const green = [22, 163, 74]
  const red = [220, 38, 38]

  let y = 56

  // Header — plain company name/tagline, centered.
  doc.setFont("helvetica", "bold")
  doc.setFontSize(18)
  doc.setTextColor(...gray900)
  doc.text(COMPANY_NAME, centerX, y, { align: "center" })
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(...gray400)
  doc.text(COMPANY_TAGLINE, centerX, y + 14, { align: "center" })

  y += 40
  doc.setDrawColor(230, 230, 230)
  doc.line(margin, y, pageWidth - margin, y)
  y += 30

  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.setTextColor(...gray900)
  doc.text("INVOICE", centerX, y, { align: "center" })

  y += 20
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(...gray500)
  doc.text(`Ref No: ${invoice.invoice_number || "—"}   |   Date: ${formatDateLong(invoice.created_at)}`, centerX, y, { align: "center" })

  y += 26
  doc.setDrawColor(225, 225, 225)
  doc.line(centerX - 90, y, centerX + 90, y)
  y += 24

  // "Billed to" block
  const tenant = invoice.tenants
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.setTextColor(...gray400)
  doc.text("BILLED TO", centerX, y, { align: "center" })
  y += 16
  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.setTextColor(...gray900)
  doc.text(tenant?.full_name || "—", centerX, y, { align: "center" })
  y += 15
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(...gray500)
  const addressBits = [invoice.buildings?.name, invoice.units?.unit_number ? `Unit / Office # ${invoice.units.unit_number}` : null, tenant?.phone]
    .filter(Boolean)
  addressBits.forEach(line => { doc.text(line, centerX, y, { align: "center" }); y += 13 })

  y += 16
  doc.setDrawColor(225, 225, 225)
  doc.line(centerX - 90, y, centerX + 90, y)
  y += 26

  // Charges — one centered line per item, ending in a bold Total due line.
  const rows = [
    [`Monthly rent — ${MONTHS[invoice.month - 1] || ""} ${invoice.year || ""}`, formatMoney(invoice.rent_amount), false],
  ]
  if (Number(invoice.maintenance_amount) > 0) {
    rows.push(["Maintenance charges", formatMoney(invoice.maintenance_amount), false])
  }
  if (Number(invoice.security_deposit_amount) > 0) {
    rows.push(["Security deposit (one-time)", formatMoney(invoice.security_deposit_amount), false])
  }
  if (Number(invoice.advance_deposit_amount) > 0) {
    rows.push(["Advance deposit paid (credit)", `-${formatMoney(invoice.advance_deposit_amount)}`, true])
  }
  securityInstallments.forEach(inst => {
    rows.push([inst.notes ? `Security deposit installment — ${inst.notes}` : "Security deposit installment", formatMoney(inst.amount), false])
  })
  utilityCharges.forEach(charge => {
    const label = UTILITY_LABELS[charge.utility_type] || charge.utility_type
    rows.push([charge.notes ? `${label} — ${charge.notes}` : label, formatMoney(charge.amount), false])
  })
  // Tax is a fixed field set on the tenant (see AddTenant.jsx), snapshotted
  // onto the invoice at generation time — not a manually-added line item.
  if (Number(invoice.tax_amount) > 0) {
    const taxLabel = `${invoice.tax_type || "Tax"}${invoice.tax_percentage ? ` (${invoice.tax_percentage}%)` : ""}`
    rows.push([taxLabel, formatMoney(invoice.tax_amount), false])
  }
  discountCharges.forEach(discount => {
    rows.push([discount.discount_type || "Discount", `-${formatMoney(discount.amount)}`, true])
  })

  doc.setFontSize(10)
  rows.forEach(([label, amount, isCredit]) => {
    doc.setFont("helvetica", "normal")
    doc.setTextColor(...(isCredit ? green : gray700))
    doc.text(`${label}:  ${amount}`, centerX, y, { align: "center" })
    y += 18
  })

  y += 8
  doc.setDrawColor(225, 225, 225)
  doc.line(centerX - 90, y, centerX + 90, y)
  y += 24

  doc.setFont("helvetica", "bold")
  doc.setFontSize(13)
  doc.setTextColor(...brand)
  doc.text(`Total due:  ${formatMoney(invoice.total_amount)}`, centerX, y, { align: "center" })

  y += 30

  // Payment status line
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  if (invoice.status === "paid" && invoice.paid_date) {
    doc.setTextColor(...green)
    doc.text(
      `Paid on ${formatDateLong(invoice.paid_date)}${invoice.payment_method ? ` via ${invoice.payment_method.replace(/_/g, " ")}` : ""}`,
      centerX, y, { align: "center" }
    )
    y += 18
  } else if (invoice.due_date) {
    doc.setTextColor(...red)
    doc.text(`Kindly clear this invoice before ${formatDateLong(invoice.due_date)}.`, centerX, y, { align: "center" })
    y += 18
  }
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(...brand)
  doc.text((invoice.status || "").toUpperCase(), centerX, y, { align: "center" })
  y += 28

  // Bank / payment-receiving details — set once in Settings, printed on every invoice.
  if (bankInfo && bankInfo.trim()) {
    doc.setDrawColor(225, 225, 225)
    doc.line(centerX - 90, y, centerX + 90, y)
    y += 20
    doc.setFont("helvetica", "bold")
    doc.setFontSize(8)
    doc.setTextColor(...gray400)
    doc.text("PAYMENT DETAILS", centerX, y, { align: "center" })
    y += 15
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(...gray700)
    const bankLines = doc.splitTextToSize(bankInfo.trim(), maxTextWidth)
    bankLines.forEach(line => { doc.text(line, centerX, y, { align: "center" }); y += 13 })
  }

  // Fixed footer notes, near the bottom of the page.
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(...gray400)
  doc.text("This is a system-generated invoice and does not require a signature.", pageWidth / 2, pageHeight - 60, { align: "center" })
  doc.setFontSize(7.5)
  doc.text("Developed by GENGHIX TECH  ·  www.genghixtech.com  ·  info@genghixtech.com  ·  +92 327 5534726", pageWidth / 2, pageHeight - 46, { align: "center" })

  // "Print" sends the real generated document straight to the print dialog
  // (via a hidden iframe) instead of window.print()-ing the styled dashboard
  // page — no visible PDF tab, just the print dialog.
  if (options.print) {
    printGeneratedPdf(doc)
  } else {
    doc.save(`${invoice.invoice_number || "invoice"}.pdf`)
  }
}
