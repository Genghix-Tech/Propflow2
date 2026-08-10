import { useQuery } from "@tanstack/react-query"
import { useTenantAuth } from "../../context/TenantAuthContext"
import { getMyInvoices } from "../../services/tenantPortalService"
import { formatCurrency, formatDate } from "../../lib/utils"

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
]

export default function PortalInvoices() {
  const { tenant } = useTenantAuth()

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["my-invoices"],
    queryFn: getMyInvoices,
    enabled: !!tenant,
  })

  const totalPaid    = invoices.filter(i => i.status === "paid").reduce((s, i) => s + Number(i.total_amount), 0)
  const totalPending = invoices.filter(i => i.status !== "paid" && i.status !== "cancelled").reduce((s, i) => s + Number(i.total_amount), 0)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">My invoices</h2>
        <p className="text-sm text-gray-400 mt-0.5">{invoices.length} total invoices</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-50 rounded-2xl p-4">
          <div className="text-xl font-semibold text-green-700">{formatCurrency(totalPaid)}</div>
          <div className="text-xs text-gray-500 mt-1">Total paid</div>
        </div>
        <div className="bg-yellow-50 rounded-2xl p-4">
          <div className="text-xl font-semibold text-yellow-700">{formatCurrency(totalPending)}</div>
          <div className="text-xs text-gray-500 mt-1">Amount due</div>
        </div>
      </div>

      {/* Invoice list */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">No invoices yet.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {invoices.map(inv => (
              <div key={inv.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      {MONTHS[inv.month - 1]} {inv.year}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{inv.invoice_number}</div>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-lg capitalize flex-shrink-0 ${
                    inv.status === "paid"    ? "bg-green-50 text-green-700" :
                    inv.status === "overdue" ? "bg-red-50 text-red-700" :
                    inv.status === "cancelled" ? "bg-gray-100 text-gray-400" :
                    "bg-yellow-50 text-yellow-700"
                  }`}>
                    {inv.status}
                  </span>
                </div>

                {/* Line items */}
                <div className="mt-3 space-y-1.5">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Monthly rent</span>
                    <span>{formatCurrency(inv.rent_amount)}</span>
                  </div>
                  {Number(inv.maintenance_amount) > 0 && (
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Maintenance</span>
                      <span>{formatCurrency(inv.maintenance_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-semibold text-gray-900 border-t border-gray-100 pt-1.5">
                    <span>Total</span>
                    <span>{formatCurrency(inv.total_amount)}</span>
                  </div>
                </div>

                {/* Payment info */}
                {inv.status === "paid" && inv.paid_date && (
                  <div className="mt-3 text-xs text-green-600 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Paid on {formatDate(inv.paid_date)}
                    {inv.payment_method && ` via ${inv.payment_method.replace(/_/g, " ")}`}
                    {inv.notes && ` · ${inv.notes}`}
                  </div>
                )}
                {inv.status !== "paid" && inv.due_date && (
                  <div className="mt-3 text-xs text-red-500">
                    Due: {formatDate(inv.due_date)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}