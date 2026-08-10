import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { getEmployeeById, updateEmployee } from "../../services/employeeService"
import { getBuildings } from "../../services/tenantService"
import toast from "react-hot-toast"

const roleOptions = [
  { value: "security_guard", label: "Security guard" },
  { value: "cleaner",        label: "Cleaner" },
  { value: "electrician",    label: "Electrician" },
  { value: "plumber",        label: "Plumber" },
  { value: "manager",        label: "Manager" },
  { value: "receptionist",   label: "Receptionist" },
  { value: "maintenance",    label: "Maintenance" },
  { value: "other",          label: "Other" },
]

export default function EditEmployee() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)

  const { data: employee, isLoading } = useQuery({
    queryKey: ["employee", id],
    queryFn: () => getEmployeeById(id),
  })

  const { data: buildings = [] } = useQuery({
    queryKey: ["buildings"],
    queryFn: getBuildings,
  })

  useEffect(() => {
    if (employee) {
      setForm({
        full_name: employee.full_name || "",
        phone: employee.phone || "",
        email: employee.email || "",
        date_of_birth: employee.date_of_birth || "",
        address: employee.address || "",
        id_type: employee.id_type || "cnic",
        id_number: employee.id_number || "",
        role: employee.role || "",
        building_id: employee.building_id || "",
        salary: employee.salary || "",
        join_date: employee.join_date || "",
        status: employee.status || "active",
        emergency_contact_name: employee.emergency_contact_name || "",
        emergency_contact_phone: employee.emergency_contact_phone || "",
        notes: employee.notes || "",
      })
    }
  }, [employee])

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.full_name.trim()) { toast.error("Full name is required"); return }
    if (!form.phone.trim())     { toast.error("Phone is required"); return }
    if (!form.role)             { toast.error("Role is required"); return }

    setSaving(true)
    try {
      await updateEmployee(id, {
        ...form,
        salary: Number(form.salary) || 0,
        date_of_birth: form.date_of_birth || null,
        join_date: form.join_date || null,
        email: form.email || null,
        id_number: form.id_number || null,
        address: form.address || null,
        building_id: form.building_id || null,
        emergency_contact_name: form.emergency_contact_name || null,
        emergency_contact_phone: form.emergency_contact_phone || null,
        notes: form.notes || null,
      })
      toast.success("Employee updated!")
      queryClient.invalidateQueries(["employee", id])
      queryClient.invalidateQueries(["employees"])
      navigate(`/employees/${id}`)
    } catch (err) {
      toast.error("Failed to update: " + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (isLoading || !form) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Edit employee</h2>
          <p className="text-sm text-gray-400 mt-0.5">{employee.full_name}</p>
        </div>
        <button onClick={() => navigate(`/employees/${id}`)}
          className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1.5 transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Personal info */}
        <Section title="Personal details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label text="Full name" required />
              <Input value={form.full_name} onChange={v => set("full_name", v)} placeholder="Full name" />
            </div>
            <div>
              <Label text="Phone" required />
              <Input value={form.phone} onChange={v => set("phone", v)} placeholder="+92-300-0000000" />
            </div>
            <div>
              <Label text="Email" />
              <Input type="email" value={form.email} onChange={v => set("email", v)} placeholder="email@example.com" />
            </div>
            <div>
              <Label text="Date of birth" />
              <Input type="date" value={form.date_of_birth} onChange={v => set("date_of_birth", v)} />
            </div>
            <div>
              <Label text="ID type" />
              <Select value={form.id_type} onChange={v => set("id_type", v)}>
                <option value="cnic">CNIC</option>
                <option value="passport">Passport</option>
                <option value="driving_license">Driving license</option>
              </Select>
            </div>
            <div>
              <Label text="ID number" />
              <Input value={form.id_number} onChange={v => set("id_number", v)} placeholder="e.g. 35202-1234567-1" />
            </div>
            <div className="sm:col-span-2">
              <Label text="Address" />
              <Input value={form.address} onChange={v => set("address", v)} placeholder="Home address" />
            </div>
            <div>
              <Label text="Emergency contact name" />
              <Input value={form.emergency_contact_name} onChange={v => set("emergency_contact_name", v)} placeholder="Contact name" />
            </div>
            <div>
              <Label text="Emergency contact phone" />
              <Input value={form.emergency_contact_phone} onChange={v => set("emergency_contact_phone", v)} placeholder="+92-300-0000000" />
            </div>
          </div>
        </Section>

        {/* Job details */}
        <Section title="Job details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label text="Role" required />
              <Select value={form.role} onChange={v => set("role", v)}>
                <option value="">Select role</option>
                {roleOptions.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label text="Assigned building" />
              <Select value={form.building_id} onChange={v => set("building_id", v)}>
                <option value="">All buildings / Not assigned</option>
                {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </div>
            <div>
              <Label text="Monthly salary (PKR)" />
              <Input type="number" value={form.salary} onChange={v => set("salary", v)} placeholder="e.g. 25000" />
            </div>
            <div>
              <Label text="Join date" />
              <Input type="date" value={form.join_date} onChange={v => set("join_date", v)} />
            </div>
            <div>
              <Label text="Status" />
              <Select value={form.status} onChange={v => set("status", v)}>
                <option value="active">Active</option>
                <option value="on_leave">On leave</option>
                <option value="inactive">Inactive</option>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label text="Notes" />
              <textarea
                value={form.notes}
                onChange={e => set("notes", e.target.value)}
                placeholder="Any additional notes..."
                rows={3}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition resize-none"
              />
            </div>
          </div>
        </Section>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2">
          <button type="button" onClick={() => navigate(`/employees/${id}`)}
            className="text-sm px-4 py-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 bg-coral-500 hover:bg-coral-700 text-white text-sm font-medium px-6 py-2.5 rounded-xl transition disabled:opacity-60">
            {saving
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</>
              : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>Save changes</>
            }
          </button>
        </div>
      </form>
    </div>
  )
}

const Section = ({ title, children }) => (
  <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
    <h3 className="text-sm font-semibold text-gray-700 pb-3 border-b border-gray-100">{title}</h3>
    {children}
  </div>
)

const Label = ({ text, required }) => (
  <label className="block text-xs font-medium text-gray-600 mb-1.5">
    {text} {required && <span className="text-red-400">*</span>}
  </label>
)

const Input = ({ type = "text", value, onChange, placeholder, disabled }) => (
  <input
    type={type}
    value={value}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    disabled={disabled}
    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition disabled:bg-gray-50 disabled:text-gray-400"
  />
)

const Select = ({ value, onChange, children, disabled }) => (
  <select
    value={value}
    onChange={e => onChange(e.target.value)}
    disabled={disabled}
    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white transition disabled:bg-gray-50 disabled:text-gray-400">
    {children}
  </select>
)