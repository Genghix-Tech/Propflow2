import { supabase } from "../lib/supabase"

const MODULES = [
  { key: "dashboard",   label: "Dashboard" },
  { key: "tenants",     label: "Tenants" },
  { key: "invoices",    label: "Invoices" },
  { key: "employees",   label: "Employees" },
  { key: "maintenance", label: "Maintenance" },
  { key: "buildings",   label: "Buildings" },
  { key: "messages",    label: "Messages" },
  { key: "reports",     label: "Reports" },
  { key: "settings",    label: "Settings" },
]

export { MODULES }

export const getRoles = async () => {
  const { data, error } = await supabase
    .from("roles")
    .select("*")
    .order("is_system", { ascending: false })
    .order("name")
  if (error) throw error
  return data
}

export const getRolePermissions = async (roleId) => {
  const { data, error } = await supabase
    .from("role_permissions")
    .select("*")
    .eq("role_id", roleId)
  if (error) throw error
  return data
}

export const getPermissionsForUser = async (roleId) => {
  if (!roleId) return {}
  const { data, error } = await supabase
    .from("role_permissions")
    .select("*")
    .eq("role_id", roleId)
  if (error) throw error

  // Convert array to a lookup object: { tenants: { view: true, add: true, ... } }
  const map = {}
  data.forEach(p => {
    map[p.module] = {
      view: p.can_view,
      add: p.can_add,
      edit: p.can_edit,
      delete: p.can_delete,
    }
  })
  return map
}

export const createRole = async (name, description) => {
  const { data, error } = await supabase
    .from("roles")
    .insert([{ name, description, is_system: false }])
    .select()
    .single()
  if (error) throw error

  // Initialize with no permissions — owner will configure
  const defaultPerms = MODULES.map(m => ({
    role_id: data.id,
    module: m.key,
    can_view: false, can_add: false, can_edit: false, can_delete: false,
  }))
  await supabase.from("role_permissions").insert(defaultPerms)

  return data
}

export const updateRole = async (roleId, { name, description }) => {
  const { error } = await supabase
    .from("roles")
    .update({ name, description })
    .eq("id", roleId)
  if (error) throw error
}

export const deleteRole = async (roleId) => {
  const { error } = await supabase
    .from("roles")
    .delete()
    .eq("id", roleId)
  if (error) throw error
}

export const updateModulePermission = async (roleId, module, permissions) => {
  const { error } = await supabase
    .from("role_permissions")
    .upsert({
      role_id: roleId,
      module,
      can_view: permissions.view,
      can_add: permissions.add,
      can_edit: permissions.edit,
      can_delete: permissions.delete,
    }, { onConflict: "role_id,module" })
  if (error) throw error
}

export const assignRoleToUser = async (userId, roleId) => {
  const { error } = await supabase
    .from("profiles")
    .update({ role_id: roleId })
    .eq("id", userId)
  if (error) throw error
}