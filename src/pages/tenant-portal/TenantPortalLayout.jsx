import { Outlet, NavLink, useNavigate } from "react-router-dom"
import { useTenantAuth } from "../../context/TenantAuthContext"

const navItems = [
  {
    label: "Overview",
    to: "/portal",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    label: "My invoices",
    to: "/portal/invoices",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21l-7-4-7 4V5a2 2 0 012-2h10a2 2 0 012 2v16z" />
      </svg>
    ),
  },
  {
    label: "Maintenance",
    to: "/portal/maintenance",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    label: "Messages",
    to: "/portal/messages",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
]

export default function TenantPortalLayout() {
  const { tenant, signOut } = useTenantAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate("/portal/login")
  }

  const initials = tenant?.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2) || "T"

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Top nav */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="h-8 w-auto object-contain"
              onError={e => { e.target.style.display = "none" }} />
            <div>
              <div className="text-sm font-semibold text-gray-900">Tenant Portal</div>
              <div className="text-xs text-gray-400">{tenant?.buildings?.name || ""}</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold flex items-center justify-center">
                {initials}
              </div>
              <div>
                <div className="text-xs font-medium text-gray-900">{tenant?.full_name}</div>
                <div className="text-xs text-gray-400">{tenant?.units?.unit_number}</div>
              </div>
            </div>
            <button onClick={handleSignOut}
              className="text-sm text-gray-400 hover:text-red-500 transition flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex gap-6">

          {/* Sidebar nav */}
          <aside className="w-52 flex-shrink-0 hidden md:block">
            <nav className="bg-white rounded-2xl border border-gray-100 p-3 space-y-0.5 sticky top-24">
              {navItems.map(item => (
                <NavLink key={item.to} to={item.to} end={item.to === "/portal"}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-brand-50 text-brand-700"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                    }`
                  }>
                  {item.icon}
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </aside>

          {/* Mobile bottom nav */}
          <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex z-20">
            {navItems.map(item => (
              <NavLink key={item.to} to={item.to} end={item.to === "/portal"}
                className={({ isActive }) =>
                  `flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                    isActive ? "text-brand-600" : "text-gray-400"
                  }`
                }>
                {item.icon}
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Main content */}
          <main className="flex-1 min-w-0 pb-20 md:pb-0">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}