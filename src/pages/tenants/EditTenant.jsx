import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { getTenantById, updateTenant, getBuildings, getVacantUnits } from "../../services/tenantService"
import toast from "react-hot-toast"

export default function EditTenant() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)

  const { data: tenant, isLoading } = useQuery({
    queryKey: ["tenant", id],
    queryFn: () => getTenantById(id),
  })

  const { data: buildings = [] } = useQuery({
    queryKey: ["buildings"],
    queryFn: getBuildings,
  })

  const { data: vacantUnits = [] } = useQuery({
    queryKey: ["vacant-units", form?.building_id],
    queryFn: () => getVacantUnits(form?.building_id),
    enabled: !!form?.building_id,
  })

  // Pre-fill form when tenant data loads
  useEffect(() => {
    if (tenant) {
      setForm({
        full_name: tenant.full_name || "",
        email: tenant.email || "",
        phone: tenant.phone || "",
        date_of_birth: tenant.date_of_birth || "",
        id_type: tenant.id_type || "aadhaar",
        id_number: tenant.id_number || "",
        emergency_contact_name: tenant.emergency_contact_name || "",
        emergency_contact_phone: tenant.emergency_contact_phone || "",
        occupation: tenant.occupation || "",
        building_id: tenant.building_id || "",
        unit_id: tenant.unit_id || "",
        lease_start: tenant.lease_start || "",
        lease_end: tenant.lease_end || "",
        monthly_rent: tenant.monthly_rent || "",
        maintenance_charges: tenant.maintenance_charges || "",
        security_deposit: tenant.security_deposit || "",
        escalation_pct: tenant.escalation_pct || "0",
        lock_in_months: tenant.lock_in_months || "0",
        notify_whatsapp: tenant.notify_whatsapp ?? true,
        notify_email: tenant.notify_email ?? true,
        notify_sms: tenant.notify_sms ?? false,
        status: tenant.status || "active",
      })
    }
  }, [tenant])

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.full_name.trim()) { toast.error("Full name is required"); return }
    if (!form.phone.trim()) { toast.error("Phone is required"); return }
    if (!form.monthly_rent) { toast.error("Monthly rent is required"); return }

    setSaving(true)
    try {
      await updateTenant(id, {
        ...form,
        monthly_rent: Number(form.monthly_rent),
        maintenance_charges: Number(form.maintenance_charges) || 0,
        security_deposit: Number(form.security_deposit) || 0,
        escalation_pct: Number(form.escalation_pct) || 0,
        lock_in_months: Number(form.lock_in_months) || 0,
        date_of_birth: form.date_of_birth || null,
        lease_start: form.lease_start || null,
        lease_end: form.lease_end || null,
        email: form.email || null,
        id_number: form.id_number || null,
        occupation: form.occupation || null,
        emergency_contact_name: form.emergency_contact_name || null,
        emergency_contact_phone: form.emergency_contact_phone || null,
      })
      toast.success("Tenant updated successfully!")
      queryClient.invalidateQueries(["tenant", id])
      queryClient.invalidateQueries(["tenants"])
      navigate(`/tenants/${id}`)
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
          <h2 className="text-xl font-semibold text-gray-900">Edit tenant</h2>
          <p className="text-sm text-gray-400 mt-0.5">{tenant.full_name}</p>
        </div>
        <button onClick={() => navigate(`/tenants/${id}`)}
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
              <Label text="Occupation" />
              <Input value={form.occupation} onChange={v => set("occupation", v)} placeholder="e.g. Engineer" />
            </div>
            <div>
              <Label text="ID type" />
              <Select value={form.id_type} onChange={v => set("id_type", v)}>
                <option value="cnic">CNIC</option>
                <option value="passport">Passport</option>
                <option value="voter_id">Voter ID</option>
		<option value="driving_license">Driving license</option>
		  <option value="ntn">NTN</option>
              </Select>
            </div>
            <div>
              <Label text="ID number" />
              <Input value={form.id_number} onChange={v => set("id_number", v)} placeholder="ID number" />
            </div>
            <div>
              <Label text="Emergency contact name" />
              <Input value={form.emergency_contact_name} onChange={v => set("emergency_contact_name", v)} placeholder="Name" />
            </div>
            <div>
              <Label text="Emergency contact phone" />
              <Input value={form.emergency_contact_phone} onChange={v => set("emergency_contact_phone", v)} placeholder="+92-300-0000000" />
            </div>
          </div>
        </Section>

        {/* Unit & lease */}
        <Section title="Unit & lease">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label text="Building" />
              <Select value={form.building_id} onChange={v => { set("building_id", v); set("unit_id", "") }}>
                <option value="">Select building</option>
                {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </div>
            <div>
              <Label text="Unit" />
              <Select value={form.unit_id} onChange={v => set("unit_id", v)} disabled={!form.building_id}>
                <option value="">Select unit</option>
                {/* Show current unit even if occupied */}
                {tenant.units && (
                  <option value={tenant.unit_id}>
                    {tenant.units.unit_number} (current)
                  </option>
                )}
                {vacantUnits
                  .filter(u => u.id !== tenant.unit_id)
                  .map(u => (
                    <option key={u.id} value={u.id}>
                      {u.unit_number}{u.bedrooms ? ` — ${u.bedrooms}` : ""} · Floor {u.floor}
                    </option>
                  ))
                }
              </Select>
            </div>
            <div>
              <Label text="Lease start" />
              <Input type="date" value={form.lease_start} onChange={v => set("lease_start", v)} />
            </div>
            <div>
              <Label text="Lease end" />
              <Input type="date" value={form.lease_end} onChange={v => set("lease_end", v)} />
            </div>
            <div>
              <Label text="Lock-in period" />
              <Select value={form.lock_in_months} onChange={v => set("lock_in_months", v)}>
                <option value="0">None</option>
                <option value="3">3 months</option>
                <option value="6">6 months</option>
                <option value="11">11 months</option>
                <option value="12">12 months</option>
              </Select>
            </div>
            <div>
              <Label text="Annual escalation" />
              <Select value={form.escalation_pct} onChange={v => set("escalation_pct", v)}>
                <option value="0">None</option>
                <option value="5">5% per year</option>
                <option value="10">10% per year</option>
              </Select>
            </div>
            <div>
              <Label text="Monthly rent (PKR)" required />
              <Input type="number" value={form.monthly_rent} onChange={v => set("monthly_rent", v)} placeholder="e.g. 32000" />
            </div>
            <div>
              <Label text="Maintenance charges (PKR)" />
              <Input type="number" value={form.maintenance_charges} onChange={v => set("maintenance_charges", v)} placeholder="e.g. 1500" />
            </div>
            <div className="sm:col-span-2">
              <Label text="Security deposit (PKR)" />
              <Input type="number" value={form.security_deposit} onChange={v => set("security_deposit", v)} placeholder="e.g. 96000" />
            </div>
          </div>
        </Section>

        {/* Status */}
        <Section title="Status & notifications">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label text="Tenant status" />
              <Select value={form.status} onChange={v => set("status", v)}>
                <option value="active">Active</option>
                <option value="expiring">Expiring</option>
                <option value="overdue">Overdue</option>
                <option value="inactive">Inactive</option>
              </Select>
            </div>
          </div>
          <div className="space-y-3 mt-4">
            {[
              { key: "notify_whatsapp", label: "WhatsApp notifications" },
              { key: "notify_email",    label: "Email notifications" },
              { key: "notify_sms",      label: "SMS notifications" },
            ].map(opt => (
              <label key={opt.key}
                className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer transition">
                <span className="text-sm text-gray-700">{opt.label}</span>
                <input
                  type="checkbox"
                  checked={form[opt.key]}
                  onChange={e => set(opt.key, e.target.checked)}
                  className="w-4 h-4 accent-brand-500"
                />
              </label>
            ))}
          </div>
        </Section>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2">
          <button type="button" onClick={() => navigate(`/tenants/${id}`)}
            className="text-sm px-4 py-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 bg-coral-500 hover:bg-coral-700 text-white text-sm font-medium px-6 py-2.5 rounded-xl transition disabled:opacity-60">
            {saving
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</>
              : <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save changes
                </>
            }
          </button>
        </div>
      </form>
    </div>
  )
}

// Reusable components
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