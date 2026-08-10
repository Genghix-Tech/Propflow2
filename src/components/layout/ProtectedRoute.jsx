import { Navigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"

export default function ProtectedRoute({ children, module, action = "view" }) {
  const { user, profile, roleData, permissions, loading, can } = useAuth()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    </div>
  )

  if (!user) return <Navigate to="/login" replace />

  if (!profile || (profile.role_id && !roleData) || (profile.role_id && Object.keys(permissions).length === 0 && roleData?.name !== "Owner")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (module && !can(module, action)) {
    return <Navigate to="/unauthorized" replace />
  }

  return children
}