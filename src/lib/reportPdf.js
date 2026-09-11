// Builds the property report PDF directly with jsPDF (text/vector drawing,
// not a screenshot of the dashboard page). Same approach as invoicePdf.js
// and tenantPdf.js — real text, not a rasterized html2canvas capture.
//
// This file is dynamically imported only when the user clicks Print/Download —
// jsPDF never loads into the main bundle for users who don't use it.

import { COMPANY_NAME, COMPANY_TAGLINE, SOFTWARE_CREDIT } from "./../config/branding"
import { printGeneratedPdf } from "./printPdf"

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

const formatDateLong = (d) => {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-PK", { day: "2-digit", month: "long", year: "numeric" })
}

const formatMoney = (n) => `PKR ${Number(n || 0).toLocaleString("en-PK")}`

const COLOR = {
  brand: [24, 95, 165],
  gray900: [17, 24, 39],
  gray700: [55, 65, 81],
  gray500: [107, 114, 128],
  gray400: [156, 163, 175],
  line: [230, 230, 230],
  green: [22, 163, 74],
  yellow: [180, 130, 20],
  red: [220, 38, 38],
}

export async function generateReportPdf(data, options = {}) {
  const { jsPDF } = await import("jspdf")
  const doc = new jsPDF({ unit: "pt", format: "a4" })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 48
  let y = 56

  const ensureSpace = (needed) => {
    if (y + needed > pageHeight - 60) {
      doc.addPage()
      y = 56
    }
  }

  // Header
  doc.setFont("helvetica", "bold")
  doc.setFontSize(18)
  doc.setTextColor(...COLOR.gray900)
  doc.text(COMPANY_NAME, margin, y)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(...COLOR.gray400)
  doc.text(COMPANY_TAGLINE, margin, y + 14)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(16)
  doc.setTextColor(...COLOR.gray900)
  doc.text("PROPERTY REPORT", pageWidth - margin, y, { align: "right" })
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(...COLOR.gray400)
  doc.text(
    `${MONTHS[data.selectedMonth - 1]} ${data.selectedYear} · Printed ${formatDateLong(new Date())}`,
    pageWidth - margin, y + 16, { align: "right" }
  )

  y += 40
  doc.setDrawColor(...COLOR.line)
  doc.line(margin, y, pageWidth - margin, y)
  y += 28

  // ── Section helper: header + a row of stat boxes ──────────────────────
  const sectionTitle = (title) => {
    ensureSpace(30)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.setTextColor(...COLOR.gray900)
    doc.text(title, margin, y)
    y += 10
    doc.setDrawColor(...COLOR.line)
    doc.line(margin, y, pageWidth - margin, y)
    y += 22
  }

  const statRow = (stats) => {
    ensureSpace(40)
    const colWidth = (pageWidth - margin * 2) / stats.length
    stats.forEach((s, i) => {
      const x = margin + i * colWidth
      doc.setFont("helvetica", "bold")
      doc.setFontSize(13)
      doc.setTextColor(...(s.color || COLOR.gray900))
      doc.text(String(s.value), x, y)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.setTextColor(...COLOR.gray400)
      doc.text(s.label, x, y + 14)
    })
    y += 40
  }

  const tableHeader = (cols) => {
    ensureSpace(24)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(8)
    doc.setTextColor(...COLOR.gray400)
    cols.forEach(c => doc.text(c.label, c.x, y, { align: c.align || "left" }))
    y += 8
    doc.setDrawColor(...COLOR.line)
    doc.line(margin, y, pageWidth - margin, y)
    y += 16
  }

  const emptyRow = (text) => {
    ensureSpace(20)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(...COLOR.gray400)
    doc.text(text, margin, y)
    y += 20
  }

  // ── Financial summary ──────────────────────────────────────────────────
  sectionTitle(`Financial summary — ${MONTHS[data.selectedMonth - 1]} ${data.selectedYear}`)
  statRow([
    { label: "Collected this month", value: formatMoney(data.monthCollected), color: COLOR.green },
    { label: "Pending this month", value: formatMoney(data.monthPending), color: COLOR.yellow },
    { label: "Total collected ever", value: formatMoney(data.invSummary?.totalCollected || 0), color: COLOR.brand },
    { label: "Monthly payroll", value: formatMoney(data.empSummary?.totalSalary || 0), color: COLOR.gray900 },
  ])

  if (data.monthInvoices.length > 0) {
    const cols = [
      { label: "TENANT", x: margin },
      { label: "BUILDING", x: margin + 180 },
      { label: "STATUS", x: margin + 340 },
      { label: "AMOUNT", x: pageWidth - margin, align: "right" },
    ]
    tableHeader(cols)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    data.monthInvoices.forEach(inv => {
      ensureSpace(20)
      doc.setTextColor(...COLOR.gray700)
      doc.text(inv.tenants?.full_name || "—", cols[0].x, y)
      doc.text(inv.buildings?.name || "—", cols[1].x, y)
      doc.setTextColor(...(
        inv.status === "paid" ? COLOR.green :
        inv.status === "overdue" ? COLOR.red :
        COLOR.gray500
      ))
      doc.text((inv.status || "").toUpperCase(), cols[2].x, y)
      doc.setTextColor(...COLOR.gray900)
      doc.text(formatMoney(inv.total_amount), cols[3].x, y, { align: "right" })
      y += 18
    })
    y += 10
  } else {
    emptyRow(`No invoices for ${MONTHS[data.selectedMonth - 1]} ${data.selectedYear}`)
  }
  y += 14

  // ── Occupancy by building ──────────────────────────────────────────────
  sectionTitle("Occupancy by building")
  if (data.buildingStats.length > 0) {
    const cols = [
      { label: "BUILDING", x: margin },
      { label: "TOTAL", x: margin + 260, align: "right" },
      { label: "OCCUPIED", x: margin + 340, align: "right" },
      { label: "VACANT", x: margin + 420, align: "right" },
      { label: "OCC. %", x: pageWidth - margin, align: "right" },
    ]
    tableHeader(cols)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    data.buildingStats.forEach(b => {
      ensureSpace(20)
      doc.setTextColor(...COLOR.gray700)
      doc.text(b.name, cols[0].x, y)
      doc.setTextColor(...COLOR.gray900)
      doc.text(String(b.total), cols[1].x, y, { align: "right" })
      doc.text(String(b.occupied), cols[2].x, y, { align: "right" })
      doc.text(String(b.vacant), cols[3].x, y, { align: "right" })
      doc.text(`${b.pct}%`, cols[4].x, y, { align: "right" })
      y += 18
    })
    y += 10
  } else {
    emptyRow("No buildings added yet")
  }
  y += 14

  // ── Tenant status breakdown ────────────────────────────────────────────
  sectionTitle("Tenant status breakdown")
  statRow([
    { label: "Active", value: data.activeTenants, color: COLOR.green },
    { label: "Expiring", value: data.expiringTenants, color: COLOR.yellow },
    { label: "Overdue", value: data.overdueTenants, color: COLOR.red },
    { label: "Total", value: data.totalTenants, color: COLOR.gray900 },
  ])
  y += 14

  // ── Overdue rent ────────────────────────────────────────────────────────
  if (data.overdueList.length > 0) {
    sectionTitle(`Overdue rent (${data.overdueList.length} tenants)`)
    const cols = [
      { label: "TENANT", x: margin },
      { label: "BUILDING · UNIT", x: margin + 160 },
      { label: "PHONE", x: margin + 340 },
      { label: "MONTHLY RENT", x: pageWidth - margin, align: "right" },
    ]
    tableHeader(cols)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    data.overdueList.forEach(t => {
      ensureSpace(20)
      doc.setTextColor(...COLOR.gray900)
      doc.text(t.full_name, cols[0].x, y)
      doc.setTextColor(...COLOR.gray500)
      doc.text(`${t.buildings?.name || ""} · ${t.units?.unit_number || ""}`, cols[1].x, y)
      doc.text(t.phone || "—", cols[2].x, y)
      doc.setTextColor(...COLOR.red)
      doc.text(formatMoney(t.monthly_rent), cols[3].x, y, { align: "right" })
      y += 18
    })
    y += 24
  }

  // ── Expiring leases ─────────────────────────────────────────────────────
  if (data.expiringList.length > 0) {
    sectionTitle(`Expiring leases (${data.expiringList.length} tenants)`)
    const cols = [
      { label: "TENANT", x: margin },
      { label: "BUILDING · UNIT", x: margin + 160 },
      { label: "LEASE ENDS", x: margin + 340 },
      { label: "DAYS LEFT", x: pageWidth - margin, align: "right" },
    ]
    tableHeader(cols)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    data.expiringList.forEach(t => {
      ensureSpace(20)
      doc.setTextColor(...COLOR.gray900)
      doc.text(t.full_name, cols[0].x, y)
      doc.setTextColor(...COLOR.gray500)
      doc.text(`${t.buildings?.name || ""} · ${t.units?.unit_number || ""}`, cols[1].x, y)
      doc.text(formatDateLong(t.lease_end), cols[2].x, y)
      doc.setTextColor(...(t.daysLeft <= 30 ? COLOR.red : COLOR.yellow))
      doc.text(`${t.daysLeft} days`, cols[3].x, y, { align: "right" })
      y += 18
    })
    y += 24
  }

  // ── Staff summary ───────────────────────────────────────────────────────
  sectionTitle("Staff summary")
  statRow([
    { label: "Total staff", value: data.empSummary?.total || 0, color: COLOR.gray900 },
    { label: "Active", value: data.empSummary?.active || 0, color: COLOR.green },
    { label: "On leave", value: data.empSummary?.onLeave || 0, color: COLOR.yellow },
    { label: "Monthly payroll", value: formatMoney(data.empSummary?.totalSalary || 0), color: COLOR.brand },
  ])
  y += 14

  // ── Maintenance summary ─────────────────────────────────────────────────
  sectionTitle("Maintenance summary")
  statRow([
    { label: "Open tickets", value: data.maintSummary?.open || 0, color: COLOR.red },
    { label: "In progress", value: data.maintSummary?.inProgress || 0, color: COLOR.yellow },
    { label: "Resolved", value: data.maintSummary?.resolved || 0, color: COLOR.green },
    { label: "Total cost", value: formatMoney(data.maintSummary?.totalCost || 0), color: COLOR.gray900 },
  ])

  // Footer on every page
  const pageCount = doc.internal.getNumberOfPages()
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(...COLOR.gray400)
    doc.text(
      `${COMPANY_NAME} · Real Estate Management · Confidential report · Powered by ${SOFTWARE_CREDIT}`,
      pageWidth / 2, pageHeight - 40, { align: "center" }
    )
    if (pageCount > 1) {
      doc.text(`Page ${p} of ${pageCount}`, pageWidth - margin, pageHeight - 40, { align: "right" })
    }
  }

  if (options.print) {
    printGeneratedPdf(doc)
  } else {
    doc.save(`report_${MONTHS[data.selectedMonth - 1]}_${data.selectedYear}.pdf`)
  }
}
