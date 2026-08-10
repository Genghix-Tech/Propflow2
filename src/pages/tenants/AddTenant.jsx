import { useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { createTenant, getBuildings, getVacantUnits } from "../../services/tenantService"
import { REQUIRED_DOCS, uploadTenantDocument, markDocumentStatus } from "../../services/documentService"
import { formatCurrency } from "../../lib/utils"
import toast from "react-hot-toast"

const steps = ["Personal info", "Unit & lease", "KYC documents", "Notifications"]

const defaultForm = {
  full_name: "", email: "", phone: "", date_of_birth: "",
  id_type: "cnic", id_number: "",
  emergency_contact_name: "", emergency_contact_phone: "",
  occupation: "",
  building_id: "", unit_id: "",
  lease_start: "", lease_end: "",
  monthly_rent: "", maintenance_charges: "", security_deposit: "",
  escalation_pct: "5", lock_in_months: "11",
  notify_whatsapp: true, notify_email: true, notify_sms: false,
}

export default function AddTenant() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const [docFiles, setDocFiles] = useState({})       // { cnic: File, ... } — actual files picked
  const [docCollected, setDocCollected] = useState({}) // { cnic: true, ... } — marked collected without a file
  const fileInputs = useRef({})

  const { data: buildings = [] } = useQuery({
    queryKey: ["buildings"],
    queryFn: getBuildings,
  })

  const { data: vacantUnits = [] } = useQuery({
    queryKey: ["vacant-units", form.building_id],
    queryFn: () => getVacantUnits(form.building_id),
    enabled: !!form.building_id,
  })

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const firstMonthTotal = () => {
    const rent    = Number(form.monthly_rent) || 0
    const maint   = Number(form.maintenance_charges) || 0
    const deposit = Number(form.security_deposit) || 0
    return formatCurrency(rent + maint + deposit)
  }

  const validateStep = (s) => {
    if (s === 0) {
      if (!form.full_name.trim()) return "Full name is required (Personal info)"
      if (!form.phone.trim()) return "Phone number is required (Personal info)"
    }
    if (s === 1) {
      if (!form.building_id) return "Please select a building (Unit & lease)"
      if (!form.unit_id) return "Please select a unit (Unit & lease)"
      if (!form.lease_start) return "Lease start date is required (Unit & lease)"
      if (!form.lease_end) return "Lease end date is required (Unit & lease)"
      if (!form.monthly_rent) return "Monthly rent is required (Unit & lease)"
      if (!form.security_deposit) return "Security deposit is required (Unit & lease)"
    }
    return null
  }

  // Moving between steps is always allowed — validation only happens on final save.
  const handleNext = () => setStep(s => Math.min(s + 1, steps.length - 1))
  const goToStep = (i) => setStep(i)

  const handleSubmit = async () => {
    // Check every step, not just the current one, since the person may have
    // jumped around without filling everything in.
    for (let s = 0; s < steps.length; s++) {
      const error = validateStep(s)
      if (error) {
        toast.error(error)
        setStep(s)
        return
      }
    }
    setSaving(true)
    try {
      const tenant = await createTenant({
        full_name: form.full_name,
        email: form.email || null,
        phone: form.phone,
        date_of_birth: form.date_of_birth || null,
        id_type: form.id_type || null,
        id_number: form.id_number || null,
        emergency_contact_name: form.emergency_contact_name || null,
        emergency_contact_phone: form.emergency_contact_phone || null,
        occupation: form.occupation || null,
        building_id: form.building_id || null,
        unit_id: form.unit_id || null,
        lease_start: form.lease_start || null,
        lease_end: form.lease_end || null,
        monthly_rent: Number(form.monthly_rent) || 0,
        maintenance_charges: Number(form.maintenance_charges) || 0,
        security_deposit: Number(form.security_deposit) || 0,
        escalation_pct: Number(form.escalation_pct) || 0,
        lock_in_months: Number(form.lock_in_months) || 0,
        notify_whatsapp: form.notify_whatsapp,
        notify_email: form.notify_email,
        notify_sms: form.notify_sms,
        status: "active",
      })

      // Tenant now exists — upload any documents picked in step 3, and
      // persist manually-marked "collected" statuses for the rest.
      try {
        for (const doc of REQUIRED_DOCS) {
          const file = docFiles[doc.type]
          if (file) {
            await uploadTenantDocument(tenant.id, doc.type, file)
          } else if (docCollected[doc.type]) {
            await markDocumentStatus(tenant.id, doc.type, "collected")
          }
        }
      } catch (docErr) {
        // Tenant is already saved successfully — don't block on document issues,
        // just let the person know they'll need to finish this from the profile page.
        toast.error("Tenant saved, but some documents failed to upload: " + docErr.message)
      }

      toast.success("Tenant added successfully!")
      navigate("/tenants")
    } catch (err) {
      toast.error("Failed to add tenant: " + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Add new tenant</h2>
          <p className="text-sm text-gray-400 mt-0.5">Complete all steps to onboard a tenant</p>
        </div>
        <button onClick={() => navigate("/tenants")}
          className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1.5 transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Cancel
        </button>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-0">
        {steps.map((label, i) => (
          <div key={i} className="flex items-center flex-1">
            <button type="button" onClick={() => goToStep(i)}
              className="flex items-center gap-2 flex-shrink-0 cursor-pointer group">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                i < step  ? "bg-green-500 text-white group-hover:bg-green-600" :
                i === step ? "bg-brand-500 text-white" :
                "border border-gray-200 text-gray-400 group-hover:border-gray-300 group-hover:text-gray-500"
              }`}>
                {i < step
                  ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  : i + 1
                }
              </div>
              <span className={`text-xs font-medium hidden sm:block whitespace-nowrap ${
                i < step ? "text-green-600" :
                i === step ? "text-brand-600" :
                "text-gray-400 group-hover:text-gray-600"
              }`}>{label}</span>
            </button>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-px mx-3 ${i < step ? "bg-green-300" : "bg-gray-200"}`} />
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 -mt-3">
        You can move between steps freely — all sections must be complete before saving.
      </p>

      {/* Step 0 — Personal info */}
      {step === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <svg className="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Personal details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label text="Full name" required />
              <Input value={form.full_name} onChange={v => set("full_name", v)} placeholder="e.g. Ahmed Khan" />
            </div>
            <div>
              <Label text="Phone number" required />
              <Input value={form.phone} onChange={v => set("phone", v)} placeholder="+92-300-1234567" />
            </div>
            <div>
              <Label text="Email address" />
              <Input type="email" value={form.email} onChange={v => set("email", v)} placeholder="tenant@email.com" />
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
                <option value="ntn">NTN</option>
                <option value="driving_license">Driving license</option>
              </Select>
            </div>
            <div>
              <Label text="ID number" />
              <Input value={form.id_number} onChange={v => set("id_number", v)} placeholder="Enter ID number" />
            </div>
            <div>
              <Label text="Emergency contact name" />
              <Input value={form.emergency_contact_name} onChange={v => set("emergency_contact_name", v)} placeholder="e.g. Sunita Kumar" />
            </div>
            <div>
              <Label text="Emergency contact phone" />
              <Input value={form.emergency_contact_phone} onChange={v => set("emergency_contact_phone", v)} placeholder="+92-300-9876543" />
            </div>
          </div>
        </div>
      )}

      {/* Step 1 — Unit & lease */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <svg className="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Unit assignment
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label text="Building" required />
              <Select value={form.building_id} onChange={v => { set("building_id", v); set("unit_id", "") }}>
                <option value="">Select building</option>
                {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </div>
            <div>
              <Label text="Unit" required />
              <Select value={form.unit_id} onChange={v => set("unit_id", v)} disabled={!form.building_id}>
                <option value="">Select unit</option>
                {vacantUnits.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.unit_number}{u.bedrooms ? ` — ${u.bedrooms}` : ""} · Floor {u.floor}
                  </option>
                ))}
              </Select>
              {form.building_id && vacantUnits.length === 0 && (
                <p className="text-xs text-yellow-600 mt-1">No vacant units in this building.</p>
              )}
            </div>
          </div>

          <div className="border-t border-gray-100 pt-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Lease terms
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label text="Lease start" required />
                <Input type="date" value={form.lease_start} onChange={v => set("lease_start", v)} />
              </div>
              <div>
                <Label text="Lease end" required />
                <Input type="date" value={form.lease_end} onChange={v => set("lease_end", v)} />
              </div>
              <div>
                <Label text="Lock-in period (months)" />
                <Select value={form.lock_in_months} onChange={v => set("lock_in_months", v)}>
                  <option value="0">None</option>
                  <option value="3">3 months</option>
                  <option value="6">6 months</option>
                  <option value="11">11 months</option>
                  <option value="12">12 months</option>
                </Select>
              </div>
              <div>
                <Label text="Annual escalation (%)" />
                <Select value={form.escalation_pct} onChange={v => set("escalation_pct", v)}>
                  <option value="0">None</option>
                  <option value="5">5% per year</option>
                  <option value="10">10% per year</option>
                </Select>
              </div>
              <div>
                <Label text="Monthly rent (PKR)" required />
                <Input type="number" value={form.monthly_rent}
                  onChange={v => {
                    set("monthly_rent", v)
                    set("security_deposit", String(Number(v) * 3))
                  }}
                  placeholder="e.g. 32000" />
              </div>
              <div>
                <Label text="Maintenance charges (PKR)" />
                <Input type="number" value={form.maintenance_charges} onChange={v => set("maintenance_charges", v)} placeholder="e.g. 1500" />
              </div>
              <div className="sm:col-span-2">
                <Label text="Security deposit (PKR)" required />
                <Input type="number" value={form.security_deposit} onChange={v => set("security_deposit", v)} placeholder="Auto: 3× rent" />
                <p className="text-xs text-gray-400 mt-1">Auto-suggested as 3× monthly rent</p>
              </div>
            </div>

            {/* Summary */}
            {form.monthly_rent && (
              <div className="rent-calc bg-gray-50 rounded-xl p-4 space-y-2 mt-4">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Monthly rent</span>
                  <span>{formatCurrency(form.monthly_rent || 0)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Maintenance charges</span>
                  <span>{formatCurrency(form.maintenance_charges || 0)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Security deposit (one-time)</span>
                  <span>{formatCurrency(form.security_deposit || 0)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold text-gray-900 border-t border-gray-200 pt-2">
                  <span>First month total due</span>
                  <span className="text-brand-600">{firstMonthTotal()}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 2 — KYC documents */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <svg className="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            KYC documents
          </h3>
          <p className="text-xs text-gray-400">
            Upload a file now, or mark it as physically collected — either way it'll be saved once the tenant is created.
          </p>
          {REQUIRED_DOCS.map((doc) => {
            const file = docFiles[doc.type]
            const collected = docCollected[doc.type]
            return (
              <div key={doc.type}
                className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{doc.label}</div>
                    <div className="text-xs text-gray-400">{file ? file.name : doc.sub}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {doc.required && !file && !collected && (
                    <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-lg">Required</span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-lg ${
                    file || collected ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    {file || collected ? "Collected" : "Pending"}
                  </span>

                  {!file && !doc.required && (
                    <button type="button"
                      onClick={() => setDocCollected(d => ({ ...d, [doc.type]: !d[doc.type] }))}
                      className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
                      {collected ? "Unmark" : "Mark collected"}
                    </button>
                  )}

                  <input type="file" className="hidden"
                    ref={el => (fileInputs.current[doc.type] = el)}
                    onChange={e => {
                      const f = e.target.files?.[0]
                      if (f) setDocFiles(d => ({ ...d, [doc.type]: f }))
                    }} />
                  <button type="button" onClick={() => fileInputs.current[doc.type]?.click()}
                    className="text-xs px-3 py-1.5 rounded-lg bg-coral-500 hover:bg-coral-700 text-white transition">
                    {file ? "Change file" : "Upload"}
                  </button>
                </div>
              </div>
            )
          })}
          <p className="text-xs text-gray-400 pt-2">
            Files upload once you save the tenant — you can also add or replace documents later from the tenant's profile page.
          </p>
        </div>
      )}

      {/* Step 3 — Notifications */}
      {step === 3 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <svg className="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            Notification preferences
          </h3>
          <p className="text-sm text-gray-400">
            How should this tenant receive rent reminders and receipts?
          </p>
          <div className="space-y-3">
            {[
              { key: "notify_whatsapp", label: "WhatsApp", sub: "Most reliable · High open rate", color: "text-green-600 bg-green-50" },
              { key: "notify_email",    label: "Email",     sub: "Invoice + receipt delivery",    color: "text-brand-600 bg-brand-50" },
              { key: "notify_sms",      label: "SMS",       sub: "Fallback only",                 color: "text-gray-600 bg-gray-50" },
            ].map(opt => (
              <label key={opt.key}
                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition ${
                  form[opt.key] ? "border-brand-200 bg-brand-50" : "border-gray-100 hover:bg-gray-50"
                }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${opt.color}`}>
                    {opt.label[0]}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{opt.label}</div>
                    <div className="text-xs text-gray-400">{opt.sub}</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={form[opt.key]}
                  onChange={e => set(opt.key, e.target.checked)}
                  className="w-4 h-4 accent-brand-500"
                />
              </label>
            ))}
          </div>

          {/* Summary card */}
          <div className="bg-gray-50 rounded-xl p-4 mt-4 space-y-2 border border-gray-100">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Summary</div>
            <SummaryRow label="Name" value={form.full_name} />
            <SummaryRow label="Phone" value={form.phone} />
            <SummaryRow label="Building" value={buildings.find(b => b.id === form.building_id)?.name || "—"} />
            <SummaryRow label="Unit" value={vacantUnits.find(u => u.id === form.unit_id)?.unit_number || "—"} />
            <SummaryRow label="Monthly rent" value={form.monthly_rent ? formatCurrency(form.monthly_rent) : "—"} />
            <SummaryRow label="Lease" value={form.lease_start && form.lease_end ? `${form.lease_start} → ${form.lease_end}` : "—"} />
          </div>
        </div>
      )}

      {/* Footer buttons */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => step === 0 ? navigate("/tenants") : setStep(s => s - 1)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
          </svg>
          {step === 0 ? "Cancel" : "Back"}
        </button>

        {step < steps.length - 1 ? (
          <button onClick={handleNext}
            className="flex items-center gap-2 bg-coral-500 hover:bg-coral-700 text-white text-sm font-medium px-6 py-2.5 rounded-xl transition">
            Continue
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={saving}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-6 py-2.5 rounded-xl transition disabled:opacity-60">
            {saving
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
              : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg> Save tenant</>
            }
          </button>
        )}
      </div>
    </div>
  )
}

// Reusable small components
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

const SummaryRow = ({ label, value }) => (
  <div className="flex justify-between text-xs">
    <span className="text-gray-400">{label}</span>
    <span className="text-gray-700 font-medium">{value}</span>
  </div>
)