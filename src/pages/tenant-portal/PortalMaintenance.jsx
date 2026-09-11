import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useTenantAuth } from "../../context/TenantAuthContext"
import { getMyMaintenanceTickets, createMyMaintenanceTicket } from "../../services/tenantPortalService"
import toast from "react-hot-toast"

const statusStyle = {
  open:        "bg-red-50 text-red-700",
  in_progress: "bg-yellow-50 text-yellow-700",
  resolved:    "bg-green-50 text-green-700",
  cancelled:   "bg-gray-100 text-gray-400",
}

const priorityStyle = {
  low:    "border-l-gray-300",
  medium: "border-l-brand-400",
  high:   "border-l-coral-500",
  urgent: "border-l-red-500",
}

const priorityBadge = {
  low:    "bg-gray-100 text-gray-500",
  medium: "bg-brand-50 text-brand-600",
  high:   "bg-coral-50 text-coral-600",
  urgent: "bg-red-50 text-red-600",
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

export default function PortalMaintenance() {
  const { tenant } = useTenantAuth()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: "", description: "", category: "general", priority: "medium"
  })

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["my-tickets"],
    queryFn: getMyMaintenanceTickets,
    enabled: !!tenant,
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) { toast.error("Title is required"); return }
    setSaving(true)
    try {
      await createMyMaintenanceTicket(tenant.id, {
        title: form.title,
        description: form.description || null,
        category: form.category,
        priority: form.priority,
        building_id: tenant.building_id,
        unit_id: tenant.unit_id,
        reported_date: new Date().toISOString().split("T")[0],
      })
      toast.success("Request submitted!")
      setForm({ title: "", description: "", category: "general", priority: "medium" })
      setShowForm(false)
      queryClient.invalidateQueries(["my-tickets"])
    } catch (err) {
      toast.error("Failed to submit: " + err.message)
    } finally {
      setSaving(false)
    }
  }

  const openCount = tickets.filter(t => t.status === "open" || t.status === "in_progress").length

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 tracking-tight">Maintenance requests</h1>
          <p className="text-sm text-gray-500 mt-2">
            {tickets.length} total{openCount > 0 ? ` · ${openCount} open` : ""}
          </p>
        </div>
        <button onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-2 bg-coral-500 hover:bg-coral-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition shadow-sm shadow-coral-500/20">
          <svg className={`w-4 h-4 transition-transform ${showForm ? "rotate-45" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {showForm ? "Cancel" : "New request"}
        </button>
      </div>

      {/* New request form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-gray-100/50 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
            Submit a new request
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Title <span className="text-red-400">*</span>
              </label>
              <input type="text" value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Water leakage in bathroom"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Description</label>
              <textarea value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Describe the issue in detail..."
                rows={3}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Category</label>
                <select value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                  <option value="plumbing">Plumbing</option>
                  <option value="electrical">Electrical</option>
                  <option value="cleaning">Cleaning</option>
                  <option value="security">Security</option>
                  <option value="lift">Lift</option>
                  <option value="ac">AC</option>
                  <option value="general">General</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Priority</label>
                <select value={form.priority}
                  onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 text-sm rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2.5 text-sm rounded-xl bg-coral-500 hover:bg-coral-700 text-white font-medium transition disabled:opacity-60">
                {saving ? "Submitting..." : "Submit request"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tickets list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-gray-100/50 flex flex-col items-center justify-center py-16 text-gray-300">
          <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-sm text-gray-400">No requests yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map(t => (
            <div key={t.id}
              className={`bg-white rounded-2xl border border-gray-100 shadow-sm shadow-gray-100/50 border-l-4 ${priorityStyle[t.priority] || priorityStyle.medium} p-5`}>
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">{categoryIcon[t.category] || "📋"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="text-sm font-semibold text-gray-900">{t.title}</div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-lg capitalize ${priorityBadge[t.priority] || priorityBadge.medium}`}>
                        {t.priority}
                      </span>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-lg capitalize ${statusStyle[t.status]}`}>
                        {t.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                  {t.description && (
                    <p className="text-xs text-gray-400 mt-1.5">{t.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2.5 text-xs text-gray-400">
                    <span className="font-medium">{t.ticket_number}</span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {t.reported_date
                        ? new Date(t.reported_date).toLocaleDateString("en-PK", {
                            day: "2-digit", month: "short", year: "numeric"
                          })
                        : "—"
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
