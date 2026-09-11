import { useQuery } from "@tanstack/react-query"
import { getTenants } from "../../services/tenantService"
import { getInvoiceSummary, getInvoices } from "../../services/invoiceService"
import { useNavigate } from "react-router-dom"
import { formatCurrency } from "../../lib/utils"

const statusStyle = {
  paid:      "bg-green-50 text-green-700",
  pending:   "bg-yellow-50 text-yellow-700",
  overdue:   "bg-red-50 text-red-700",
  cancelled: "bg-gray-100 text-gray-400",
}

export default function Dashboard() {
  const navigate = useNavigate()

  const { data: tenants = [] } = useQuery({
    queryKey: ["tenants"],
    queryFn: () => getTenants(),
  })

  const { data: summary } = useQuery({
    queryKey: ["invoice-summary"],
    queryFn: getInvoiceSummary,
  })

  const { data: recentInvoices = [] } = useQuery({
    queryKey: ["invoices", "", "", ""],
    queryFn: () => getInvoices(),
  })

  const activeTenants   = tenants.filter(t => t.status === "active").length
  const expiringTenants = tenants.filter(t => t.status === "expiring").length
  const overdueTenants  = tenants.filter(t => t.status === "overdue").length

  const kpis = [
    {
      label: "Active tenants",
      value: activeTenants,
      sub: `${tenants.length} total tenants`,
      color: "bg-brand-50 text-brand-700",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      label: "Rent collected",
      value: formatCurrency(summary?.totalCollected || 0),
      sub: `${summary?.paid || 0} invoices paid`,
      color: "bg-green-50 text-green-700",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Pending amount",
      value: formatCurrency(summary?.totalPending || 0),
      sub: `${summary?.pending || 0} pending · ${summary?.overdue || 0} overdue`,
      color: "bg-yellow-50 text-yellow-700",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Needs attention",
      value: expiringTenants + overdueTenants,
      sub: `${expiringTenants} expiring · ${overdueTenants} overdue`,
      color: "bg-red-50 text-red-700",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
  ]

  const alerts = [
    ...tenants
      .filter(t => t.status === "expiring")
      .map(t => ({
        text: `Lease expiring — ${t.full_name}, ${t.buildings?.name || ""}`,
        type: "warn"
      })),
    ...tenants
      .filter(t => t.status === "overdue")
      .map(t => ({
        text: `Rent overdue — ${t.full_name}, ${t.buildings?.name || ""}`,
        type: "over"
      })),
    ...(summary?.overdue > 0
      ? [{ text: `${summary.overdue} invoice(s) marked overdue`, type: "over" }]
      : []),
  ].slice(0, 5)

  const recentFive = recentInvoices.slice(0, 5)

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* Welcome */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"} 👋
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Here's what's happening across your properties today.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start gap-4">
            <div className={`p-2.5 rounded-xl ${k.color}`}>
              {k.icon}
            </div>
            <div>
              <div className="text-2xl font-semibold text-gray-900">{k.value}</div>
              <div className="text-sm text-gray-500 mt-0.5">{k.label}</div>
              <div className="text-xs text-gray-400 mt-0.5">{k.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Two column grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Recent invoices */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Recent invoices</h3>
            <button onClick={() => navigate("/invoices")}
              className="text-xs text-brand-500 hover:text-brand-700 font-medium transition">
              View all
            </button>
          </div>
          {recentFive.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              No invoices yet — go to Invoices to generate them.
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentFive.map(inv => (
                <div key={inv.id}
                  onClick={() => navigate(`/invoices/${inv.id}`)}
                  className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 cursor-pointer transition">
                  <div className="w-9 h-9 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold flex items-center justify-center flex-shrink-0">
                    {inv.tenants?.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">
                      {inv.tenants?.full_name}
                    </div>
                    <div className="text-xs text-gray-400">
                      {inv.invoice_number} · {inv.buildings?.name}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-semibold text-gray-900">
                      {formatCurrency(inv.total_amount)}
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-lg capitalize ${statusStyle[inv.status]}`}>
                      {inv.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">

          {/* Alerts */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Alerts</h3>
            </div>
            <div className="p-4 space-y-3">
              {alerts.length === 0 ? (
                <div className="text-center py-4 text-gray-400 text-sm">
                  All clear — no alerts!
                </div>
              ) : alerts.map((a, i) => (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${
                  a.type === "over" ? "bg-red-50" : "bg-yellow-50"
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                    a.type === "over" ? "bg-red-500" : "bg-yellow-500"
                  }`} />
                  <p className={`text-xs leading-relaxed ${
                    a.type === "over" ? "text-red-700" : "text-yellow-700"
                  }`}>{a.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tenant status */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Tenant status</h3>
            {[
              { label: "Active",   count: activeTenants,   color: "bg-green-500" },
              { label: "Expiring", count: expiringTenants, color: "bg-yellow-500" },
              { label: "Overdue",  count: overdueTenants,  color: "bg-red-500" },
            ].map(b => (
              <div key={b.label} className="mb-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{b.label}</span>
                  <span>{b.count} / {tenants.length}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${b.color} rounded-full transition-all`}
                    style={{ width: tenants.length > 0 ? `${(b.count / tenants.length) * 100}%` : "0%" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}