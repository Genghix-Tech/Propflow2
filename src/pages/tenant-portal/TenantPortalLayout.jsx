import { useEffect } from "react"
import { Outlet, NavLink, useNavigate } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import toast from "react-hot-toast"
import { useTenantAuth } from "../../context/TenantAuthContext"
import { getUnreadMessageCountForTenant, supabaseTenant } from "../../services/tenantPortalService"
import { playNotificationSound } from "../../lib/notificationSound"
import { COMPANY_NAME } from "../../config/branding"

const navItems = [
  {
    label: "Overview",
    to: "/portal",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    ),
  },
  {
    label: "My invoices",
    to: "/portal/invoices",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21l-7-4-7 4V5a2 2 0 012-2h10a2 2 0 012 2v16z" />
    ),
  },
  {
    label: "Maintenance",
    to: "/portal/maintenance",
    icon: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </>
    ),
  },
  {
    label: "Messages",
    to: "/portal/messages",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    ),
  },
]

export default function TenantPortalLayout() {
  const { tenant, signOut } = useTenantAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread-message-count-tenant", tenant?.id],
    queryFn: () => getUnreadMessageCountForTenant(tenant.id),
    enabled: !!tenant,
  })

  // Global "new staff message" alert — mounted here (not inside
  // PortalMessages) so it fires and shows a toast + sound + badge no matter
  // which portal page the tenant is currently on.
  useEffect(() => {
    if (!tenant?.id) return
    const channel = supabaseTenant
      .channel(`portal-message-alerts-${tenant.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages",
        filter: `tenant_id=eq.${tenant.id}`,
      }, ({ new: msg }) => {
        queryClient.invalidateQueries(["my-messages", tenant.id])
        queryClient.invalidateQueries(["unread-message-count-tenant", tenant.id])
        if (msg.sender_type !== "staff") return
        playNotificationSound()
        toast((t) => (
          <div onClick={() => { navigate("/portal/messages"); toast.dismiss(t.id) }} className="cursor-pointer">
            <div className="text-sm font-semibold text-gray-900">{msg.sender_name || "Property manager"}</div>
            <div className="text-xs text-gray-500 truncate max-w-[220px]">{msg.body}</div>
          </div>
        ), { icon: "💬", duration: 6000 })
      })
      .subscribe()
    return () => supabaseTenant.removeChannel(channel)
  }, [tenant?.id, queryClient, navigate])

  const handleSignOut = async () => {
    await signOut()
    navigate("/portal/login")
  }

  const initials = tenant?.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2) || "T"

  return (
    <div className="min-h-screen bg-gray-50 md:flex">

      {/* Desktop sidebar — fixed full height, dark */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-gradient-to-b from-[#0B1B33] to-[#050C18] text-white z-30">
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-brand-500/10 blur-3xl pointer-events-none" />

        {/* Brand */}
        <div className="flex items-center gap-3 px-6 h-20 flex-shrink-0 relative">
          <div className="h-10 px-2 rounded-xl bg-white flex items-center justify-center flex-shrink-0 overflow-hidden">
            <img src="/logo.png" alt={COMPANY_NAME} className="h-full w-auto max-w-[120px] object-contain"
              onError={e => { e.target.style.display = "none" }} />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-brand-200 leading-tight">Tenant Portal</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 relative overflow-y-auto">
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === "/portal"}
              className={({ isActive }) =>
                `relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-brand-100/70 hover:bg-white/5 hover:text-white"
                }`
              }>
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-coral-500" />}
                  <svg className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-coral-400" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {item.icon}
                  </svg>
                  <span className="flex-1">{item.label}</span>
                  {item.to === "/portal/messages" && unreadCount > 0 && (
                    <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-coral-500 text-white text-[10px] font-semibold rounded-full flex-shrink-0">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User card */}
        <div className="p-3 flex-shrink-0 relative">
          <div className="bg-white/5 rounded-2xl p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white text-xs font-semibold flex items-center justify-center flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-white truncate">{tenant?.full_name}</div>
              <div className="text-[11px] text-brand-200 truncate">Unit {tenant?.units?.unit_number}</div>
            </div>
            <button onClick={handleSignOut} title="Sign out"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-brand-200 hover:text-white hover:bg-white/10 transition flex-shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="px-4 flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt={COMPANY_NAME} className="h-8 w-auto max-w-[110px] object-contain"
              onError={e => { e.target.style.display = "none" }} />
            <div className="text-sm font-semibold text-gray-900">Tenant Portal</div>
          </div>
          <button onClick={handleSignOut}
            className="text-sm text-gray-400 hover:text-red-500 transition flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main content — full width alongside the fixed sidebar */}
      <div className="flex-1 md:ml-64 min-w-0">
        <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-8 pb-24 md:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex z-20 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
        {navItems.map(item => (
          <NavLink key={item.to} to={item.to} end={item.to === "/portal"}
            className={({ isActive }) =>
              `relative flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                isActive ? "text-brand-600" : "text-gray-400"
              }`
            }>
            <span className="relative">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {item.icon}
              </svg>
              {item.to === "/portal/messages" && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1.5 min-w-[15px] h-[15px] px-[3px] flex items-center justify-center bg-coral-500 text-white text-[9px] font-semibold rounded-full">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
