import { useRef, useEffect } from "react"
import { supabase } from "../../lib/supabase"
import { useState } from "react"
import { createTenantPortalLogin, resetTenantPortalPassword, toggleTenantPortalAccess } from "../../services/tenantPortalService"
import { formatCurrency, formatDate } from "../../lib/utils"
import { useParams, useNavigate, Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getTenantById, deleteTenant } from "../../services/tenantService"
import toast from "react-hot-toast"
import { getInvoicesByTenant } from "../../services/invoiceService"
import { getTenantDocuments, markDocumentStatus, uploadTenantDocument, getDocumentSignedUrl, deleteTenantDocument, verifyTenantDocument } from "../../services/documentService"
import { useAuth } from "../../context/AuthContext"

const statusStyle = {
  active:   "bg-green-50 text-green-700",
  expiring: "bg-yellow-50 text-yellow-700",
  overdue:  "bg-red-50 text-red-700",
  inactive: "bg-gray-100 text-gray-500",
}

export default function TenantProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [showPortalModal, setShowPortalModal] = useState(false)
  const [portalForm, setPortalForm] = useState({ username: "", password: "" })
  const [portalSaving, setPortalSaving] = useState(false)

  const { user } = useAuth()
  const displayName = user?.user_metadata?.full_name || user?.email || "Staff"

  const { data: tenant, isLoading, isError } = useQuery({
    queryKey: ["tenant", id],
    queryFn: () => getTenantById(id),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteTenant(id, tenant?.unit_id),
    onSuccess: () => {
      toast.success("Tenant removed")
      queryClient.invalidateQueries(["tenants"])
      navigate("/tenants")
    },
    onError: () => toast.error("Failed to remove tenant"),
  })

  const handleDelete = () => {
    if (!confirm(`Remove ${tenant?.full_name}? This cannot be undone.`)) return
    deleteMutation.mutate()
  }

  if (isLoading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (isError || !tenant) return (
    <div className="text-center py-32 text-gray-400 text-sm">
      Tenant not found.{" "}
      <Link to="/tenants" className="text-brand-500 hover:underline">Go back</Link>
    </div>
  )

  const initials = tenant.full_name.split(" ").map(n => n[0]).join("").slice(0, 2)
  const leaseEndDate = tenant.lease_end ? new Date(tenant.lease_end) : null
  const daysLeft = leaseEndDate
    ? Math.ceil((leaseEndDate - new Date()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Print header — only visible when printing */}
      <div className="print-only mb-6 pb-4 border-b-2 border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-gray-900">PropFlow</div>
            <div className="text-sm text-gray-400">Real Estate Management</div>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold text-gray-700">Tenant Profile</div>
            <div className="text-sm text-gray-400">
              Printed on {new Date().toLocaleDateString("en-PK", {
                day: "2-digit", month: "long", year: "numeric"
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Top bar — hidden on print */}
      <div className="no-print flex items-center justify-between flex-wrap gap-3">
        <button onClick={() => navigate("/tenants")}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
          </svg>
          Back to tenants
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()}
            className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </button>
          <Link to={`/tenants/${id}/edit`}
            className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </Link>
          <button onClick={() => setShowPortalModal(true)}
            className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            {tenant.portal_active ? "Portal access ✓" : "Setup portal"}
          </button>
          <button onClick={handleDelete}
            className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl border border-red-200 hover:bg-red-50 text-red-500 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Remove
          </button>
        </div>
      </div>

      {/* Profile header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-700 text-xl font-semibold flex items-center justify-center flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-semibold text-gray-900">{tenant.full_name}</h2>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-lg capitalize ${statusStyle[tenant.status]}`}>
                {tenant.status}
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-1">
              {tenant.buildings?.name} · {tenant.units?.unit_number}
              {tenant.units?.bedrooms ? ` · ${tenant.units.bedrooms}` : ""}
              {tenant.units?.type ? ` · ${tenant.units.type}` : ""}
            </p>
            <div className="flex flex-wrap gap-4 mt-3">
              <span className="flex items-center gap-1.5 text-sm text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {tenant.phone}
              </span>
              {tenant.email && (
                <span className="flex items-center gap-1.5 text-sm text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {tenant.email}
                </span>
              )}
            </div>
          </div>
          {daysLeft !== null && (
            <div className={`no-print text-center px-4 py-3 rounded-xl flex-shrink-0 ${
              daysLeft < 0 ? "bg-red-50" :
              daysLeft < 60 ? "bg-yellow-50" : "bg-green-50"
            }`}>
              <div className={`text-2xl font-semibold ${
                daysLeft < 0 ? "text-red-600" :
                daysLeft < 60 ? "text-yellow-600" : "text-green-600"
              }`}>{daysLeft < 0 ? "Expired" : daysLeft}</div>
              <div className="text-xs text-gray-400 mt-0.5">
                {daysLeft < 0 ? "Lease ended" : "days left"}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <SectionTitle title="Personal details" />
          <InfoRow label="Full name" value={tenant.full_name} />
          <InfoRow label="Phone" value={tenant.phone} />
          <InfoRow label="Email" value={tenant.email || "—"} />
          <InfoRow label="Date of birth" value={
            tenant.date_of_birth
              ? new Date(tenant.date_of_birth).toLocaleDateString("en-PK", {
                  day: "2-digit", month: "long", year: "numeric"
                })
              : "—"
          } />
          <InfoRow label="Occupation" value={tenant.occupation || "—"} />
          <InfoRow label="ID type" value={tenant.id_type?.toUpperCase() || "—"} />
          <InfoRow label="ID number" value={tenant.id_number || "—"} />
          <InfoRow label="Emergency contact" value={
            tenant.emergency_contact_name
              ? `${tenant.emergency_contact_name} · ${tenant.emergency_contact_phone}`
              : "—"
          } />
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <SectionTitle title="Lease details" />
          <InfoRow label="Building" value={tenant.buildings?.name || "—"} />
          <InfoRow label="Unit" value={tenant.units?.unit_number || "—"} />
          <InfoRow label="Unit type" value={tenant.units?.type || "—"} />
          <InfoRow label="Bedrooms" value={tenant.units?.bedrooms || "—"} />
          <InfoRow label="Lease start" value={
            tenant.lease_start
              ? new Date(tenant.lease_start).toLocaleDateString("en-PK", {
                  day: "2-digit", month: "long", year: "numeric"
                })
              : "—"
          } />
          <InfoRow label="Lease end" value={
            tenant.lease_end
              ? new Date(tenant.lease_end).toLocaleDateString("en-PK", {
                  day: "2-digit", month: "long", year: "numeric"
                })
              : "—"
          } />
          <InfoRow label="Lock-in period"
            value={tenant.lock_in_months ? `${tenant.lock_in_months} months` : "None"} />
          <InfoRow label="Escalation"
            value={tenant.escalation_pct ? `${tenant.escalation_pct}% per year` : "None"} />
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <SectionTitle title="Financials" />
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-brand-50 rounded-xl p-3 text-center">
              <div className="text-lg font-semibold text-brand-700">
                {formatCurrency(tenant.monthly_rent)}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">Monthly rent</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-lg font-semibold text-gray-700">
                {formatCurrency(tenant.maintenance_charges || 0)}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">Maintenance</div>
            </div>
            <div className="bg-purple-50 rounded-xl p-3 text-center">
              <div className="text-lg font-semibold text-purple-700">
                {formatCurrency(tenant.security_deposit || 0)}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">Deposit</div>
            </div>
          </div>
          <InfoRow label="Total monthly due"
            value={formatCurrency(Number(tenant.monthly_rent) + Number(tenant.maintenance_charges || 0))}
          />
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <SectionTitle title="Notification preferences" />
          <div className="space-y-0 mb-5">
            {[
              { label: "WhatsApp", key: "notify_whatsapp", color: "bg-green-50 text-green-700" },
              { label: "Email",    key: "notify_email",    color: "bg-brand-50 text-brand-700" },
              { label: "SMS",      key: "notify_sms",      color: "bg-gray-100 text-gray-600" },
            ].map(opt => (
              <div key={opt.key}
                className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-600">{opt.label}</span>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${
                  tenant[opt.key] ? opt.color : "bg-gray-100 text-gray-400"
                }`}>
                  {tenant[opt.key] ? "Enabled" : "Disabled"}
                </span>
              </div>
            ))}
          </div>
          <SectionTitle title="KYC status" />
          {[
            { label: "Aadhaar / ID",        done: !!tenant.id_number },
            { label: "Rent agreement",       done: !!tenant.lease_start },
            { label: "Police verification",  done: false },
          ].map(doc => (
            <div key={doc.label}
              className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
              <span className="text-sm text-gray-600">{doc.label}</span>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${
                doc.done ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-600"
              }`}>
                {doc.done ? "Collected" : "Pending"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Payment history */}
      <PaymentHistory tenantId={id} />

      {/* Documents */}
      <DocumentsPanel tenantId={id} />

      {/* Staff messaging */}
      <StaffMessaging tenantId={id} staffName={displayName} />

      {/* Print footer */}
      <div className="print-only mt-8 pt-4 border-t border-gray-200 text-center text-xs text-gray-400">
        PropFlow · Real Estate Management · Confidential document
      </div>

      {/* Portal modal */}
      {showPortalModal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-base font-semibold text-gray-900">
              {tenant.portal_active ? "Manage portal access" : "Setup portal login"}
            </h3>

            {tenant.portal_active ? (
              <>
                <p className="text-sm text-gray-500">
                  Portal username: <span className="font-medium text-gray-900">@{tenant.portal_username}</span>
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Reset password</label>
                    <input type="text" value={portalForm.password}
                      onChange={e => setPortalForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="New password (min 6 chars)"
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                  <button
                    onClick={async () => {
                      if (portalForm.password.length < 6) { toast.error("Min 6 characters"); return }
                      setPortalSaving(true)
                      try {
                        await resetTenantPortalPassword(tenant.portal_user_id, portalForm.password)
                        toast.success("Password reset!")
                        setPortalForm({ username: "", password: "" })
                      } catch { toast.error("Failed to reset") }
                      setPortalSaving(false)
                    }}
                    disabled={portalSaving}
                    className="w-full py-2.5 text-sm rounded-xl bg-coral-500 hover:bg-coral-700 text-white font-medium transition disabled:opacity-60">
                    Reset password
                  </button>
                  <button
                    onClick={async () => {
                      setPortalSaving(true)
                      try {
                        await toggleTenantPortalAccess(tenant.id, !tenant.portal_active)
                        toast.success(tenant.portal_active ? "Portal access disabled" : "Portal access enabled")
                        queryClient.invalidateQueries(["tenant", id])
                        setShowPortalModal(false)
                      } catch { toast.error("Failed to update") }
                      setPortalSaving(false)
                    }}
                    className={`w-full py-2.5 text-sm rounded-xl border font-medium transition ${
                      tenant.portal_active
                        ? "border-red-200 text-red-500 hover:bg-red-50"
                        : "border-green-200 text-green-600 hover:bg-green-50"
                    }`}>
                    {tenant.portal_active ? "Disable portal access" : "Enable portal access"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-gray-400">
                  Create a portal login so this tenant can view their invoices, raise maintenance requests, and message you.
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Username</label>
                    <input type="text" value={portalForm.username}
                      onChange={e => setPortalForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/\s/g, "") }))}
                      placeholder="e.g. ahmed_khan or phone number"
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Password</label>
                    <input type="text" value={portalForm.password}
                      onChange={e => setPortalForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="Min 6 characters"
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                </div>
                <button
                  onClick={async () => {
                    if (!portalForm.username.trim()) { toast.error("Username required"); return }
                    if (portalForm.password.length < 6) { toast.error("Min 6 characters"); return }
                    setPortalSaving(true)
                    try {
                      await createTenantPortalLogin(tenant.id, portalForm.username, portalForm.password)
                      toast.success("Portal login created!")
                      queryClient.invalidateQueries(["tenant", id])
                      setShowPortalModal(false)
                      setPortalForm({ username: "", password: "" })
                    } catch (err) { toast.error("Failed: " + err.message) }
                    setPortalSaving(false)
                  }}
                  disabled={portalSaving}
                  className="w-full py-2.5 text-sm rounded-xl bg-coral-500 hover:bg-coral-700 text-white font-medium transition disabled:opacity-60">
                  {portalSaving ? "Creating..." : "Create portal login"}
                </button>
              </>
            )}

            <button onClick={() => setShowPortalModal(false)}
              className="w-full py-2.5 text-sm rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function SectionTitle({ title }) {
  return (
    <h3 className="text-sm font-semibold text-gray-700 mb-4 pb-3 border-b border-gray-100">
      {title}
    </h3>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-start py-2.5 border-b border-gray-50 last:border-0 gap-4">
      <span className="text-sm text-gray-400 flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-800 font-medium text-right">{value}</span>
    </div>
  )
}

function DocumentsPanel({ tenantId }) {
  const queryClient = useQueryClient()
  const { can } = useAuth()
  const canEdit = can("tenants", "edit")
  const [uploadingType, setUploadingType] = useState(null)
  const fileInputs = useRef({})

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["tenant-documents", tenantId],
    queryFn: () => getTenantDocuments(tenantId),
  })

  const refresh = () => queryClient.invalidateQueries(["tenant-documents", tenantId])

  const handleFileSelected = async (docType, e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingType(docType)
    try {
      await uploadTenantDocument(tenantId, docType, file)
      toast.success("Document uploaded")
      refresh()
    } catch (err) {
      toast.error("Upload failed: " + err.message)
    } finally {
      setUploadingType(null)
      e.target.value = ""
    }
  }

  const handleToggleCollected = async (doc) => {
    try {
      await markDocumentStatus(tenantId, doc.type, doc.status === "collected" ? "pending" : "collected")
      refresh()
    } catch (err) {
      toast.error("Failed to update: " + err.message)
    }
  }

  const handleView = async (filePath) => {
    try {
      const url = await getDocumentSignedUrl(filePath)
      window.open(url, "_blank")
    } catch (err) {
      toast.error("Failed to open file: " + err.message)
    }
  }

  const handleVerify = async (doc) => {
    try {
      await verifyTenantDocument(tenantId, doc.type)
      toast.success(`${doc.label} verified`)
      refresh()
    } catch (err) {
      toast.error("Failed to verify: " + err.message)
    }
  }

  const handleDelete = async (doc) => {
    if (!confirm(`Remove uploaded ${doc.label}?`)) return
    try {
      await deleteTenantDocument(doc.id, doc.file_path, tenantId, doc.type)
      toast.success("Document removed")
      refresh()
    } catch (err) {
      toast.error("Failed to remove: " + err.message)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4 no-print">
      <SectionTitle title="Documents" />
      {isLoading ? (
        <div className="text-sm text-gray-400">Loading...</div>
      ) : (
        docs.map(doc => (
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
                <div className="text-xs text-gray-400">
                  {doc.file_name || doc.sub}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {doc.required && doc.status === "pending" && (
                <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-lg">Required</span>
              )}
              {doc.required || !canEdit ? (
                <span className={`text-xs px-2 py-0.5 rounded-lg ${
                  doc.status === "collected" ? "bg-green-50 text-green-700" :
                  doc.status === "pending_verification" ? "bg-yellow-50 text-yellow-700" :
                  "bg-gray-100 text-gray-500"
                }`}>
                  {doc.status === "collected" ? (doc.required ? "Verified" : "Collected") :
                   doc.status === "pending_verification" ? "Pending verification" :
                   "Pending"}
                </span>
              ) : (
                <button onClick={() => handleToggleCollected(doc)}
                  className={`text-xs px-2 py-0.5 rounded-lg transition ${
                    doc.status === "collected" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}>
                  {doc.status === "collected" ? "Collected" : "Pending"}
                </button>
              )}

              {canEdit && doc.status === "pending_verification" && (
                <button onClick={() => handleVerify(doc)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white transition">
                  Verify
                </button>
              )}

              {doc.file_path ? (
                <>
                  <button onClick={() => handleView(doc.file_path)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
                    View
                  </button>
                  {canEdit && (
                    <button onClick={() => handleDelete(doc)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-red-500 hover:bg-red-50 transition">
                      Remove
                    </button>
                  )}
                </>
              ) : canEdit ? (
                <>
                  <input type="file" className="hidden"
                    ref={el => (fileInputs.current[doc.type] = el)}
                    onChange={e => handleFileSelected(doc.type, e)} />
                  <button onClick={() => fileInputs.current[doc.type]?.click()}
                    disabled={uploadingType === doc.type}
                    className="text-xs px-3 py-1.5 rounded-lg bg-coral-500 hover:bg-coral-700 text-white transition disabled:opacity-60">
                    {uploadingType === doc.type ? "Uploading..." : "Upload"}
                  </button>
                </>
              ) : null}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function PaymentHistory({ tenantId }) {
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["tenant-invoices", tenantId],
    queryFn: () => getInvoicesByTenant(tenantId),
  })

  const MONTHS = [
    "Jan","Feb","Mar","Apr","May","Jun",
    "Jul","Aug","Sep","Oct","Nov","Dec"
  ]

  const statusStyle = {
    paid:      "bg-green-50 text-green-700",
    pending:   "bg-yellow-50 text-yellow-700",
    overdue:   "bg-red-50 text-red-700",
    cancelled: "bg-gray-100 text-gray-400",
  }

  const totalPaid = invoices
    .filter(i => i.status === "paid")
    .reduce((sum, i) => sum + Number(i.total_amount), 0)

  const totalPending = invoices
    .filter(i => i.status !== "paid" && i.status !== "cancelled")
    .reduce((sum, i) => sum + Number(i.total_amount), 0)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Payment history</h3>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-gray-400">Total collected</div>
            <div className="text-sm font-semibold text-green-600">
              PKR {totalPaid.toLocaleString("en-PK")}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400">Outstanding</div>
            <div className="text-sm font-semibold text-red-500">
              PKR {totalPending.toLocaleString("en-PK")}
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">
          No invoices generated yet.
        </div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="text-xs font-medium text-gray-400 uppercase tracking-wide bg-gray-50 border-b border-gray-100">
              <th className="text-left px-6 py-3">Invoice</th>
              <th className="text-left px-4 py-3">Period</th>
              <th className="text-left px-4 py-3 hidden sm:table-cell">Due date</th>
              <th className="text-left px-4 py-3 hidden sm:table-cell">Paid on</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Method</th>
              <th className="text-right px-6 py-3">Amount</th>
              <th className="text-left px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {invoices.map(inv => (
              <tr key={inv.id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-3 text-xs font-medium text-gray-500">
                  {inv.invoice_number}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {MONTHS[inv.month - 1]} {inv.year}
                </td>
                <td className="px-4 py-3 text-sm text-gray-400 hidden sm:table-cell">
                  {inv.due_date
                    ? new Date(inv.due_date).toLocaleDateString("en-PK", {
                        day: "2-digit", month: "short", year: "numeric"
                      })
                    : "—"}
                </td>
                <td className="px-4 py-3 text-sm text-gray-400 hidden sm:table-cell">
                  {inv.paid_date
                    ? new Date(inv.paid_date).toLocaleDateString("en-PK", {
                        day: "2-digit", month: "short", year: "numeric"
                      })
                    : "—"}
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className="text-xs text-gray-400 capitalize">
                    {inv.payment_method?.replace(/_/g, " ") || "—"}
                  </span>
                </td>
                <td className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                  PKR {Number(inv.total_amount).toLocaleString("en-PK")}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-lg capitalize ${statusStyle[inv.status]}`}>
                    {inv.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function StaffMessaging({ tenantId, staffName }) {
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)
  const queryClient = useQueryClient()
  const bottomRef = useRef(null)
  const scrollContainerRef = useRef(null)

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", tenantId],
    queryFn: () => import("../../services/tenantPortalService")
      .then(m => m.getMyMessages(tenantId)),
  })

  useEffect(() => {
    if (!tenantId) return
    const channel = supabase
      .channel(`staff-messages-${tenantId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages",
        filter: `tenant_id=eq.${tenantId}`,
      }, () => queryClient.invalidateQueries(["messages", tenantId]))
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [tenantId, queryClient])

  useEffect(() => {
    // Scroll only within the message list itself — not scrollIntoView, which
    // would also scroll the whole page down to bring this section into view.
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return
    setSending(true)
    try {
      const { sendMessageAsStaff } = await import("../../services/tenantPortalService")
      await sendMessageAsStaff(tenantId, staffName, newMessage.trim())
      setNewMessage("")
      queryClient.invalidateQueries(["messages", tenantId])
    } catch (err) {
      toast.error("Failed to send: " + err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">Messages with tenant</h3>
      </div>
      <div className="flex flex-col" style={{ height: "400px" }}>
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-5 space-y-3">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              No messages yet.
            </div>
          ) : messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.sender_type === "staff" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-xs sm:max-w-md rounded-2xl px-4 py-2.5 ${
                msg.sender_type === "staff"
                  ? "bg-brand-500 text-white rounded-br-sm"
                  : "bg-gray-100 text-gray-800 rounded-bl-sm"
              }`}>
                {msg.sender_type === "tenant" && (
                  <div className="text-xs font-medium mb-1 text-gray-500">{msg.sender_name}</div>
                )}
                <p className="text-sm">{msg.body}</p>
                <div className={`text-xs mt-1 ${msg.sender_type === "staff" ? "text-brand-200" : "text-gray-400"}`}>
                  {new Date(msg.created_at).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <form onSubmit={handleSend} className="border-t border-gray-100 p-4 flex gap-3">
          <input type="text" value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="Message this tenant..."
            className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
          <button type="submit" disabled={sending || !newMessage.trim()}
            className="w-10 h-10 bg-coral-500 hover:bg-coral-700 text-white rounded-xl transition disabled:opacity-50 flex-shrink-0 flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  )
}