import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { getTickets, getMaintenanceSummary, deleteTicket } from "../../services/maintenanceService"
import { getBuildings } from "../../services/tenantService"
import toast from "react-hot-toast"

const statusStyle = {
  open:        "bg-red-50 text-red-700",
  in_progress: "bg-yellow-50 text-yellow-700",
  resolved:    "bg-green-50 text-green-700",
  cancelled:   "bg-gray-100 text-gray-400",
}

const priorityStyle = {
  low:    "bg-gray-100 text-gray-500",
  medium: "bg-blue-50 text-blue-700",
  high:   "bg-orange-50 text-orange-700",
  urgent: "bg-red-50 text-red-700",
}

const categoryIcon = {
  plumbing:   "🔧",
  electrical: "⚡",
  cleaning:   "🧹",
  security:   "🔒",
  lift:       "🛗",
  ac:         "❄️",
  general:    "🏠",
  other:      "📋",
}

export default function MaintenanceList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch]     = useState("")
  const [status, setStatus]     = useState("")
  const [priority, setPriority] = useState("")
  const [building, setBuilding] = useState("")
  const [category, setCategory] = useState("")

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["tickets", search, status, priority, building, category],
    queryFn: () => getTickets({ search, status, priority, building, category }),
  })

  const { data: summary } = useQuery({
    queryKey: ["maintenance-summary"],
    queryFn: getMaintenanceSummary,
  })

  const { data: buildings = [] } = useQuery({
    queryKey: ["buildings"],
    queryFn: getBuildings,
  })

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    if (!confirm("Delete this ticket? This cannot be undone.")) return
    try {
      await deleteTicket(id)
      toast.success("Ticket deleted")
      queryClient.invalidateQueries(["tickets"])
      queryClient.invalidateQueries(["maintenance-summary"])
    } catch {
      toast.error("Failed to delete ticket")
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Maintenance & complaints</h2>
          <p className="text-sm text-gray-400 mt-0.5">{tickets.length} tickets</p>
        </div>
        <button onClick={() => navigate("/maintenance/new")}
          className="flex items-center gap-2 bg-coral-500 hover:bg-coral-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New ticket
        </button>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Open tickets",    value: summary.open,       color: "text-red-600" },
            { label: "In progress",     value: summary.inProgress, color: "text-yellow-600" },
            { label: "Resolved",        value: summary.resolved,   color: "text-green-600" },
            { label: "Total cost",      value: `PKR${Number(summary.totalCost).toLocaleString("en-PK")}`, color: "text-brand-600" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className={`text-xl font-semibold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input type="text" placeholder="Search by title or ticket number..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-48 px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="px-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="resolved">Resolved</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select value={priority} onChange={e => setPriority(e.target.value)}
          className="px-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">All priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select value={category} onChange={e => setCategory(e.target.value)}
          className="px-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">All categories</option>
          <option value="plumbing">Plumbing</option>
          <option value="electrical">Electrical</option>
          <option value="cleaning">Cleaning</option>
          <option value="security">Security</option>
          <option value="lift">Lift</option>
          <option value="ac">AC</option>
          <option value="general">General</option>
          <option value="other">Other</option>
        </select>
        <select value={building} onChange={e => setBuilding(e.target.value)}
          className="px-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">All buildings</option>
          {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {/* Tickets list */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 text-center py-20 text-gray-400 text-sm">
            No tickets found.
          </div>
        ) : tickets.map(ticket => (
          <div key={ticket.id}
            onClick={() => navigate(`/maintenance/${ticket.id}`)}
            className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-gray-200 hover:shadow-sm cursor-pointer transition">
            <div className="flex items-start gap-4">
              <div className="text-2xl flex-shrink-0 mt-0.5">
                {categoryIcon[ticket.category]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-gray-400">{ticket.ticket_number}</span>
                      <span className={`text-xs font-medium px-2.5 py-0.5 rounded-lg capitalize ${priorityStyle[ticket.priority]}`}>
                        {ticket.priority}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 mt-1">{ticket.title}</h3>
                    {ticket.description && (
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{ticket.description}</p>
                    )}
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-lg capitalize flex-shrink-0 ${statusStyle[ticket.status]}`}>
                    {ticket.status.replace("_", " ")}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-3 flex-wrap">
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16" />
                    </svg>
                    {ticket.buildings?.name || "—"}
                  </span>
                  {ticket.units && (
                    <span className="text-xs text-gray-400">
                      Unit {ticket.units.unit_number}
                    </span>
                  )}
                  {ticket.tenants && (
                    <span className="text-xs text-gray-400">
                      {ticket.tenants.full_name}
                    </span>
                  )}
                  {ticket.employees && (
                    <span className="text-xs text-brand-500 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {ticket.employees.full_name}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    {ticket.reported_date
                      ? new Date(ticket.reported_date).toLocaleDateString("en-PK", {
                          day: "2-digit", month: "short", year: "numeric"
                        })
                      : "—"}
                  </span>
                  {Number(ticket.estimated_cost) > 0 && (
                    <span className="text-xs text-gray-400">
                      Est. PKR {Number(ticket.estimated_cost).toLocaleString("en-PK")}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={e => handleDelete(ticket.id, e)}
                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition flex-shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}