import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { createTicket } from "../../services/maintenanceService"
import { getBuildings, getTenants } from "../../services/tenantService"
import { getEmployees } from "../../services/employeeService"
import toast from "react-hot-toast"

const defaultForm = {
  title: "",
  description: "",
  category: "general",
  priority: "medium",
  building_id: "",
  unit_id: "",
  tenant_id: "",
  assigned_to: "",
  reported_date: new Date().toISOString().split("T")[0],
  estimated_cost: "",
  notes: "",
}

export default function AddTicket() {
  const navigate = useNavigate()
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)

  const { data: buildings = [] } = useQuery({
    queryKey: ["buildings"],
    queryFn: getBuildings,
  })

  const { data: tenants = [] } = useQuery({
    queryKey: ["tenants"],
    queryFn: () => getTenants(),
  })

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => getEmployees({ status: "active" }),
  })

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))

  // Filter tenants by selected building
  const filteredTenants = form.building_id
    ? tenants.filter(t => t.building_id === form.building_id)
    : tenants

  // Filter employees by selected building
  const filteredEmployees = form.building_id
    ? employees.filter(e => !e.building_id || e.building_id === form.building_id)
    : employees

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) { toast.error("Title is required"); return }

    setSaving(true)
    try {
      await createTicket({
        title: form.title.trim(),
        description: form.description || null,
        category: form.category,
        priority: form.priority,
        building_id: form.building_id || null,
        unit_id: form.unit_id || null,
        tenant_id: form.tenant_id || null,
        assigned_to: form.assigned_to || null,
        reported_date: form.reported_date || null,
        estimated_cost: Number(form.estimated_cost) || 0,
        notes: form.notes || null,
        status: "open",
      })
      toast.success("Ticket created successfully!")
      navigate("/maintenance")
    } catch (err) {
      toast.error("Failed to create ticket: " + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">New maintenance ticket</h2>
          <p className="text-sm text-gray-400 mt-0.5">Report an issue or complaint</p>
        </div>
        <button onClick={() => navigate("/maintenance")}
          className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1.5 transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Basic info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 pb-3 border-b border-gray-100">
            Issue details
          </h3>
          <div>
            <Label text="Title" required />
            <input type="text" value={form.title}
              onChange={e => set("title", e.target.value)}
              placeholder="e.g. Water leakage in bathroom"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <Label text="Description" />
            <textarea value={form.description}
              onChange={e => set("description", e.target.value)}
              placeholder="Describe the issue in detail..."
              rows={3}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label text="Category" />
              <Select value={form.category} onChange={v => set("category", v)}>
                <option value="plumbing">Plumbing</option>
                <option value="electrical">Electrical</option>
                <option value="cleaning">Cleaning</option>
                <option value="security">Security</option>
                <option value="lift">Lift</option>
                <option value="ac">AC</option>
                <option value="general">General</option>
                <option value="other">Other</option>
              </Select>
            </div>
            <div>
              <Label text="Priority" />
              <Select value={form.priority} onChange={v => set("priority", v)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </Select>
            </div>
            <div>
              <Label text="Reported date" />
              <input type="date" value={form.reported_date}
                onChange={e => set("reported_date", e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <Label text="Estimated cost (PKR)" />
              <input type="number" value={form.estimated_cost}
                onChange={e => set("estimated_cost", e.target.value)}
                placeholder="e.g. 5000"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 pb-3 border-b border-gray-100">
            Location & tenant
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label text="Building" />
              <Select value={form.building_id}
                onChange={v => {
                  set("building_id", v)
                  set("tenant_id", "")
                  set("assigned_to", "")
                }}>
                <option value="">Select building</option>
                {buildings.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label text="Tenant (if reported by tenant)" />
              <Select value={form.tenant_id} onChange={v => set("tenant_id", v)}>
                <option value="">Not reported by tenant</option>
                {filteredTenants.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.full_name} — {t.units?.unit_number || ""}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>

        {/* Assignment */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 pb-3 border-b border-gray-100">
            Assign to staff
          </h3>
          <div>
            <Label text="Assign to employee" />
            <Select value={form.assigned_to} onChange={v => set("assigned_to", v)}>
              <option value="">Unassigned</option>
              {filteredEmployees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name} — {emp.role?.replace("_", " ")}
                  {emp.buildings?.name ? ` (${emp.buildings.name})` : ""}
                </option>
              ))}
            </Select>
            {form.assigned_to && (
              <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Staff member assigned
              </p>
            )}
          </div>
          <div>
            <Label text="Notes" />
            <textarea value={form.notes}
              onChange={e => set("notes", e.target.value)}
              placeholder="Any additional notes for the assigned staff..."
              rows={2}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2">
          <button type="button" onClick={() => navigate("/maintenance")}
            className="text-sm px-4 py-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 bg-coral-500 hover:bg-coral-700 text-white text-sm font-medium px-6 py-2.5 rounded-xl transition disabled:opacity-60">
            {saving
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</>
              : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>Create ticket</>
            }
          </button>
        </div>
      </form>
    </div>
  )
}

const Label = ({ text, required }) => (
  <label className="block text-xs font-medium text-gray-600 mb-1.5">
    {text} {required && <span className="text-red-400">*</span>}
  </label>
)

const Select = ({ value, onChange, children }) => (
  <select value={value} onChange={e => onChange(e.target.value)}
    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white transition">
    {children}
  </select>
)