import { useQuery } from "@tanstack/react-query"
import { getTenants, getBuildings } from "../../services/tenantService"
import { getInvoices, getInvoiceSummary } from "../../services/invoiceService"
import { getEmployeeSummary } from "../../services/employeeService"
import { getMaintenanceSummary } from "../../services/maintenanceService"
import { formatCurrency, formatDate } from "../../lib/utils"
import { useState } from "react"
import toast from "react-hot-toast"
import { COMPANY_NAME } from "../../config/branding"

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
]

export default function Reports() {
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [selectedYear, setSelectedYear]   = useState(now.getFullYear())
  const [exporting, setExporting] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  const { data: tenants = [] }    = useQuery({ queryKey: ["tenants"],    queryFn: () => getTenants() })
  const { data: buildings = [] }  = useQuery({ queryKey: ["buildings"],  queryFn: getBuildings })
  const { data: invoices = [] }   = useQuery({ queryKey: ["invoices","","",""], queryFn: () => getInvoices() })
  const { data: invSummary }      = useQuery({ queryKey: ["invoice-summary"],   queryFn: getInvoiceSummary })
  const { data: empSummary }      = useQuery({ queryKey: ["employee-summary"],  queryFn: getEmployeeSummary })
  const { data: maintSummary }    = useQuery({ queryKey: ["maintenance-summary"], queryFn: getMaintenanceSummary })

  // Filter invoices by selected month/year
  const monthInvoices = invoices.filter(inv =>
    inv.month === selectedMonth && inv.year === selectedYear
  )
  const monthCollected = monthInvoices
    .filter(i => i.status === "paid")
    .reduce((sum, i) => sum + Number(i.total_amount), 0)
  const monthPending = monthInvoices
    .filter(i => i.status !== "paid" && i.status !== "cancelled")
    .reduce((sum, i) => sum + Number(i.total_amount), 0)

  // Tenant stats
  const activeTenants   = tenants.filter(t => t.status === "active").length
  const expiringTenants = tenants.filter(t => t.status === "expiring").length
  const overdueTenants  = tenants.filter(t => t.status === "overdue").length

  // Building occupancy
  const buildingStats = buildings.map(b => {
    const total    = b.units?.length || 0
    const occupied = b.units?.filter(u => u.is_occupied).length || 0
    return { ...b, total, occupied, vacant: total - occupied,
      pct: total > 0 ? Math.round((occupied / total) * 100) : 0 }
  })

  // Overdue tenants list
  const overdueList = tenants.filter(t => t.status === "overdue")

  // Expiring leases
  const expiringList = tenants
    .filter(t => t.status === "expiring" || (t.lease_end && (() => {
      const days = Math.ceil((new Date(t.lease_end) - new Date()) / (1000 * 60 * 60 * 24))
      return days > 0 && days <= 60
    })()))
    .map(t => ({
      ...t,
      daysLeft: t.lease_end
        ? Math.ceil((new Date(t.lease_end) - new Date()) / (1000 * 60 * 60 * 24))
        : null
    }))
    .sort((a, b) => (a.daysLeft || 999) - (b.daysLeft || 999))

  const buildReportData = () => ({
    selectedMonth, selectedYear,
    monthCollected, monthPending,
    invSummary, empSummary, maintSummary,
    activeTenants, expiringTenants, overdueTenants,
    totalTenants: tenants.length,
    monthInvoices, buildingStats, overdueList, expiringList,
  })

  const handlePrint = async () => {
    setPrinting(true)
    try {
      const { generateReportPdf } = await import("../../lib/reportPdf")
      generateReportPdf(buildReportData(), { print: true })
    } catch (err) {
      toast.error("Failed to prepare print: " + err.message)
    } finally {
      setPrinting(false)
    }
  }

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true)
    try {
      const { generateReportPdf } = await import("../../lib/reportPdf")
      generateReportPdf(buildReportData())
    } catch (err) {
      toast.error("Failed to generate PDF: " + err.message)
    } finally {
      setDownloadingPdf(false)
    }
  }

  const handleExportExcel = async () => {
    setExporting(true)
    try {
      const { exportToExcel } = await import("../../lib/excelExport")

      const summarySheet = [
        { Metric: "Collected this month", Value: monthCollected },
        { Metric: "Pending this month", Value: monthPending },
        { Metric: "Total collected ever", Value: invSummary?.totalCollected || 0 },
        { Metric: "Total pending ever", Value: invSummary?.totalPending || 0 },
        { Metric: "Monthly payroll", Value: empSummary?.totalSalary || 0 },
        { Metric: "Active tenants", Value: activeTenants },
        { Metric: "Expiring tenants", Value: expiringTenants },
        { Metric: "Overdue tenants", Value: overdueTenants },
        { Metric: "Total tenants", Value: tenants.length },
      ]

      const invoicesSheet = monthInvoices.map(inv => ({
        "Invoice number": inv.invoice_number,
        "Tenant": inv.tenants?.full_name || "",
        "Building": inv.buildings?.name || "",
        "Unit": inv.units?.unit_number || "",
        "Amount": Number(inv.total_amount || 0),
        "Status": inv.status,
      }))

      const occupancySheet = buildingStats.map(b => ({
        "Building": b.name,
        "Address": b.address || "",
        "Total units": b.total,
        "Occupied": b.occupied,
        "Vacant": b.vacant,
        "Occupancy %": b.pct,
      }))

      const overdueSheet = overdueList.map(t => ({
        "Tenant": t.full_name,
        "Building": t.buildings?.name || "",
        "Unit": t.units?.unit_number || "",
        "Phone": t.phone || "",
        "Monthly rent": Number(t.monthly_rent || 0),
      }))

      const expiringSheet = expiringList.map(t => ({
        "Tenant": t.full_name,
        "Building": t.buildings?.name || "",
        "Unit": t.units?.unit_number || "",
        "Lease end": t.lease_end || "",
        "Days left": t.daysLeft,
      }))

      const staffSheet = [
        { Metric: "Total staff", Value: empSummary?.total || 0 },
        { Metric: "Active", Value: empSummary?.active || 0 },
        { Metric: "On leave", Value: empSummary?.onLeave || 0 },
        { Metric: "Monthly payroll", Value: empSummary?.totalSalary || 0 },
      ]

      const maintenanceSheet = [
        { Metric: "Open tickets", Value: maintSummary?.open || 0 },
        { Metric: "In progress", Value: maintSummary?.inProgress || 0 },
        { Metric: "Resolved", Value: maintSummary?.resolved || 0 },
        { Metric: "Total cost", Value: maintSummary?.totalCost || 0 },
      ]

      const period = `${MONTHS[selectedMonth - 1]} ${selectedYear}`
      await exportToExcel([
        { name: "Financial Summary", rows: summarySheet, title: `${COMPANY_NAME} — Financial Summary — ${period}` },
        { name: `Invoices ${MONTHS[selectedMonth - 1]} ${selectedYear}`, rows: invoicesSheet, title: `${COMPANY_NAME} — Invoices — ${period}` },
        { name: "Occupancy", rows: occupancySheet, title: `${COMPANY_NAME} — Occupancy by Building` },
        { name: "Overdue Tenants", rows: overdueSheet, title: `${COMPANY_NAME} — Overdue Rent` },
        { name: "Expiring Leases", rows: expiringSheet, title: `${COMPANY_NAME} — Expiring Leases` },
        { name: "Staff Summary", rows: staffSheet, title: `${COMPANY_NAME} — Staff Summary` },
        { name: "Maintenance Summary", rows: maintenanceSheet, title: `${COMPANY_NAME} — Maintenance Summary` },
      ], `report_${MONTHS[selectedMonth - 1]}_${selectedYear}.xlsx`)
    } catch (err) {
      toast.error("Failed to export: " + err.message)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Print header */}
      <div className="print-only mb-6 pb-4 border-b-2 border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">{COMPANY_NAME}</div>
            <div className="text-sm text-gray-400">Real Estate Management</div>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold text-gray-700">Property Report</div>
            <div className="text-sm text-gray-400">
              {MONTHS[selectedMonth - 1]} {selectedYear} · Printed {formatDate(new Date())}
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="no-print flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Reports</h2>
          <p className="text-sm text-gray-400 mt-0.5">Complete overview of your properties</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}
            className="text-sm px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
            className="text-sm px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={handlePrint} disabled={printing}
            className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition disabled:opacity-60">
            {printing
              ? <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
            }
            Print report
          </button>
          <button onClick={handleDownloadPdf} disabled={downloadingPdf}
            className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition disabled:opacity-60">
            {downloadingPdf
              ? <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H8a2 2 0 01-2-2V5a2 2 0 012-2h6l6 6v11a2 2 0 01-2 2z" />
                </svg>
            }
            {downloadingPdf ? "Generating..." : "Download PDF"}
          </button>
          <button onClick={handleExportExcel} disabled={exporting}
            className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition disabled:opacity-60">
            {exporting
              ? <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H8a2 2 0 01-2-2V5a2 2 0 012-2h6l6 6v11a2 2 0 01-2 2z" />
                </svg>
            }
            {exporting ? "Exporting..." : "Export to Excel"}
          </button>
        </div>
      </div>

      {/* Monthly financial summary */}
      <Section title={`Financial summary — ${MONTHS[selectedMonth - 1]} ${selectedYear}`}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Collected this month", value: formatCurrency(monthCollected), color: "text-green-600", bg: "bg-green-50" },
            { label: "Pending this month",   value: formatCurrency(monthPending),   color: "text-yellow-600", bg: "bg-yellow-50" },
            { label: "Total collected ever", value: formatCurrency(invSummary?.totalCollected || 0), color: "text-brand-600", bg: "bg-brand-50" },
            { label: "Monthly payroll",      value: formatCurrency(empSummary?.totalSalary || 0),    color: "text-purple-600", bg: "bg-purple-50" },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-2xl p-4`}>
              <div className={`text-xl font-semibold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Monthly invoices table */}
        {monthInvoices.length > 0 && (
          <div className="mt-4 overflow-hidden rounded-xl border border-gray-100">
            <table className="w-full">
              <thead>
                <tr className="text-xs font-medium text-gray-400 uppercase tracking-wide bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3">Tenant</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">Building</th>
                  <th className="text-right px-4 py-3">Amount</th>
                  <th className="text-left px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {monthInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {inv.tenants?.full_name || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400 hidden sm:table-cell">
                      {inv.buildings?.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                      {formatCurrency(inv.total_amount)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-lg capitalize ${
                        inv.status === "paid"      ? "bg-green-50 text-green-700" :
                        inv.status === "overdue"   ? "bg-red-50 text-red-700" :
                        inv.status === "cancelled" ? "bg-gray-100 text-gray-400" :
                        "bg-yellow-50 text-yellow-700"
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {monthInvoices.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            No invoices for {MONTHS[selectedMonth - 1]} {selectedYear}
          </div>
        )}
      </Section>

      {/* Portfolio overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Occupancy by building */}
        <Section title="Occupancy by building">
          {buildingStats.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm">No buildings added yet</div>
          ) : buildingStats.map(b => (
            <div key={b.id} className="mb-4 last:mb-0">
              <div className="flex justify-between items-center mb-1.5">
                <div>
                  <div className="text-sm font-medium text-gray-900">{b.name}</div>
                  <div className="text-xs text-gray-400">{b.address || "—"}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">{b.pct}%</div>
                  <div className="text-xs text-gray-400">{b.occupied}/{b.total} units</div>
                </div>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${
                  b.pct >= 90 ? "bg-green-500" :
                  b.pct >= 70 ? "bg-brand-500" : "bg-yellow-500"
                }`} style={{ width: `${b.pct}%` }} />
              </div>
            </div>
          ))}
        </Section>

        {/* Tenant status breakdown */}
        <Section title="Tenant status breakdown">
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: "Active",   count: activeTenants,   color: "bg-green-50 text-green-700" },
              { label: "Expiring", count: expiringTenants, color: "bg-yellow-50 text-yellow-700" },
              { label: "Overdue",  count: overdueTenants,  color: "bg-red-50 text-red-700" },
              { label: "Total",    count: tenants.length,  color: "bg-gray-50 text-gray-700" },
            ].map(s => (
              <div key={s.label} className={`${s.color} rounded-xl p-3 text-center`}>
                <div className="text-2xl font-semibold">{s.count}</div>
                <div className="text-xs mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* Overdue rent */}
      {overdueList.length > 0 && (
        <Section title={`Overdue rent (${overdueList.length} tenants)`}>
          <div className="overflow-hidden rounded-xl border border-red-100">
            <table className="w-full">
              <thead>
                <tr className="text-xs font-medium text-gray-400 uppercase tracking-wide bg-red-50 border-b border-red-100">
                  <th className="text-left px-4 py-3">Tenant</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">Building · Unit</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">Phone</th>
                  <th className="text-right px-4 py-3">Monthly rent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-50">
                {overdueList.map(t => (
                  <tr key={t.id} className="hover:bg-red-50 transition">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{t.full_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden sm:table-cell">
                      {t.buildings?.name} · {t.units?.unit_number}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden sm:table-cell">{t.phone}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-red-600 text-right">
                      {formatCurrency(t.monthly_rent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Expiring leases */}
      {expiringList.length > 0 && (
        <Section title={`Expiring leases (${expiringList.length} tenants)`}>
          <div className="overflow-hidden rounded-xl border border-yellow-100">
            <table className="w-full">
              <thead>
                <tr className="text-xs font-medium text-gray-400 uppercase tracking-wide bg-yellow-50 border-b border-yellow-100">
                  <th className="text-left px-4 py-3">Tenant</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">Building · Unit</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">Lease ends</th>
                  <th className="text-right px-4 py-3">Days left</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-yellow-50">
                {expiringList.map(t => (
                  <tr key={t.id} className="hover:bg-yellow-50 transition">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{t.full_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden sm:table-cell">
                      {t.buildings?.name} · {t.units?.unit_number}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden sm:table-cell">
                      {formatDate(t.lease_end)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
                        t.daysLeft <= 30
                          ? "bg-red-50 text-red-700"
                          : "bg-yellow-50 text-yellow-700"
                      }`}>
                        {t.daysLeft} days
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Staff + maintenance summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <Section title="Staff summary">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Total staff",     value: empSummary?.total    || 0, color: "bg-gray-50 text-gray-700" },
              { label: "Active",          value: empSummary?.active   || 0, color: "bg-green-50 text-green-700" },
              { label: "On leave",        value: empSummary?.onLeave  || 0, color: "bg-yellow-50 text-yellow-700" },
              { label: "Monthly payroll", value: formatCurrency(empSummary?.totalSalary || 0), color: "bg-brand-50 text-brand-700" },
            ].map(s => (
              <div key={s.label} className={`${s.color} rounded-xl p-3 text-center`}>
                <div className="text-lg font-semibold">{s.value}</div>
                <div className="text-xs mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Maintenance summary">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Open tickets",   value: maintSummary?.open        || 0, color: "bg-red-50 text-red-700" },
              { label: "In progress",    value: maintSummary?.inProgress  || 0, color: "bg-yellow-50 text-yellow-700" },
              { label: "Resolved",       value: maintSummary?.resolved    || 0, color: "bg-green-50 text-green-700" },
              { label: "Total cost",     value: formatCurrency(maintSummary?.totalCost || 0), color: "bg-orange-50 text-orange-700" },
            ].map(s => (
              <div key={s.label} className={`${s.color} rounded-xl p-3 text-center`}>
                <div className="text-lg font-semibold">{s.value}</div>
                <div className="text-xs mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* Print footer */}
      <div className="print-only mt-8 pt-4 border-t border-gray-200 text-center text-xs text-gray-400">
        {COMPANY_NAME} · Real Estate Management · Confidential report
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
      <h3 className="text-sm font-semibold text-gray-900 pb-3 border-b border-gray-100">
        {title}
      </h3>
      {children}
    </div>
  )
}