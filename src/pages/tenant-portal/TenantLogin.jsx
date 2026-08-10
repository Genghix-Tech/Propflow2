import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTenantAuth } from "../../context/TenantAuthContext"

export default function TenantLogin() {
  const { signIn } = useTenantAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError]       = useState("")
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await signIn(username, password)
      navigate("/portal")
    } catch (err) {
      setError(err.message || "Invalid username or password")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Logo" className="h-14 w-auto object-contain mx-auto mb-3"
            onError={e => { e.target.style.display = "none" }} />
          <h1 className="text-2xl font-semibold text-gray-900">Tenant Portal</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to view your invoices and details</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
              <input type="text" required value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input type="password" required value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}
            <button type="submit" disabled={loading}
              className="w-full bg-coral-500 hover:bg-coral-700 text-white font-medium py-2.5 rounded-xl text-sm transition disabled:opacity-60">
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">
          Property staff?{" "}
          <a href="/login" className="text-brand-500 hover:underline">Staff login →</a>
        </p>
      </div>
    </div>
  )
}