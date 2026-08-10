import { formatCurrency, formatDate } from "../../lib/utils"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import {
  getInvoiceById, markAsPaid,
  updateInvoiceStatus, deleteInvoice,
  getUtilityCharges, addUtilityCharge, deleteUtilityCharge,
} from "../../services/invoiceService"
import toast from "react-hot-toast"

const UTILITY_LABELS = {
  electricity: "Electricity",
  gas: "Gas",
  water: "Water",
  internet: "Internet",
  other: "Other utility",
}

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

export default function InvoiceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showPayModal, setShowPayModal] = useState(false)
  const [payMethod, setPayMethod] = useState("bank_transfer")
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0])
  const [instrumentNumber, setInstrumentNumber] = useState("")
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [showAddUtility, setShowAddUtility] = useState(false)
  const [utilityType, setUtilityType] = useState("electricity")
  const [utilityAmount, setUtilityAmount] = useState("")
  const [utilityNotes, setUtilityNotes] = useState("")
  const [savingUtility, setSavingUtility] = useState(false)

  const { data: invoice, isLoading, isError } = useQuery({
    queryKey: ["invoice", id],
    queryFn: () => getInvoiceById(id),
  })

  const { data: utilityCharges = [] } = useQuery({
    queryKey: ["utility-charges", id],
    queryFn: () => getUtilityCharges(id),
    enabled: !!id,
  })

  const handleMarkPaid = async () => {
    try {
      await markAsPaid(id, payMethod, payDate, instrumentNumber)
      toast.success("Invoice marked as paid!")
      setShowPayModal(false)
      queryClient.invalidateQueries(["invoice", id])
      queryClient.invalidateQueries(["invoices"])
      queryClient.invalidateQueries(["invoice-summary"])
    } catch {
      toast.error("Failed to update invoice")
    }
  }

  const handleStatusChange = async (newStatus) => {
    try {
      await updateInvoiceStatus(id, newStatus)
      toast.success("Status updated")
      queryClient.invalidateQueries(["invoice", id])
      queryClient.invalidateQueries(["invoices"])
      queryClient.invalidateQueries(["invoice-summary"])
    } catch {
      toast.error("Failed to update status")
    }
  }

  const handleDelete = async () => {
    if (!confirm("Delete this invoice? This cannot be undone.")) return
    try {
      await deleteInvoice(id)
      toast.success("Invoice deleted")
      navigate("/invoices")
    } catch {
      toast.error("Failed to delete invoice")
    }
  }

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true)
    try {
      const { generateInvoicePdf } = await import("../../lib/invoicePdf")
      generateInvoicePdf(invoice, utilityCharges)
    } catch (err) {
      toast.error("Failed to generate PDF: " + err.message)
    } finally {
      setDownloadingPdf(false)
    }
  }

  const handleAddUtility = async () => {
    if (!utilityAmount || Number(utilityAmount) <= 0) { toast.error("Enter a valid amount"); return }
    setSavingUtility(true)
    try {
      await addUtilityCharge(id, utilityType, utilityAmount, utilityNotes.trim() || null)
      toast.success("Utility charge added")
      setUtilityAmount("")
      setUtilityNotes("")
      setShowAddUtility(false)
      queryClient.invalidateQueries(["invoice", id])
      queryClient.invalidateQueries(["utility-charges", id])
      queryClient.invalidateQueries(["invoices"])
      queryClient.invalidateQueries(["invoice-summary"])
    } catch (err) {
      toast.error("Failed to add charge: " + err.message)
    } finally {
      setSavingUtility(false)
    }
  }

  const handleDeleteUtility = async (chargeId) => {
    try {
      await deleteUtilityCharge(chargeId, id)
      toast.success("Charge removed")
      queryClient.invalidateQueries(["invoice", id])
      queryClient.invalidateQueries(["utility-charges", id])
      queryClient.invalidateQueries(["invoices"])
      queryClient.invalidateQueries(["invoice-summary"])
    } catch (err) {
      toast.error("Failed to remove charge: " + err.message)
    }
  }

  if (isLoading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (isError || !invoice) return (
    <div className="text-center py-32 text-gray-400 text-sm">
      Invoice not found.{" "}
      <button onClick={() => navigate("/invoices")} className="text-brand-500 hover:underline">
        Go back
      </button>
    </div>
  )

  const tenant = invoice.tenants
  const initials = tenant?.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2)

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Print header */}
      <div className="print-only mb-4 pb-4 border-b-2 border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">PropFlow</div>
            <div className="text-sm text-gray-400">Real Estate Management</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">
              Printed on {new Date().toLocaleDateString("en-IN", {
                day: "2-digit", month: "long", year: "numeric"
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Top bar */}
      <div className="no-print flex items-center justify-between flex-wrap gap-3">
        <button onClick={() => navigate("/invoices")}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
          </svg>
          Back to invoices
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()}
            className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
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
          {invoice.status !== "paid" && (
            <button onClick={() => setShowPayModal(true)}
              className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Mark as paid
            </button>
          )}
          <button onClick={handleDelete}
            className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl border border-red-200 hover:bg-red-50 text-red-500 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        </div>
      </div>

      {/* Invoice card */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">

        {/* Invoice header */}
        <div className="p-8 border-b border-gray-100">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">PropFlow</div>
                <div className="text-xs text-gray-400">Real Estate Management</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-semibold text-gray-900">{invoice.invoice_number}</div>
              <div className="mt-1">
                <span className={`text-xs font-medium px-3 py-1 rounded-lg capitalize ${statusStyle[invoice.status]}`}>
                  {invoice.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tenant + invoice info */}
        <div className="p-8 border-b border-gray-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Billed to
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-brand-50 text-brand-700 text-sm font-semibold flex items-center justify-center">
                  {initials}
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">{tenant?.full_name}</div>
                  <div className="text-xs text-gray-400">{tenant?.phone}</div>
                </div>
              </div>
              <div className="text-sm text-gray-600">{invoice.buildings?.name}</div>
              <div className="text-sm text-gray-400">{invoice.units?.unit_number}</div>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Invoice details
              </div>
              <InfoRow label="Invoice number" value={invoice.invoice_number} />
              <InfoRow label="Period" value={`${MONTHS[invoice.month - 1]} ${invoice.year}`} />
              <InfoRow label="Due date" value={
                invoice.due_date
                  ? new Date(invoice.due_date).toLocaleDateString("en-IN", {
                      day: "2-digit", month: "long", year: "numeric"
                    })
                  : "—"
              } />
              {invoice.paid_date && (
                <InfoRow label="Paid on" value={
                  new Date(invoice.paid_date).toLocaleDateString("en-IN", {
                    day: "2-digit", month: "long", year: "numeric"
                  })
                } />
              )}
              {invoice.payment_method && (
                <InfoRow label="Payment method"
                  value={invoice.payment_method.replace(/_/g, " ")} />
              )}
              {invoice.notes && (
                <InfoRow label="Reference" value={invoice.notes} />
              )}
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="p-8 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Charges
            </div>
            <button onClick={() => setShowAddUtility(v => !v)}
              className="no-print flex items-center gap-1.5 text-xs font-medium text-coral-500 hover:text-coral-700 transition">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add utility charge
            </button>
          </div>

          {showAddUtility && (
            <div className="no-print bg-gray-50 rounded-xl p-4 mb-4 flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Type</label>
                <select value={utilityType} onChange={e => setUtilityType(e.target.value)}
                  className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
                  {Object.entries(UTILITY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Amount (PKR)</label>
                <input type="number" value={utilityAmount} onChange={e => setUtilityAmount(e.target.value)}
                  placeholder="e.g. 3500"
                  className="w-32 px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Notes (optional)</label>
                <input type="text" value={utilityNotes} onChange={e => setUtilityNotes(e.target.value)}
                  placeholder="e.g. meter reading, unit consumed"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <button onClick={handleAddUtility} disabled={savingUtility}
                className="px-4 py-2 text-sm rounded-lg bg-coral-500 hover:bg-coral-700 text-white font-medium transition disabled:opacity-60">
                {savingUtility ? "Adding..." : "Add"}
              </button>
            </div>
          )}

          <table className="w-full">
            <thead>
              <tr className="text-xs font-medium text-gray-400 border-b border-gray-100">
                <th className="text-left pb-3">Description</th>
                <th className="text-right pb-3">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <tr>
                <td className="py-3 text-sm text-gray-700">
                  Monthly rent — {MONTHS[invoice.month - 1]} {invoice.year}
                </td>
                <td className="py-3 text-sm text-gray-900 text-right font-medium">
                  {formatCurrency(invoice.rent_amount)}
                </td>
              </tr>
              {Number(invoice.maintenance_amount) > 0 && (
                <tr>
                  <td className="py-3 text-sm text-gray-700">Maintenance charges</td>
                  <td className="py-3 text-sm text-gray-900 text-right font-medium">
                    {formatCurrency(invoice.maintenance_amount)}
                  </td>
                </tr>
              )}
              {utilityCharges.map(charge => (
                <tr key={charge.id} className="group">
                  <td className="py-3 text-sm text-gray-700">
                    {UTILITY_LABELS[charge.utility_type] || charge.utility_type}
                    {charge.notes && <span className="text-gray-400"> — {charge.notes}</span>}
                  </td>
                  <td className="py-3 text-sm text-gray-900 text-right font-medium">
                    <span className="inline-flex items-center gap-2">
                      {formatCurrency(charge.amount)}
                      <button onClick={() => handleDeleteUtility(charge.id)}
                        className="no-print opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Total */}
        <div className="p-8">
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal</span>
                  <span>{formatCurrency(invoice.total_amount)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Tax</span>
                  <span>PKR 0</span>
              </div>
              <div className="flex justify-between text-base font-semibold text-gray-900 border-t border-gray-200 pt-3">
                <span>Total due</span>
                <span className="text-brand-600">
                    <span className="text-brand-600">{formatCurrency(invoice.total_amount)}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Status changer */}
          <div className="no-print mt-8 pt-6 border-t border-gray-100 flex items-center justify-between flex-wrap gap-3">
            <div className="text-xs text-gray-400">
              Created {new Date(invoice.created_at).toLocaleDateString("en-IN", {
                day: "2-digit", month: "long", year: "numeric"
              })}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">Change status:</span>
              <select
                value={invoice.status}
                onChange={e => {
                  if (e.target.value === "paid") setShowPayModal(true)
                  else handleStatusChange(e.target.value)
                }}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500 ${statusStyle[invoice.status]}`}
              >
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Print footer */}
          <div className="print-only mt-8 pt-4 border-t border-gray-200 text-center text-xs text-gray-400">
            PropFlow · Real Estate Management · Thank you for your payment
          </div>
        </div>
      </div>

      {/* Mark as paid modal */}
      {showPayModal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-base font-semibold text-gray-900">Mark as paid</h3>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Payment method
              </label>
              <select value={payMethod} onChange={e => {
                setPayMethod(e.target.value)
                setInstrumentNumber("")
              }}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="upi">UPI</option>
                <option value="cheque">Cheque</option>
                <option value="online">Online</option>
              </select>
            </div>

            {payMethod !== "cash" && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  {payMethod === "cheque" ? "Cheque number" :
                   payMethod === "upi" ? "UPI reference ID" :
                   "Transaction / reference number"}
                  <span className="text-gray-400 ml-1">(optional)</span>
                </label>
                <input
                  type="text"
                  value={instrumentNumber}
                  onChange={e => setInstrumentNumber(e.target.value)}
                  placeholder={
                    payMethod === "cheque" ? "e.g. 004521" :
                    payMethod === "upi" ? "e.g. UPI123456789" :
                    "e.g. TXN123456"
                  }
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Payment date
              </label>
              <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => {
                setShowPayModal(false)
                setInstrumentNumber("")
              }}
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

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-xs text-gray-400 flex-shrink-0">{label}</span>
      <span className="text-xs text-gray-700 font-medium text-right capitalize">{value}</span>
    </div>
  )
}