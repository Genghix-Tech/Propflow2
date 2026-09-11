import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTenantAuth } from "../../context/TenantAuthContext"
import { getMyInvoices } from "../../services/tenantPortalService"
import { formatCurrency, formatDate } from "../../lib/utils"

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

export default function PortalInvoices() {
  const { tenant } = useTenantAuth()
  const [expanded, setExpanded] = useState(null)

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["my-invoices"],
    queryFn: getMyInvoices,
    enabled: !!tenant,
  })

  const totalPaid    = invoices.filter(i => i.status === "paid").reduce((s, i) => s + Number(i.total_amount), 0)
  const totalPending = invoices.filter(i => i.status !== "paid" && i.status !== "cancelled").reduce((s, i) => s + Number(i.total_amount), 0)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 tracking-tight">My invoices</h1>
        <p className="text-sm text-gray-500 mt-2">{invoices.length} total invoices</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-gray-100/50 p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-green-50 text-green-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="text-xl font-semibold text-gray-900 truncate">{formatCurrency(totalPaid)}</div>
            <div className="text-xs text-gray-400">Total paid</div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-gray-100/50 p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-yellow-50 text-yellow-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="text-xl font-semibold text-gray-900 truncate">{formatCurrency(totalPending)}</div>
            <div className="text-xs text-gray-400">Amount due</div>
          </div>
        </div>
      </div>

      {/* Invoice list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-gray-100/50 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-300">
            <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21l-7-4-7 4V5a2 2 0 012-2h10a2 2 0 012 2v16z" />
            </svg>
            <p className="text-sm text-gray-400">No invoices yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {invoices.map(inv => {
              const isOpen = expanded === inv.id
              return (
                <div key={inv.id}>
                  <button onClick={() => setExpanded(isOpen ? null : inv.id)}
                    className="w-full flex items-center justify-between gap-3 p-5 text-left hover:bg-gray-50/60 transition">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        inv.status === "paid" ? "bg-green-50 text-green-600" :
                        inv.status === "overdue" ? "bg-red-50 text-red-600" :
                        "bg-yellow-50 text-yellow-600"
                      }`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21l-7-4-7 4V5a2 2 0 012-2h10a2 2 0 012 2v16z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900">
                          {MONTHS[inv.month - 1]} {inv.year}
                        </div>
                        <div className="text-xs text-gray-400 truncate">{inv.invoice_number}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <div className="text-sm font-semibold text-gray-900">{formatCurrency(inv.total_amount)}</div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-lg capitalize ${statusStyle[inv.status]}`}>
                          {inv.status}
                        </span>
                      </div>
                      <svg className={`w-4 h-4 text-gray-300 transition-transform ${isOpen ? "rotate-180" : ""}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 -mt-1">
                      <div className="bg-gray-50 rounded-xl p-4 space-y-1.5">
                        <LineItem label="Monthly rent" value={inv.rent_amount} />
                        {Number(inv.maintenance_amount) > 0 && <LineItem label="Maintenance" value={inv.maintenance_amount} />}
                        {Number(inv.security_deposit_amount) > 0 && <LineItem label="Security deposit (one-time)" value={inv.security_deposit_amount} />}
                        {Number(inv.advance_deposit_amount) > 0 && <LineItem label="Advance deposit paid (credit)" value={-inv.advance_deposit_amount} credit />}
                        {Number(inv.other_charges) > 0 && <LineItem label="Utility charges" value={inv.other_charges} />}
                        {Number(inv.tax_amount) > 0 && (
                          <LineItem
                            label={`${inv.tax_type || "Tax"}${inv.tax_percentage ? ` (${inv.tax_percentage}%)` : ""}`}
                            value={inv.tax_amount}
                          />
                        )}
                        {Number(inv.discount_amount) > 0 && <LineItem label="Discount" value={-inv.discount_amount} credit />}
                        <div className="flex justify-between text-sm font-semibold text-gray-900 border-t border-gray-200 pt-2 mt-2">
                          <span>Total</span>
                          <span>{formatCurrency(inv.total_amount)}</span>
                        </div>
                      </div>

                      {inv.status === "paid" && inv.paid_date && (
                        <div className="mt-3 text-xs text-green-600 flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Paid on {formatDate(inv.paid_date)}
                          {inv.payment_method && ` via ${inv.payment_method.replace(/_/g, " ")}`}
                          {inv.notes && ` · ${inv.notes}`}
                        </div>
                      )}
                      {inv.status !== "paid" && inv.due_date && (
                        <div className="mt-3 text-xs text-red-500 flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Due: {formatDate(inv.due_date)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function LineItem({ label, value, credit }) {
  return (
    <div className={`flex justify-between text-sm ${credit ? "text-green-600" : "text-gray-500"}`}>
      <span>{label}</span>
      <span>{credit ? "-" : ""}{formatCurrency(Math.abs(value))}</span>
    </div>
  )
}
