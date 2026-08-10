import { useQuery } from "@tanstack/react-query"
import { useTenantAuth } from "../../context/TenantAuthContext"
import { getMyInvoices, getMyMaintenanceTickets } from "../../services/tenantPortalService"
import { formatCurrency, formatDate } from "../../lib/utils"
import { useNavigate } from "react-router-dom"

const MONTHS = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec"
]

export default function PortalOverview() {
  const { tenant } = useTenantAuth()
  const navigate = useNavigate()

  const { data: invoices = [] } = useQuery({
    queryKey: ["my-invoices"],
    queryFn: getMyInvoices,
    enabled: !!tenant,
  })

  const { data: tickets = [] } = useQuery({
    queryKey: ["my-tickets"],
    queryFn: getMyMaintenanceTickets,
    enabled: !!tenant,
  })

  const pendingInvoices = invoices.filter(i => i.status !== "paid" && i.status !== "cancelled")
  const totalPending = pendingInvoices.reduce((sum, i) => sum + Number(i.total_amount), 0)
  const openTickets = tickets.filter(t => t.status === "open" || t.status === "in_progress")

  const leaseEndDate = tenant?.lease_end ? new Date(tenant.lease_end) : null
  const daysLeft = leaseEndDate
    ? Math.ceil((leaseEndDate - new Date()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="space-y-6">

      {/* Welcome */}
      <div className="bg-brand-500 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold">
              Welcome, {tenant?.full_name?.split(" ")[0]} 👋
            </h2>
            <p className="text-brand-100 text-sm mt-1">
              {tenant?.buildings?.name} · {tenant?.units?.unit_number}
              {tenant?.units?.bedrooms ? ` · ${tenant.units.bedrooms}` : ""}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold">{formatCurrency(tenant?.monthly_rent)}</div>
            <div className="text-brand-200 text-xs mt-0.5">Monthly rent</div>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div onClick={() => navigate("/portal/invoices")}
          className="bg-white rounded-2xl border border-gray-100 p-4 cursor-pointer hover:border-gray-200 transition">
          <div className={`text-xl font-semibold ${totalPending > 0 ? "text-red-600" : "text-green-600"}`}>
            {formatCurrency(totalPending)}
          </div>
          <div className="text-xs text-gray-400 mt-1">Amount due</div>
        </div>
        <div onClick={() => navigate("/portal/maintenance")}
          className="bg-white rounded-2xl border border-gray-100 p-4 cursor-pointer hover:border-gray-200 transition">
          <div className={`text-xl font-semibold ${openTickets.length > 0 ? "text-yellow-600" : "text-green-600"}`}>
            {openTickets.length}
          </div>
          <div className="text-xs text-gray-400 mt-1">Open requests</div>
        </div>
        {daysLeft !== null && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className={`text-xl font-semibold ${
              daysLeft < 0 ? "text-red-600" : daysLeft < 60 ? "text-yellow-600" : "text-green-600"
            }`}>
              {daysLeft < 0 ? "Expired" : daysLeft}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {daysLeft < 0 ? "Lease expired" : "Days until lease ends"}
            </div>
          </div>
        )}
      </div>

      {/* Profile summary */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">
          My details
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
          <InfoRow label="Full name"    value={tenant?.full_name} />
          <InfoRow label="Phone"        value={tenant?.phone} />
          <InfoRow label="Unit"         value={tenant?.units?.unit_number} />
          <InfoRow label="Building"     value={tenant?.buildings?.name} />
          <InfoRow label="Lease start"  value={formatDate(tenant?.lease_start)} />
          <InfoRow label="Lease end"    value={formatDate(tenant?.lease_end)} />
          <InfoRow label="Monthly rent" value={formatCurrency(tenant?.monthly_rent)} />
          <InfoRow label="Security deposit" value={formatCurrency(tenant?.security_deposit)} />
        </div>
      </div>

      {/* Recent invoices */}
      {invoices.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Recent invoices</h3>
            <button onClick={() => navigate("/portal/invoices")}
              className="text-xs text-brand-500 hover:text-brand-700 font-medium">
              View all
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {invoices.slice(0, 3).map(inv => (
              <div key={inv.id} className="flex items-center justify-between px-5 py-3">
                <div className="text-sm text-gray-700">
                  {MONTHS[inv.month - 1]} {inv.year}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(inv.total_amount)}
                  </span>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-lg capitalize ${
                    inv.status === "paid"    ? "bg-green-50 text-green-700" :
                    inv.status === "overdue" ? "bg-red-50 text-red-700" :
                    "bg-yellow-50 text-yellow-700"
                  }`}>
                    {inv.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between py-2.5 border-b border-gray-50 last:border-0 gap-4">
      <span className="text-sm text-gray-400">{label}</span>
      <span className="text-sm text-gray-800 font-medium text-right">{value || "—"}</span>
    </div>
  )
}