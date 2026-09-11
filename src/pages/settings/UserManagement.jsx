import { getRoles, assignRoleToUser } from "../../services/permissionService"
import { adminResetPassword, updateUserInfo } from "../../services/userService"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  getUsers, createUser,
  toggleUserActive,
  deleteUser, changePassword
} from "../../services/userService"
import { getAppSettings, updateInvoiceBankInfo } from "../../services/settingsService"
import { useAuth } from "../../context/AuthContext"
import toast from "react-hot-toast"

const roleStyle = {
  Owner:   "bg-purple-50 text-purple-700",
  Manager: "bg-blue-50 text-blue-700",
  Viewer:  "bg-gray-100 text-gray-600",
}

export default function UserManagement() {
  const { profile, role, isOwner } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [editingUser, setEditingUser] = useState(null)
  const [editForm, setEditForm] = useState({ display_name: "", username: "" })
  const [showResetModal, setShowResetModal] = useState(null)
  const [resetPassword, setResetPassword] = useState("")
  const [showAddModal, setShowAddModal]   = useState(false)
  const [showPwModal, setShowPwModal]     = useState(false)
  const [newPassword, setNewPassword]     = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [saving, setSaving]               = useState(false)
  const [form, setForm] = useState({
    username: "", password: "", display_name: "", role_id: ""
  })

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
  })

  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: getRoles,
  })

  const { data: appSettings } = useQuery({
    queryKey: ["app-settings"],
    queryFn: getAppSettings,
  })
  const [bankInfo, setBankInfo] = useState("")
  const [bankInfoDirty, setBankInfoDirty] = useState(false)
  const [savingBankInfo, setSavingBankInfo] = useState(false)
  if (appSettings && !bankInfoDirty && bankInfo !== (appSettings.invoice_bank_info || "")) {
    setBankInfo(appSettings.invoice_bank_info || "")
  }

  const handleSaveBankInfo = async () => {
    setSavingBankInfo(true)
    try {
      await updateInvoiceBankInfo(bankInfo.trim())
      setBankInfoDirty(false)
      queryClient.invalidateQueries(["app-settings"])
      toast.success("Invoice payment details saved")
    } catch (err) {
      toast.error(err.message || "Failed to save")
    } finally {
      setSavingBankInfo(false)
    }
  }

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const handleCreateUser = async (e) => {
    e.preventDefault()
    if (!form.username.trim())    { toast.error("Username is required"); return }
    if (!form.display_name.trim()) { toast.error("Display name is required"); return }
    if (!form.role_id)            { toast.error("Please select a role"); return }
    if (form.password.length < 6) { toast.error("Password must be at least 6 characters"); return }

    setSaving(true)
    try {
      await createUser(form)
      toast.success(`User "${form.username}" created successfully!`)
      setShowAddModal(false)
      setForm({ username: "", password: "", display_name: "", role_id: "" })
      queryClient.invalidateQueries(["users"])
    } catch (err) {
      toast.error("Failed to create user: " + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleEditUser = (user) => {
    setEditingUser(user.id)
    setEditForm({ display_name: user.display_name, username: user.username })
  }

  const handleSaveEdit = async (userId) => {
    if (!editForm.display_name.trim() || !editForm.username.trim()) {
      toast.error("Both fields are required")
      return
    }
    try {
      await updateUserInfo(userId, editForm)
      toast.success("User updated")
      setEditingUser(null)
      queryClient.invalidateQueries(["users"])
    } catch (err) {
      toast.error("Failed to update: " + err.message)
    }
  }

  const handleAdminReset = async () => {
    if (resetPassword.length < 6) { toast.error("Password must be at least 6 characters"); return }
    setSaving(true)
    try {
      await adminResetPassword(showResetModal, resetPassword)
      toast.success("Password reset successfully!")
      setShowResetModal(null)
      setResetPassword("")
    } catch (err) {
      toast.error("Failed to reset: " + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (userId, current) => {
    try {
      await toggleUserActive(userId, !current)
      toast.success(`User ${current ? "deactivated" : "activated"}`)
      queryClient.invalidateQueries(["users"])
    } catch {
      toast.error("Failed to update user")
    }
  }

  const handleRoleChange = async (userId, roleId) => {
    try {
      await assignRoleToUser(userId, roleId)
      toast.success("Role updated")
      queryClient.invalidateQueries(["users"])
    } catch {
      toast.error("Failed to update role")
    }
  }

  const handleDeleteUser = async (userId, username) => {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return
    try {
      await deleteUser(userId)
      toast.success("User deleted")
      queryClient.invalidateQueries(["users"])
    } catch {
      toast.error("Failed to delete user")
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return }
    if (newPassword !== confirmPassword) { toast.error("Passwords do not match"); return }
    setSaving(true)
    try {
      await changePassword(newPassword)
      toast.success("Password changed successfully!")
      setShowPwModal(false)
      setNewPassword("")
      setConfirmPassword("")
    } catch (err) {
      toast.error("Failed to change password: " + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">User management</h2>
          <p className="text-sm text-gray-400 mt-0.5">Manage who has access to the system</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowPwModal(true)}
            className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            Change my password
          </button>
          {isOwner && (
            <>
              <button onClick={() => navigate("/settings/roles")}
                className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Manage roles
              </button>
              <button onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 bg-coral-500 hover:bg-coral-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add user
              </button>
            </>
          )}
        </div>
      </div>

      {/* Current user info */}
      <div className="bg-brand-50 rounded-2xl p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-brand-500 text-white text-lg font-semibold flex items-center justify-center flex-shrink-0">
          {profile?.display_name?.[0]?.toUpperCase() || "U"}
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-900">{profile?.display_name}</div>
          <div className="text-xs text-gray-500 mt-0.5">@{profile?.username} · <span>{role}</span></div>
        </div>
      </div>

      {/* Invoice payment details — shown on every invoice PDF/print */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-gray-900">Invoice payment details</h3>
        <p className="text-xs text-gray-400 mt-0.5 mb-3">
          Bank account / payment method shown on every invoice's PDF and printout — e.g. bank name, account title, account number, IBAN.
        </p>
        <textarea
          value={bankInfo}
          onChange={e => { setBankInfo(e.target.value); setBankInfoDirty(true) }}
          rows={3}
          placeholder={"e.g. Bank Al Habib — Account Title: ISM Builders — A/C: 1234-5678901-2 — IBAN: PK00AHAB0000001234567890"}
          className="w-full text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 resize-none"
        />
        <div className="flex justify-end mt-3">
          <button onClick={handleSaveBankInfo} disabled={savingBankInfo || !bankInfoDirty}
            className="text-sm font-medium px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white transition">
            {savingBankInfo ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {/* Users table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">All users ({users.length})</h3>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-xs font-medium text-gray-400 uppercase tracking-wide bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3">User</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Role</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Last login</th>
                <th className="text-left px-4 py-3">Status</th>
                {isOwner && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map(u => {
                const userRoleName = roles.find(r => r.id === u.role_id)?.name || u.role || "—"
                return (
                  <tr key={u.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      {editingUser === u.id ? (
                        <div className="flex flex-col gap-1.5">
                          <input value={editForm.display_name}
                            onChange={e => setEditForm(f => ({ ...f, display_name: e.target.value }))}
                            placeholder="Display name"
                            className="text-sm px-2 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                          <input value={editForm.username}
                            onChange={e => setEditForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/\s/g, "") }))}
                            placeholder="Username"
                            className="text-sm px-2 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold flex items-center justify-center flex-shrink-0">
                            {u.display_name?.[0]?.toUpperCase() || "U"}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{u.display_name}</div>
                            <div className="text-xs text-gray-400">@{u.username}</div>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 hidden sm:table-cell">
                      {isOwner && u.id !== profile?.id ? (
                        <select
                          key={u.role_id}
                          value={u.role_id || ""}
                          onChange={e => handleRoleChange(u.id, e.target.value)}
                          className="text-xs font-medium px-2.5 py-1 rounded-lg border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500 bg-gray-100 text-gray-700">
                          {/* Without this placeholder, a null role_id falls through to
                              whichever role sorts first (Manager) LOOKING selected in the
                              dropdown, even though nothing is actually assigned. */}
                          {!u.role_id && <option value="">— No role —</option>}
                          {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                      ) : (
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${roleStyle[userRoleName] || "bg-gray-100 text-gray-600"}`}>
                          {userRoleName}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell text-xs text-gray-400">
                      {u.last_login
                        ? new Date(u.last_login).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })
                        : "Never"
                      }
                    </td>
                    <td className="px-4 py-4">
                      {isOwner && u.id !== profile?.id ? (
                        <button onClick={() => handleToggleActive(u.id, u.is_active)}
                          className={`text-xs font-medium px-2.5 py-1 rounded-lg cursor-pointer transition ${
                            u.is_active
                              ? "bg-green-50 text-green-700 hover:bg-red-50 hover:text-red-600"
                              : "bg-red-50 text-red-600 hover:bg-green-50 hover:text-green-700"
                          }`}>
                          {u.is_active ? "Active" : "Inactive"}
                        </button>
                      ) : (
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${
                          u.is_active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
                        }`}>
                          {u.is_active ? "Active" : "Inactive"}
                        </span>
                      )}
                    </td>
                    {isOwner && (
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {editingUser === u.id ? (
                            <>
                              <button onClick={() => handleSaveEdit(u.id)}
                                className="p-2 text-green-500 hover:bg-green-50 rounded-lg transition">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                              <button onClick={() => setEditingUser(null)}
                                className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg transition">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => handleEditUser(u)}
                                className="p-2 text-gray-400 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition"
                                title="Edit user">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button onClick={() => setShowResetModal(u.id)}
                                className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition"
                                title="Reset password">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                </svg>
                              </button>
                              {u.id !== profile?.id && (
                                <button onClick={() => handleDeleteUser(u.id, u.username)}
                                  className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                  title="Delete user">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add user modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-base font-semibold text-gray-900">Add new user</h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Display name</label>
                <input type="text" value={form.display_name}
                  onChange={e => set("display_name", e.target.value)}
                  placeholder="e.g. Ahmed Khan"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Username</label>
                <input type="text" value={form.username}
                  onChange={e => set("username", e.target.value.toLowerCase().replace(/\s/g, ""))}
                  placeholder="e.g. ahmed123"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                <p className="text-xs text-gray-400 mt-1">Lowercase, no spaces</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Password</label>
                <input type="password" value={form.password}
                  onChange={e => set("password", e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Role</label>
                <select value={form.role_id} onChange={e => set("role_id", e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                  <option value="">Select role</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 text-sm rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 text-sm rounded-xl bg-coral-500 hover:bg-coral-700 text-white font-medium transition disabled:opacity-60">
                  {saving ? "Creating..." : "Create user"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change password modal */}
      {showPwModal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-base font-semibold text-gray-900">Change password</h3>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">New password</label>
                <input type="password" value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Confirm new password</label>
                <input type="password" value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowPwModal(false)}
                  className="flex-1 py-2.5 text-sm rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 text-sm rounded-xl bg-coral-500 hover:bg-coral-700 text-white font-medium transition disabled:opacity-60">
                  {saving ? "Saving..." : "Change password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin reset user password modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-base font-semibold text-gray-900">Reset user password</h3>
            <p className="text-xs text-gray-400">
              Set a new password for this user. They will need to use this new password to log in.
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">New password</label>
              <input type="text" value={resetPassword}
                onChange={e => setResetPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setShowResetModal(null); setResetPassword("") }}
                className="flex-1 py-2.5 text-sm rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={handleAdminReset} disabled={saving}
                className="flex-1 py-2.5 text-sm rounded-xl bg-coral-500 hover:bg-coral-700 text-white font-medium transition disabled:opacity-60">
                {saving ? "Resetting..." : "Reset password"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}