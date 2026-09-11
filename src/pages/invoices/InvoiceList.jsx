import { formatCurrency, formatDateShort } from "../../lib/utils"
import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import {
  getInvoices, getInvoiceSummary,
  generateInvoice, generateInvoicesForAll, invoiceExists, markAsPaid,
  updateInvoiceStatus, deleteInvoice
} from "../../services/invoiceService"
import { getTenants, getBuildings } from "../../services/tenantService"
import SearchableSelect from "../../components/ui/SearchableSelect"
import { COMPANY_NAME } from "../../config/branding"
import toast from "react-hot-toast"

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
]

const statusStyle = {
  paid:      "bg-green-50 text-green-700",
  pending:   "bg-yellow-50 text-yellow-700",
  overdue:   "bg-red-50 text-red-700",
  cancelled: "bg-gray-100 text-gray-400",
}

export default function InvoiceList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const now = new Date()

  const [search, setSearch]       = useState("")
  const [status, setStatus]       = useState("")
  const [building, setBuilding]   = useState("")
  const [generating, setGenerating] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [showPayModal, setShowPayModal] = useState(null)
  const [payMethod, setPayMethod] = useState("bank_transfer")
  const [payDate, setPayDate]     = useState(now.toISOString().split("T")[0])
  const [genMonth, setGenMonth]   = useState(now.getMonth() + 1)
  const [genYear, setGenYear]     = useState(now.getFullYear())
  const [genTenantId, setGenTenantId] = useState("") // "" = all active tenants

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices", search, status, building],
    queryFn: () => getInvoices({ search, status, building }),
  })

  const { data: summary } = useQuery({
    queryKey: ["invoice-summary"],
    queryFn: getInvoiceSummary,
  })

  const { data: buildings = [] } = useQuery({
    queryKey: ["buildings"],
    queryFn: getBuildings,
  })

  const { data: allTenants = [] } = useQuery({
    queryKey: ["tenants"],
    queryFn: () => getTenants(),
  })

  const handleGenerateAll = async () => {
    // Single tenant selected — create just their invoice (e.g. rent was
    // just changed, or they were added mid-month and missed the bulk run).
    if (genTenantId) {
      const tenant = allTenants.find(t => t.id === genTenantId)
      if (!tenant) return
      if (!confirm(`Create ${MONTHS[genMonth - 1]} ${genYear} invoice for ${tenant.full_name}?`)) return
      setGenerating(true)
      try {
        const alreadyExists = await invoiceExists(tenant.id, genMonth, genYear)
        if (alreadyExists) {
          toast.error(`${tenant.full_name} already has an invoice for ${MONTHS[genMonth - 1]} ${genYear}`)
          return
        }

        await generateInvoice(tenant, genMonth, genYear)
        toast.success(`Invoice created for ${tenant.full_name}`)
        queryClient.invalidateQueries(["invoices"])
        queryClient.invalidateQueries(["invoice-summary"])
      } catch (err) {
        toast.error("Failed to create invoice: " + err.message)
      } finally {
        setGenerating(false)
      }
      return
    }

    // No tenant selected — bulk-generate for every active tenant, as before.
    if (!confirm(`Generate invoices for ${MONTHS[genMonth - 1]} ${genYear} for all active tenants?`)) return
    setGenerating(true)
    try {
      const activeTenants = allTenants.filter(t => t.status === "active" || t.status === "expiring")
      const result = await generateInvoicesForAll(activeTenants, genMonth, genYear)
      toast.success(`Done! ${result.success} generated, ${result.skipped} already existed`)
      queryClient.invalidateQueries(["invoices"])
      queryClient.invalidateQueries(["invoice-summary"])
    } catch {
      toast.error("Failed to generate invoices")
    } finally {
      setGenerating(false)
    }
  }

  const handleMarkPaid = async () => {
    try {
      await markAsPaid(showPayModal, payMethod, payDate)
      toast.success("Marked as paid!")
      setShowPayModal(null)
      queryClient.invalidateQueries(["invoices"])
      queryClient.invalidateQueries(["invoice-summary"])
    } catch {
      toast.error("Failed to update")
    }
  }

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateInvoiceStatus(id, newStatus)
      toast.success("Status updated")
      queryClient.invalidateQueries(["invoices"])
      queryClient.invalidateQueries(["invoice-summary"])
    } catch {
      toast.error("Failed to update status")
    }
  }

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    if (!confirm("Delete this invoice? This cannot be undone.")) return
    try {
      await deleteInvoice(id)
      toast.success("Invoice deleted")
      queryClient.invalidateQueries(["invoices"])
      queryClient.invalidateQueries(["invoice-summary"])
    } catch {
      toast.error("Failed to delete")
    }
  }

  const handleExportExcel = async () => {
    if (invoices.length === 0) { toast.error("No invoices to export"); return }
    setExporting(true)
    try {
      const { exportToExcel } = await import("../../lib/excelExport")
      const rows = invoices.map(inv => ({
        "Invoice number": inv.invoice_number,
        "Tenant": inv.tenants?.full_name || "",
        "Phone": inv.tenants?.phone || "",
        "Building": inv.buildings?.name || "",
        "Unit": inv.units?.unit_number || "",
        "Period": `${MONTHS[inv.month - 1]} ${inv.year}`,
        "Due date": inv.due_date || "",
        "Paid date": inv.paid_date || "",
        "Payment method": inv.payment_method ? inv.payment_method.replace(/_/g, " ") : "",
        "Rent amount": Number(inv.rent_amount || 0),
        "Maintenance": Number(inv.maintenance_amount || 0),
        "Security deposit": Number(inv.security_deposit_amount || 0),
        "Advance deposit credit": Number(inv.advance_deposit_amount || 0),
        "Utility charges": Number(inv.other_charges || 0),
        "Tax": Number(inv.tax_amount || 0),
        "Discount": Number(inv.discount_amount || 0),
        "Total amount": Number(inv.total_amount || 0),
        "Status": inv.status,
      }))
      const exportDate = now.toLocaleDateString("en-PK", { day: "2-digit", month: "long", year: "numeric" })
      exportToExcel(
        [{ name: "Invoices", rows, title: `${COMPANY_NAME} — Invoices — Exported ${exportDate}` }],
        `invoices_${now.toISOString().split("T")[0]}.xlsx`
      )
    } catch (err) {
      toast.error("Failed to export: " + err.message)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Invoices</h2>
          <p className="text-sm text-gray-400 mt-0.5">{invoices.length} invoices</p>
        </div>
        {/* Generate invoices control */}
        <div className="flex items-center gap-2 flex-wrap">
          <SearchableSelect
            value={genTenantId}
            onChange={setGenTenantId}
            placeholder="All active tenants"
            className="w-48"
            options={[
              { value: "", label: "All active tenants" },
              ...allTenants.map(t => ({ value: t.id, label: t.full_name })),
            ]}
          />
          <select value={genMonth} onChange={e => setGenMonth(Number(e.target.value))}
            className="text-sm px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select value={genYear} onChange={e => setGenYear(Number(e.target.value))}
            className="text-sm px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={handleGenerateAll} disabled={generating}
            className="flex items-center gap-2 bg-coral-500 hover:bg-coral-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition disabled:opacity-60">
            {generating
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{genTenantId ? "Creating..." : "Generating..."}</>
              : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>{genTenantId ? "Create invoice" : "Generate invoices"}</>
            }
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

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total collected", value: formatCurrency(summary?.totalCollected || 0), color: "bg-green-50 text-green-700" },
		{ label: "Pending amount",  value: formatCurrency(summary?.totalPending || 0),   color: "bg-yellow-50 text-yellow-700" },
		{ label: "Paid invoices",   value: summary.paid,    color: "bg-green-50 text-green-700" },
		{ label: "Overdue invoices",value: summary.overdue, color: "bg-red-50 text-red-700" },

          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className={`text-xl font-semibold ${s.color.split(" ")[1]}`}>{s.value}</div>
              <div className="text-xs text-gray-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input type="text" placeholder="Search by tenant name..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-48 px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="px-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">All statuses</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select value={building} onChange={e => setBuilding(e.target.value)}
          className="px-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">All buildings</option>
          {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-20 space-y-2">
            <div className="text-gray-300 text-4xl">🧾</div>
            <div className="text-gray-400 text-sm">No invoices yet.</div>
            <div className="text-gray-300 text-xs">Select a month and click Generate invoices</div>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs font-medium text-gray-400 uppercase tracking-wide">
                <th className="text-left px-6 py-3">Invoice</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Tenant</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Period</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Due date</th>
                <th className="text-right px-4 py-3">Amount</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {invoices.map(inv => (
                <tr key={inv.id}
                  onClick={() => navigate(`/invoices/${inv.id}`)}
                  className="hover:bg-gray-50 cursor-pointer transition">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{inv.invoice_number}</div>
                    <div className="text-xs text-gray-400 md:hidden">{inv.tenants?.full_name}</div>
                  </td>
                  <td className="px-4 py-4 hidden md:table-cell">
                    <div className="text-sm text-gray-700">{inv.tenants?.full_name}</div>
                    <div className="text-xs text-gray-400">{inv.buildings?.name} · {inv.units?.unit_number}</div>
                  </td>
                  <td className="px-4 py-4 hidden lg:table-cell text-sm text-gray-500">
                    {MONTHS[inv.month - 1]} {inv.year}
                  </td>
                  <td className="px-4 py-4 hidden lg:table-cell text-sm text-gray-500">
			{formatDateShort(inv.due_date)}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      {formatCurrency(inv.total_amount)}
                    </div>
                  </td>
                  <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                    <select
                      value={inv.status}
                      onChange={e => {
                        if (e.target.value === "paid") setShowPayModal(inv.id)
                        else handleStatusChange(inv.id, e.target.value)
                      }}
                      className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500 ${statusStyle[inv.status]}`}>
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                    <button onClick={e => handleDelete(inv.id, e)}
                      className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Mark as paid modal */}
      {showPayModal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-base font-semibold text-gray-900">Mark as paid</h3>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Payment method</label>
              <select value={payMethod} onChange={e => setPayMethod(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="upi">UPI</option>
                <option value="cheque">Cheque</option>
                <option value="online">Online</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Payment date</label>
              <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowPayModal(null)}
                className="flex-1 py-2.5 text-sm rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={handleMarkPaid}
                className="flex-1 py-2.5 text-sm rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium transition">
                Confirm paid
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}