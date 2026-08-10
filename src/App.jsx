import { Suspense, lazy } from "react"
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
const EnquiryList       = lazy(() => import("./pages/enquiries/EnquiryList"))

const TenantLogin        = lazy(() => import("./pages/tenant-portal/TenantLogin"))
const TenantPortalLayout = lazy(() => import("./pages/tenant-portal/TenantPortalLayout"))
const PortalOverview     = lazy(() => import("./pages/tenant-portal/PortalOverview"))
const PortalInvoices     = lazy(() => import("./pages/tenant-portal/PortalInvoices"))
const PortalMaintenance  = lazy(() => import("./pages/tenant-portal/PortalMaintenance"))
const PortalMessages     = lazy(() => import("./pages/tenant-portal/PortalMessages"))

// Public, unauthenticated page — no login required
const EnquiryForm = lazy(() => import("./pages/public/EnquiryForm"))

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<Login />} />

            {/* Public rental enquiry form — no auth needed */}
            <Route path="/enquire" element={<EnquiryForm />} />

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
              <ProtectedRoute module={null}>
                <AppLayout />
              </ProtectedRoute>

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

              <Route path="enquiries">
                <Route index element={<ProtectedRoute module="enquiries"><EnquiryList /></ProtectedRoute>} />
              </Route>

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
    </AuthProvider>
  )
}

function TenantPortalGuard() {
  const { tenantUser, loading } = useTenantAuth()


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
