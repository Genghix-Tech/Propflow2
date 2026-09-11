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
  // Advance deposit was handed over at signing, separately from any invoice
  // (it's only ever a credit line reducing what the first invoice shows as
  // due — see invoicePdf.js/PortalInvoices.jsx) — so it has to be added in
  // here explicitly, it's real money paid that no invoice's total captures.
  const advanceDepositPaid = Number(tenant?.advance_deposit || 0)
  const totalPaidInvoices = invoices.filter(i => i.status === "paid").reduce((sum, i) => sum + Number(i.total_amount), 0)
  const totalPaid = totalPaidInvoices + advanceDepositPaid
  const openTickets = tickets.filter(t => t.status === "open" || t.status === "in_progress")

  const leaseEndDate = tenant?.lease_end ? new Date(tenant.lease_end) : null
  const daysLeft = leaseEndDate
    ? Math.ceil((leaseEndDate - new Date()) / (1000 * 60 * 60 * 24))
    : null

  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  return (
    <div className="space-y-8">

      {/* Page header + hero */}
      <div className="flex items-start justify-between flex-wrap gap-6">
        <div>
          <div className="text-xs font-medium text-brand-600 bg-brand-50 inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
            {greeting}
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 tracking-tight">
            {tenant?.full_name?.split(" ")[0]}'s dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-2 flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {tenant?.buildings?.name} · Unit {tenant?.units?.unit_number}
            {tenant?.units?.bedrooms ? ` · ${tenant.units.bedrooms}` : ""}
          </p>
        </div>

        <div className="bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl px-6 py-4 text-white shadow-lg shadow-brand-500/20">
          <div className="text-brand-100 text-xs font-medium">Monthly rent</div>
          <div className="text-2xl font-semibold mt-0.5">{formatCurrency(tenant?.monthly_rent)}</div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          onClick={() => navigate("/portal/invoices")}
          value={formatCurrency(totalPending)}
          label="Amount due"
          tone={totalPending > 0 ? "red" : "green"}
          icon={
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21l-7-4-7 4V5a2 2 0 012-2h10a2 2 0 012 2v16z" />
          }
        />
        <StatCard
          value={formatCurrency(totalPaid)}
          label="Total paid"
          hint={advanceDepositPaid > 0 ? `Includes ${formatCurrency(advanceDepositPaid)} deposit` : null}
          tone="brand"
          icon={
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
          }
        />
        <StatCard
          onClick={() => navigate("/portal/maintenance")}
          value={openTickets.length}
          label="Open requests"
          tone={openTickets.length > 0 ? "yellow" : "green"}
          icon={
            <>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </>
          }
        />
        <StatCard
          value={daysLeft === null ? "—" : daysLeft < 0 ? "Expired" : daysLeft}
          label={daysLeft !== null && daysLeft < 0 ? "Lease expired" : "Days left on lease"}
          tone={daysLeft === null ? "gray" : daysLeft < 0 ? "red" : daysLeft < 60 ? "yellow" : "green"}
          icon={
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          }
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

        {/* Profile summary */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm shadow-gray-100/50 p-6">
          <SectionTitle
            title="My details"
            icon={
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            }
          />
          <div className="space-y-0">
            <InfoRow label="Full name"       value={tenant?.full_name} />
            <InfoRow label="Phone"           value={tenant?.phone} />
            <InfoRow label="Unit"            value={tenant?.units?.unit_number} />
            <InfoRow label="Building"        value={tenant?.buildings?.name} />
            <InfoRow label="Lease start"     value={formatDate(tenant?.lease_start)} />
            <InfoRow label="Lease end"       value={formatDate(tenant?.lease_end)} />
            <InfoRow label="Monthly rent"    value={formatCurrency(tenant?.monthly_rent)} />
            <InfoRow label="Security deposit" value={formatCurrency(tenant?.security_deposit)} last />
          </div>
        </div>

        {/* Recent invoices */}
        <div className="xl:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm shadow-gray-100/50 overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
            <h3 className="text-sm font-semibold text-gray-900">Recent invoices</h3>
            <button onClick={() => navigate("/portal/invoices")}
              className="text-xs text-brand-500 hover:text-brand-700 font-medium flex items-center gap-1 transition">
              View all
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          {invoices.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-14 text-gray-300">
              <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                  d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21l-7-4-7 4V5a2 2 0 012-2h10a2 2 0 012 2v16z" />
              </svg>
              <p className="text-sm text-gray-400">No invoices yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {invoices.slice(0, 4).map(inv => (
                <div key={inv.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50/60 transition">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21l-7-4-7 4V5a2 2 0 012-2h10a2 2 0 012 2v16z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-800">{MONTHS[inv.month - 1]} {inv.year}</div>
                      <div className="text-xs text-gray-400">{inv.invoice_number}</div>
                    </div>
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
          )}
        </div>
      </div>
    </div>
  )
}

const toneStyles = {
  red:    { bg: "bg-red-50",    text: "text-red-600",    iconBg: "bg-red-100" },
  yellow: { bg: "bg-yellow-50", text: "text-yellow-600",  iconBg: "bg-yellow-100" },
  green:  { bg: "bg-green-50",  text: "text-green-600",   iconBg: "bg-green-100" },
  brand:  { bg: "bg-brand-50",  text: "text-brand-600",   iconBg: "bg-brand-100" },
  gray:   { bg: "bg-gray-50",   text: "text-gray-500",    iconBg: "bg-gray-100" },
}

function StatCard({ value, label, hint, tone, icon, onClick }) {
  const t = toneStyles[tone] || toneStyles.gray
  return (
    <div onClick={onClick}
      className={`bg-white rounded-2xl border border-gray-100 shadow-sm shadow-gray-100/50 p-5 transition ${
        onClick ? "cursor-pointer hover:border-gray-200 hover:shadow-md hover:-translate-y-0.5" : ""
      }`}>
      <div className={`w-10 h-10 rounded-xl ${t.iconBg} ${t.text} flex items-center justify-center mb-3`}>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">{icon}</svg>
      </div>
      <div className={`text-xl font-semibold ${t.text} truncate`}>{value}</div>
      <div className="text-xs text-gray-400 mt-0.5 truncate">{label}</div>
      {hint && <div className="text-[11px] text-gray-300 mt-0.5 truncate">{hint}</div>}
    </div>
  )
}

function SectionTitle({ title, icon }) {
  return (
    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
      <svg className="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">{icon}</svg>
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
    </div>
  )
}

function InfoRow({ label, value, last }) {
  return (
    <div className={`flex justify-between py-2.5 gap-4 ${last ? "" : "border-b border-gray-50"}`}>
      <span className="text-sm text-gray-400 flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-800 font-medium text-right">{value || "—"}</span>
    </div>
  )
}
