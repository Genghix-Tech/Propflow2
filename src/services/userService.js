import { supabaseAdmin } from "../lib/supabaseAdmin"
import { supabase } from "../lib/supabase"

export const createUser = async ({ username, password, display_name, role_id }) => {
  const email = `${username.toLowerCase().trim()}@propflow.internal`

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name },
  })

  if (authError) throw authError

  const userId = authData.user.id

  await new Promise(resolve => setTimeout(resolve, 800))

  const { data: profileData, error: profileError } = await supabaseAdmin
    .from("profiles")
    .upsert({
      id: userId,
      username: username.toLowerCase().trim(),
      display_name,
      role_id,
      is_active: true,
    }, { onConflict: "id" })
    .select()
    .single()

  if (profileError) {
    console.error("Profile upsert error:", profileError)
    throw new Error("User created but profile setup failed: " + profileError.message)
  }

  return { authData, profileData }
}

export const signInWithUsername = async (username, password) => {
  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, role, is_active, display_name")
    .eq("username", username.toLowerCase().trim())
    .maybeSingle()

  if (profileError || !profileData) throw new Error("Invalid username or password")
  if (!profileData.is_active) throw new Error("Account deactivated. Contact administrator.")

  const { data: email, error: rpcError } = await supabase
    .rpc("get_user_email_by_id", { user_id: profileData.id })

  if (rpcError || !email) throw new Error("Login failed — contact administrator")

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  })

  if (error) throw new Error("Invalid username or password")

  await supabase
    .from("profiles")
    .update({ last_login: new Date().toISOString() })
    .eq("id", profileData.id)

  return data
}

export const getUsers = async () => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, role_id, is_active, last_login, created_at")
    .order("created_at", { ascending: false })
  if (error) throw error
  return data
}

export const updateUserRole = async (userId, role) => {
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ role })
    .eq("id", userId)
  if (error) throw error
}

export const toggleUserActive = async (userId, isActive) => {
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", userId)
  if (error) throw error
}

export const changePassword = async (newPassword) => {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}

export const adminResetPassword = async (userId, newPassword) => {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password: newPassword,
  })
  if (error) throw error
}

export const updateUserInfo = async (userId, { display_name, username }) => {
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      display_name,
      username: username.toLowerCase().trim(),
    })
    .eq("id", userId)
  if (error) throw error
}

export const deleteUser = async (userId) => {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (error) throw error
}