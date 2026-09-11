import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import { getPermissionsForUser } from "../services/permissionService"

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
  const [user, setUser]               = useState(null)
  const [profile, setProfile]         = useState(null)
  const [roleData, setRoleData]       = useState(null)
  const [permissions, setPermissions] = useState({})
  const [loading, setLoading]         = useState(true)

  const fetchProfile = async (userId, requestId, isStillCurrent) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single()

      if (profileError) throw profileError
      if (!isStillCurrent()) return

      let roleRow = null
      let perms = {}

      if (profileData.role_id) {
        const { data: rData, error: roleError } = await supabase
          .from("roles")
          .select("id, name, is_system")
          .eq("id", profileData.role_id)
          .single()

        if (!roleError && rData) roleRow = rData

        perms = await getPermissionsForUser(profileData.role_id)
      }

      if (!isStillCurrent()) return

      // Set everything together so there's no render with partial state
      setProfile(profileData)
      setRoleData(roleRow)
      setPermissions(perms)
    } catch (err) {
      console.error("fetchProfile error:", err)
      if (isStillCurrent()) {
        setProfile({ id: userId, role: "manager", username: null, display_name: "User", is_active: true })
      }
    } finally {
      if (isStillCurrent()) setLoading(false)
    }
  }

  useEffect(() => {
  let activeRequestId = 0

  const loadSession = async (session) => {
    const requestId = ++activeRequestId
    if (session?.user) {
      setUser(session.user)
      await fetchProfile(session.user.id, requestId, () => requestId === activeRequestId)
    } else {
      setUser(null); setProfile(null); setRoleData(null); setPermissions({}); setLoading(false)
    }
  }

  supabase.auth.getSession().then(({ data: { session } }) => loadSession(session))

  const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
    loadSession(session)
  })

  return () => listener.subscription.unsubscribe()
}, [])

const signIn = async (username, password) => {
  // Single SECURITY DEFINER RPC resolves username -> login email without
  // exposing the whole profiles table to anon (see migrations/security_hardening.sql).
  const { data: rows, error: rpcError } = await supabase
    .rpc("get_staff_email_by_username", { p_username: username.toLowerCase().trim() })

  const match = rows?.[0]
  if (rpcError || !match) throw new Error("Invalid username or password")
  if (!match.is_active) throw new Error("Your account has been deactivated. Contact the administrator.")

  const { data, error } = await supabase.auth.signInWithPassword({
    email: match.email.trim(),
    password,
  })

  if (error) throw new Error("Invalid username or password")

  await supabase
    .from("profiles")
    .update({ last_login: new Date().toISOString() })
    .eq("id", match.user_id)

  return data
}

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null); setProfile(null); setRoleData(null); setPermissions({})
  }

  // Helper — check if current user can perform an action on a module
  const can = (module, action = "view") => {
    if (roleData?.name === "Owner") return true // Owner always has full access
    return permissions?.[module]?.[action] ?? false
  }

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      roleData,
      role: roleData?.name ?? null,
      isOwner: roleData?.name === "Owner",
      username: profile?.username ?? null,
      displayName: profile?.display_name ?? null,
      permissions,
      can,
      loading,
      signIn,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)