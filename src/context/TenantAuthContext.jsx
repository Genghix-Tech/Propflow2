import { createContext, useContext, useEffect, useState } from "react"
import { supabaseTenant } from "../lib/supabaseTenant"
import { getMyTenantProfile } from "../services/tenantPortalService"

const TenantAuthContext = createContext({})

// Supabase's getSession() can occasionally hang indefinitely while silently
// trying to refresh an expired token on page reload — a known SDK issue that
// gets worse with two Supabase clients on the same page (this app also has
// the staff `supabase` client). Racing it against a timeout guarantees the
// loading spinner can never hang forever; on timeout we just treat it as
// "no session", which safely drops back to the login screen.
const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("timed out")), ms)),
  ])

export const TenantAuthProvider = ({ children }) => {
  const [tenantUser, setTenantUser]   = useState(null)
  const [tenant, setTenant]           = useState(null)
  const [tenantError, setTenantError] = useState(null)
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    let cancelled = false

    // A valid auth session doesn't guarantee the tenant profile fetch will
    // succeed (e.g. a misconfigured RLS policy). If it fails, tenantError is
    // set so the UI can show a real error screen instead of silently
    // rendering the whole portal with every query disabled and looking blank.
    const loadTenantProfile = async (session) => {
      if (!session?.user) {
        setTenantUser(null)
        setTenant(null)
        setTenantError(null)
        return
      }
      setTenantUser(session.user)
      try {
        const profile = await getMyTenantProfile()
        if (!cancelled) { setTenant(profile); setTenantError(null) }
      } catch (err) {
        console.error("Tenant profile error:", err)
        if (!cancelled) { setTenant(null); setTenantError(err) }
      }
    }

    // onAuthStateChange fires once immediately on subscribe with whatever
    // session currently exists (restored from storage on page load/refresh,
    // or null) — a separate getSession() call here was redundant and was
    // making every reload fetch the tenant's profile TWICE over the network,
    // which is most of what made reloads feel slow.
    const { data: listener } = supabaseTenant.auth.onAuthStateChange(
      async (_event, session) => {
        if (cancelled) return
        try {
          await withTimeout(loadTenantProfile(session), 8000)
        } catch (err) {
          console.error("Tenant profile load timed out:", err)
          if (!cancelled) { setTenantUser(null); setTenant(null); setTenantError(null) }
        } finally {
          if (!cancelled) setLoading(false)
        }
      }
    )

    return () => {
      cancelled = true
      listener.subscription.unsubscribe()
    }
  }, [])

  const signIn = async (username, password) => {
    // Single SECURITY DEFINER RPC resolves username -> login email without
    // exposing the tenant_portal_lookup view to anon (see migrations/security_hardening.sql).
    const { data: rows, error: lookupError } = await supabaseTenant
      .rpc("get_tenant_email_by_username", { p_username: username.toLowerCase().trim() })

    if (lookupError) throw new Error(`Login lookup failed: ${lookupError.message}`)
    const match = rows?.[0]
    // get_tenant_email_by_username() already filters to portal_active = true,
    // so a missing row covers both "no such username" and "portal disabled".
    if (!match) throw new Error("Invalid username or password")

    const { error: authError } = await supabaseTenant.auth.signInWithPassword({
      email: match.email,
      password,
    })

    if (authError) throw new Error(authError.message)
  }

  const signOut = async () => {
    await supabaseTenant.auth.signOut()
    setTenantUser(null)
    setTenant(null)
    setTenantError(null)
  }

  return (
    <TenantAuthContext.Provider value={{ tenantUser, tenant, tenantError, loading, signIn, signOut }}>
      {children}
    </TenantAuthContext.Provider>
  )
}

export const useTenantAuth = () => useContext(TenantAuthContext)