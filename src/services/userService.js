import { supabase } from "../lib/supabase"

// Anything requiring the Supabase Auth Admin API (create/delete a user, reset
// someone else's password) can't be done with the anon key + RLS — it goes
// through the admin-ops Edge Function, the only place in this project that
// holds the service-role key. See supabase/functions/admin-ops/index.ts.
const callAdminOps = async (action, payload) => {
  const { data, error } = await supabase.functions.invoke("admin-ops", { body: { action, payload } })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
}

export const createUser = ({ username, password, display_name, role_id }) =>
  callAdminOps("createStaffUser", { username, password, display_name, role_id })

export const adminResetPassword = (userId, newPassword) =>
  callAdminOps("resetStaffPassword", { userId, newPassword })

export const deleteUser = (userId) =>
  callAdminOps("deleteStaffUser", { userId })

export const getUsers = async () => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, role_id, is_active, last_login, created_at")
    .order("created_at", { ascending: false })
  if (error) throw error
  return data
}

// is_active updates on ANOTHER user's profile need the "Owner can update any
// profile" RLS policy — only an Owner's session can satisfy it.
export const toggleUserActive = async (userId, isActive) => {
  const { error } = await supabase
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", userId)
  if (error) throw error
}

export const changePassword = async (newPassword) => {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}

export const updateUserInfo = async (userId, { display_name, username }) => {
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name,
      username: username.toLowerCase().trim(),
    })
    .eq("id", userId)
  if (error) throw error
}
