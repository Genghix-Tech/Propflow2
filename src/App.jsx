import { Suspense, lazy, useEffect } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider } from "./context/AuthContext"
import ProtectedRoute from "./components/layout/ProtectedRoute"
import AppLayout from "./components/layout/AppLayout"
import { TenantAuthProvider, useTenantAuth } from "./context/TenantAuthContext"

// Every page is lazy-loaded: each module's code only downloads when a user
// actually visits it, instead of one giant bundle loading everything upfront.
// This keeps the app fast as more modules get added later.
const Login             = lazy(() => import("./pages/auth/Login"))
const Dashboard         = lazy(() => import("./pages/dashboard/Dashboard"))
const TenantList        = lazy(() => import("./pages/tenants/TenantList"))
const AddTenant         = lazy(() => import("./pages/tenants/AddTenant"))
const TenantProfile     = lazy(() => import("./pages/tenants/TenantProfile"))
const EditTenant        = lazy(() => import("./pages/tenants/EditTenant"))
const InvoiceList       = lazy(() => import("./pages/invoices/InvoiceList"))
const InvoiceDetail     = lazy(() => import("./pages/invoices/InvoiceDetail"))
const EmployeeList      = lazy(() => import("./pages/employees/EmployeeList"))
const AddEmployee       = lazy(() => import("./pages/employees/AddEmployee"))
const EmployeeProfile   = lazy(() => import("./pages/employees/EmployeeProfile"))
const EditEmployee      = lazy(() => import("./pages/employees/EditEmployee"))
const MaintenanceList   = lazy(() => import("./pages/maintenance/MaintenanceList"))
const AddTicket         = lazy(() => import("./pages/maintenance/AddTicket"))
const TicketDetail      = lazy(() => import("./pages/maintenance/TicketDetail"))
const BuildingList      = lazy(() => import("./pages/buildings/BuildingList"))
const AddBuilding       = lazy(() => import("./pages/buildings/AddBuilding"))
const BuildingDetail    = lazy(() => import("./pages/buildings/BuildingDetail"))
const Reports           = lazy(() => import("./pages/reports/Reports"))
const UserManagement    = lazy(() => import("./pages/settings/UserManagement"))
const RoleManagement    = lazy(() => import("./pages/settings/RoleManagement"))
const MessagesList      = lazy(() => import("./pages/messages/MessagesList"))

const TenantLogin        = lazy(() => import("./pages/tenant-portal/TenantLogin"))
const TenantPortalLayout = lazy(() => import("./pages/tenant-portal/TenantPortalLayout"))
const PortalOverview     = lazy(() => import("./pages/tenant-portal/PortalOverview"))
const PortalInvoices     = lazy(() => import("./pages/tenant-portal/PortalInvoices"))
const PortalMaintenance  = lazy(() => import("./pages/tenant-portal/PortalMaintenance"))
const PortalMessages     = lazy(() => import("./pages/tenant-portal/PortalMessages"))

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* AuthProvider (staff auth, `supabase` client) is scoped to ONLY the
              staff routes below — it used to wrap the whole app, which meant it
              mounted and ran its own session-restore/getSession() on every
              /portal/* page load too, racing the tenant client's own session
              restore on the same page. That contention is what was causing the
              tenant portal to hang on refresh and fall back to the login screen. */}
          <Route path="/login" element={
            <AuthProvider><Login /></AuthProvider>
          } />

          {/* Tenant Portal — completely separate auth context */}
          <Route path="/portal/login" element={
            <TenantAuthProvider>
              <TenantLogin />
            </TenantAuthProvider>
          } />
          <Route path="/portal/*" element={
            <TenantAuthProvider>
              <TenantPortalGuard />
            </TenantAuthProvider>
          } />
          <Route path="/" element={
            <AuthProvider>
              <ProtectedRoute module={null}>
                <AppLayout />
              </ProtectedRoute>
            </AuthProvider>
          }>

            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={
              <ProtectedRoute module="dashboard"><Dashboard /></ProtectedRoute>
            } />

            <Route path="tenants">
              <Route index element={<ProtectedRoute module="tenants"><TenantList /></ProtectedRoute>} />
              <Route path="new" element={<ProtectedRoute module="tenants" action="add"><AddTenant /></ProtectedRoute>} />
              <Route path=":id" element={<ProtectedRoute module="tenants"><TenantProfile /></ProtectedRoute>} />
              <Route path=":id/edit" element={<ProtectedRoute module="tenants" action="edit"><EditTenant /></ProtectedRoute>} />
            </Route>

            <Route path="invoices">
              <Route index element={<ProtectedRoute module="invoices"><InvoiceList /></ProtectedRoute>} />
              <Route path=":id" element={<ProtectedRoute module="invoices"><InvoiceDetail /></ProtectedRoute>} />
            </Route>

            <Route path="employees">
              <Route index element={<ProtectedRoute module="employees"><EmployeeList /></ProtectedRoute>} />
              <Route path="new" element={<ProtectedRoute module="employees" action="add"><AddEmployee /></ProtectedRoute>} />
              <Route path=":id" element={<ProtectedRoute module="employees"><EmployeeProfile /></ProtectedRoute>} />
              <Route path=":id/edit" element={<ProtectedRoute module="employees" action="edit"><EditEmployee /></ProtectedRoute>} />
            </Route>

            <Route path="maintenance">
              <Route index element={<ProtectedRoute module="maintenance"><MaintenanceList /></ProtectedRoute>} />
              <Route path="new" element={<ProtectedRoute module="maintenance" action="add"><AddTicket /></ProtectedRoute>} />
              <Route path=":id" element={<ProtectedRoute module="maintenance"><TicketDetail /></ProtectedRoute>} />
            </Route>

            <Route path="buildings">
              <Route index element={<ProtectedRoute module="buildings"><BuildingList /></ProtectedRoute>} />
              <Route path="new" element={<ProtectedRoute module="buildings" action="add"><AddBuilding /></ProtectedRoute>} />
              <Route path=":id" element={<ProtectedRoute module="buildings"><BuildingDetail /></ProtectedRoute>} />
            </Route>

            <Route path="messages" element={
              <ProtectedRoute module="messages"><MessagesList /></ProtectedRoute>
            } />

            <Route path="reports" element={
              <ProtectedRoute module="reports"><Reports /></ProtectedRoute>
            } />

            <Route path="settings" element={
              <ProtectedRoute module="settings"><UserManagement /></ProtectedRoute>
            } />
            <Route path="settings/roles" element={
              <ProtectedRoute module="settings"><RoleManagement /></ProtectedRoute>
            } />
          </Route>
          <Route path="/unauthorized" element={
            <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">
              You don't have permission to access this page.
            </div>
          } />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

function TenantPortalGuard() {
  const { tenantUser, tenant, tenantError, loading } = useTenantAuth()

  // Start downloading the portal page chunks the moment this guard mounts,
  // in parallel with the auth check above — not after it finishes. Without
  // this, a reload was two sequential waits back to back (auth check, THEN
  // the lazy chunk fetch once authenticated), which is most of what made it
  // feel slow. By the time `loading` flips false, these are usually already
  // cached, so the second spinner stage collapses to nothing.
  useEffect(() => {
    import("./pages/tenant-portal/TenantPortalLayout")
    import("./pages/tenant-portal/PortalOverview")
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!tenantUser) {
    return <Navigate to="/portal/login" replace />
  }

  // The auth session succeeded, but loading the tenant's own record failed
  // (e.g. a database/RLS misconfiguration) — show this clearly instead of
  // silently rendering the whole portal with every query disabled and blank.
  if (!tenant || tenantError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-sm text-center bg-white rounded-2xl border border-gray-100 p-8">
          <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-gray-900">Couldn't load your account</h2>
          <p className="text-sm text-gray-500 mt-2">
            You're signed in, but something went wrong loading your tenant details. Please contact your property manager.
          </p>
        </div>
      </div>
    )
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<TenantPortalLayout />}>
          <Route index element={<PortalOverview />} />
          <Route path="invoices" element={<PortalInvoices />} />
          <Route path="maintenance" element={<PortalMaintenance />} />
          <Route path="messages" element={<PortalMessages />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
