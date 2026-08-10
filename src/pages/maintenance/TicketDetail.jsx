import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { getTicketById, updateTicket, deleteTicket } from "../../services/maintenanceService"
import { getEmployees } from "../../services/employeeService"
import { formatCurrency, formatDate } from "../../lib/utils"
import toast from "react-hot-toast"
import { useAuth } from "../../context/AuthContext"

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

export default function TicketDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { role } = useAuth()
  const [editAssign, setEditAssign] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState("")
  const [actualCost, setActualCost] = useState("")
  const [showCostModal, setShowCostModal] = useState(false)
  const [resolvedDate, setResolvedDate] = useState(
    new Date().toISOString().split("T")[0]
  )

  const { data: ticket, isLoading, isError } = useQuery({
    queryKey: ["ticket", id],
    queryFn: () => getTicketById(id),
    onSuccess: (data) => {
      setSelectedEmployee(data.assigned_to || "")
      setActualCost(data.actual_cost || "")
    }
  })

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => getEmployees({ status: "active" }),
  })

  const handleStatusChange = async (newStatus) => {
    try {
      const update = { status: newStatus }
      if (newStatus === "resolved") {
        setShowCostModal(true)
        return
      }
      await updateTicket(id, update)
      toast.success("Status updated")
      queryClient.invalidateQueries(["ticket", id])
      queryClient.invalidateQueries(["tickets"])
      queryClient.invalidateQueries(["maintenance-summary"])
    } catch {
      toast.error("Failed to update status")
    }
  }

  const handleResolve = async () => {
    try {
      await updateTicket(id, {
        status: "resolved",
        resolved_date: resolvedDate,
        actual_cost: Number(actualCost) || 0,
      })
      toast.success("Ticket resolved!")
      setShowCostModal(false)
      queryClient.invalidateQueries(["ticket", id])
      queryClient.invalidateQueries(["tickets"])
      queryClient.invalidateQueries(["maintenance-summary"])
    } catch {
      toast.error("Failed to resolve ticket")
    }
  }

  const handleAssign = async () => {
    try {
      await updateTicket(id, {
        assigned_to: selectedEmployee || null,
        status: selectedEmployee ? "in_progress" : "open",
      })
      toast.success(selectedEmployee ? "Staff assigned!" : "Assignment removed")
      setEditAssign(false)
      queryClient.invalidateQueries(["ticket", id])
      queryClient.invalidateQueries(["tickets"])
    } catch {
      toast.error("Failed to assign")
    }
  }

  const handleDelete = async () => {
    if (!confirm("Delete this ticket? This cannot be undone.")) return
    try {
      await deleteTicket(id)
      toast.success("Ticket deleted")
      navigate("/maintenance")
    } catch {
      toast.error("Failed to delete ticket")
    }
  }

  if (isLoading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (isError || !ticket) return (
    <div className="text-center py-32 text-gray-400 text-sm">
      Ticket not found.{" "}
      <button onClick={() => navigate("/maintenance")} className="text-brand-500 hover:underline">
        Go back
      </button>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button onClick={() => navigate("/maintenance")}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
          </svg>
          Back to maintenance
        </button>
        <div className="flex items-center gap-2">
          {ticket.status !== "resolved" && ticket.status !== "cancelled" && (
            <button onClick={() => handleStatusChange("resolved")}
              className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Mark resolved
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

      {/* Ticket header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-start gap-4">
          <div className="text-3xl flex-shrink-0">{categoryIcon[ticket.category]}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="text-xs font-medium text-gray-400">{ticket.ticket_number}</span>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-lg capitalize ${priorityStyle[ticket.priority]}`}>
                {ticket.priority}
              </span>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-lg capitalize ${statusStyle[ticket.status]}`}>
                {ticket.status.replace("_", " ")}
              </span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">{ticket.title}</h2>
            {ticket.description && (
              <p className="text-sm text-gray-500 mt-2">{ticket.description}</p>
            )}
          </div>

          {/* Status changer */}
          <div className="flex-shrink-0">
            <select
              value={ticket.status}
              onChange={e => handleStatusChange(e.target.value)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500 ${statusStyle[ticket.status]}`}>
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="resolved">Resolved</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Two column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Ticket details */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 pb-3 border-b border-gray-100">
            Ticket details
          </h3>
          <InfoRow label="Ticket number"  value={ticket.ticket_number} />
          <InfoRow label="Category"       value={ticket.category} />
          <InfoRow label="Priority"       value={ticket.priority} />
          <InfoRow label="Status"         value={ticket.status.replace("_", " ")} />
          <InfoRow label="Reported date"  value={formatDate(ticket.reported_date)} />
          <InfoRow label="Resolved date"  value={formatDate(ticket.resolved_date)} />
          <InfoRow label="Estimated cost" value={formatCurrency(ticket.estimated_cost)} />
          <InfoRow label="Actual cost"    value={formatCurrency(ticket.actual_cost)} />
          {ticket.notes && (
            <InfoRow label="Notes" value={ticket.notes} />
          )}
        </div>

        {/* Location + tenant */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 pb-3 border-b border-gray-100">
            Location & tenant
          </h3>
          <InfoRow label="Building" value={ticket.buildings?.name || "—"} />
          <InfoRow label="Unit"     value={ticket.units?.unit_number || "—"} />
          <InfoRow label="Tenant"   value={ticket.tenants?.full_name || "—"} />
          {ticket.tenants?.phone && (
            <InfoRow label="Tenant phone" value={ticket.tenants.phone} />
          )}
        </div>

        {/* Assignment */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Assigned staff</h3>
            {!editAssign && (
              <button onClick={() => setEditAssign(true)}
                className="text-xs text-brand-500 hover:text-brand-700 font-medium transition">
                {ticket.assigned_to ? "Reassign" : "Assign staff"}
              </button>
            )}
          </div>

          {editAssign ? (
            <div className="flex items-center gap-3">
              <select value={selectedEmployee}
                onChange={e => setSelectedEmployee(e.target.value)}
                className="flex-1 px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                <option value="">Unassigned</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} — {emp.role?.replace("_", " ")}
                  </option>
                ))}
              </select>
              <button onClick={handleAssign}
                className="px-4 py-2.5 text-sm bg-coral-500 hover:bg-coral-700 text-white rounded-xl transition">
                Save
              </button>
              <button onClick={() => setEditAssign(false)}
                className="px-4 py-2.5 text-sm border border-gray-200 text-gray-500 hover:bg-gray-50 rounded-xl transition">
                Cancel
              </button>
            </div>
          ) : ticket.employees ? (
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-brand-50 text-brand-700 text-sm font-semibold flex items-center justify-center flex-shrink-0">
                {ticket.employees.full_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">{ticket.employees.full_name}</div>
                <div className="text-xs text-gray-400 capitalize mt-0.5">
                  {ticket.employees.role?.replace("_", " ")}
                  {ticket.employees.phone ? ` · ${ticket.employees.phone}` : ""}
                </div>
              </div>
              <span className="ml-auto text-xs bg-yellow-50 text-yellow-700 px-2.5 py-1 rounded-lg">
                In progress
              </span>
            </div>
          ) : (
            <div className="text-sm text-gray-400 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              No staff assigned yet
            </div>
          )}
        </div>
      </div>

      {/* Resolve modal */}
      {showCostModal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-base font-semibold text-gray-900">Resolve ticket</h3>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Actual cost (PKR)
              </label>
              <input type="number" value={actualCost}
                onChange={e => setActualCost(e.target.value)}
                placeholder="e.g. 3500"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Resolved date
              </label>
              <input type="date" value={resolvedDate}
                onChange={e => setResolvedDate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCostModal(false)}
                className="flex-1 py-2.5 text-sm rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={handleResolve}
                className="flex-1 py-2.5 text-sm rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium transition">
                Confirm resolved
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
    <div className="flex justify-between items-start py-2.5 border-b border-gray-50 last:border-0 gap-4">
      <span className="text-sm text-gray-400 flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-800 font-medium text-right capitalize">{value}</span>
    </div>
  )
}