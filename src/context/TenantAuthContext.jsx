import { createContext, useContext, useEffect, useState } from "react"
import { supabaseTenant } from "../lib/supabaseTenant"
import { getMyTenantProfile } from "../services/tenantPortalService"

const TenantAuthContext = createContext({})

export const TenantAuthProvider = ({ children }) => {
  const [tenantUser, setTenantUser]   = useState(null)
  const [tenant, setTenant]           = useState(null)
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      try {
        // Restore existing session from storage on page load/refresh
        const { data: { session } } = await supabaseTenant.auth.getSession()

        if (session?.user && !cancelled) {
          setTenantUser(session.user)
          try {
            const profile = await getMyTenantProfile()
            if (!cancelled) setTenant(profile)
          } catch (err) {
            console.error("Tenant profile error:", err)
          }
        }
      } catch (err) {
        console.error("Session restore error:", err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    init()

    // Listen for auth changes (login/logout)
    const { data: listener } = supabaseTenant.auth.onAuthStateChange(
      async (_event, session) => {
        if (cancelled) return
        if (session?.user) {
          setTenantUser(session.user)
          try {
            const profile = await getMyTenantProfile()
            if (!cancelled) setTenant(profile)
          } catch (err) {
            console.error("Tenant profile error:", err)
          }
        } else {
          setTenantUser(null)
          setTenant(null)
        }
        if (!cancelled) setLoading(false)
      }
    )

    return () => {
      cancelled = true
      listener.subscription.unsubscribe()
    }
  }, [])

  const signIn = async (username, password) => {
    // Look up email from the view
    const { data: tenantData, error: lookupError } = await supabaseTenant
      .from("tenant_portal_lookup")
      .select("portal_email, portal_active")
      .eq("portal_username", username.toLowerCase().trim())
      .single()

    if (lookupError || !tenantData) throw new Error("Invalid username or password")
    if (!tenantData.portal_active) throw new Error("Portal access disabled")

    const { error: authError } = await supabaseTenant.auth.signInWithPassword({
      email: tenantData.portal_email,
      password,
    })

    if (authError) throw new Error("Invalid username or password")
  }

  const signOut = async () => {
    await supabaseTenant.auth.signOut()
    setTenantUser(null)
    setTenant(null)
  }

  return (
    <TenantAuthContext.Provider value={{ tenantUser, tenant, loading, signIn, signOut }}>
      {children}
    </TenantAuthContext.Provider>
  )
}

export const useTenantAuth = () => useContext(TenantAuthContext)