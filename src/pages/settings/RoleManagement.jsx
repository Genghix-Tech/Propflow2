import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import {
  getRoles, getRolePermissions, createRole,
  updateRole, deleteRole, updateModulePermission, MODULES
} from "../../services/permissionService"
import { useAuth } from "../../context/AuthContext"
import toast from "react-hot-toast"

export default function RoleManagement() {
  const { isOwner } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedRole, setSelectedRole] = useState(null)
  const [showNewRoleModal, setShowNewRoleModal] = useState(false)
  const [newRole, setNewRole] = useState({ name: "", description: "" })
  const [saving, setSaving] = useState(false)

  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: getRoles,
  })

  const { data: rolePerms = [] } = useQuery({
    queryKey: ["role-permissions", selectedRole?.id],
    queryFn: () => getRolePermissions(selectedRole.id),
    enabled: !!selectedRole,
  })

  if (!isOwner) {
    return (
      <div className="text-center py-32 text-gray-400 text-sm">
        Only the Owner can manage roles and permissions.
      </div>
    )
  }

  const getPerm = (module) => {
    const p = rolePerms.find(rp => rp.module === module)
    return p
      ? { view: p.can_view, add: p.can_add, edit: p.can_edit, delete: p.can_delete }
      : { view: false, add: false, edit: false, delete: false }
  }

  const handleToggle = async (module, action, currentValue) => {
    const current = getPerm(module)
    const updated = { ...current, [action]: !currentValue }
    try {
      await updateModulePermission(selectedRole.id, module, updated)
      queryClient.invalidateQueries(["role-permissions", selectedRole.id])
    } catch {
      toast.error("Failed to update permission")
    }
  }

  const handleCreateRole = async (e) => {
    e.preventDefault()
    if (!newRole.name.trim()) { toast.error("Role name is required"); return }
    setSaving(true)
    try {
      const role = await createRole(newRole.name, newRole.description)
      toast.success("Role created!")
      setShowNewRoleModal(false)
      setNewRole({ name: "", description: "" })
      queryClient.invalidateQueries(["roles"])
      setSelectedRole(role)
    } catch (err) {
      toast.error("Failed to create role: " + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteRole = async (role) => {
    if (role.is_system) { toast.error("System roles cannot be deleted"); return }
    if (!confirm(`Delete role "${role.name}"? Users with this role will need to be reassigned.`)) return
    try {
      await deleteRole(role.id)
      toast.success("Role deleted")
      if (selectedRole?.id === role.id) setSelectedRole(null)
      queryClient.invalidateQueries(["roles"])
    } catch {
      toast.error("Failed to delete — make sure no users are assigned to this role")
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Roles & permissions</h2>
          <p className="text-sm text-gray-400 mt-0.5">Configure what each role can see and do</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/settings")}
            className="text-sm px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition">
            ← Back to users
          </button>
          <button onClick={() => setShowNewRoleModal(true)}
            className="flex items-center gap-2 bg-coral-500 hover:bg-coral-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New role
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Roles list */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden h-fit">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Roles ({roles.length})</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {roles.map(role => (
              <div key={role.id}
                onClick={() => setSelectedRole(role)}
                className={`px-5 py-3 cursor-pointer transition flex items-center justify-between group ${
                  selectedRole?.id === role.id ? "bg-brand-50" : "hover:bg-gray-50"
                }`}>
                <div>
                  <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                    {role.name}
                    {role.is_system && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">System</span>
                    )}
                  </div>
                  {role.description && (
                    <div className="text-xs text-gray-400 mt-0.5">{role.description}</div>
                  )}
                </div>
                {!role.is_system && (
                  <button onClick={e => { e.stopPropagation(); handleDeleteRole(role) }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Permissions matrix */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {!selectedRole ? (
            <div className="text-center py-20 text-gray-400 text-sm">
              Select a role to configure its permissions
            </div>
          ) : (
            <>
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">
                  {selectedRole.name} permissions
                </h3>
                {selectedRole.is_system && selectedRole.name === "Owner" && (
                  <p className="text-xs text-gray-400 mt-1">
                    Owner always has full access — permissions cannot be restricted.
                  </p>
                )}
              </div>
              <table className="w-full">
                <thead>
                  <tr className="text-xs font-medium text-gray-400 uppercase tracking-wide bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-5 py-3">Module</th>
                    <th className="text-center px-3 py-3">View</th>
                    <th className="text-center px-3 py-3">Add</th>
                    <th className="text-center px-3 py-3">Edit</th>
                    <th className="text-center px-3 py-3">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {MODULES.map(mod => {
                    const perm = selectedRole.name === "Owner"
                      ? { view: true, add: true, edit: true, delete: true }
                      : getPerm(mod.key)
                    const isOwnerRole = selectedRole.name === "Owner"

                    return (
                      <tr key={mod.key} className="hover:bg-gray-50 transition">
                        <td className="px-5 py-3 text-sm font-medium text-gray-700">{mod.label}</td>
                        {["view", "add", "edit", "delete"].map(action => (
                          <td key={action} className="px-3 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={perm[action]}
                              disabled={isOwnerRole}
                              onChange={() => handleToggle(mod.key, action, perm[action])}
                              className="w-4 h-4 accent-brand-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                            />
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>

      {/* New role modal */}
      {showNewRoleModal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-base font-semibold text-gray-900">Create new role</h3>
            <form onSubmit={handleCreateRole} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Role name</label>
                <input type="text" value={newRole.name}
                  onChange={e => setNewRole(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Accountant"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Description</label>
                <input type="text" value={newRole.description}
                  onChange={e => setNewRole(f => ({ ...f, description: e.target.value }))}
                  placeholder="e.g. Manages invoices and reports only"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowNewRoleModal(false)}
                  className="flex-1 py-2.5 text-sm rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 text-sm rounded-xl bg-coral-500 hover:bg-coral-700 text-white font-medium transition disabled:opacity-60">
                  {saving ? "Creating..." : "Create role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}