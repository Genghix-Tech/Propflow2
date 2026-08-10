import { formatCurrency, formatDateShort } from "../../lib/utils"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link, useNavigate } from "react-router-dom"
import { getTenants, getBuildings, deleteTenant } from "../../services/tenantService"
import toast from "react-hot-toast"

const statusStyle = {
  active:   "bg-green-50 text-green-700",
  expiring: "bg-yellow-50 text-yellow-700",
  overdue:  "bg-red-50 text-red-700",
  inactive: "bg-gray-100 text-gray-500",
}

export default function TenantList() {
  const navigate = useNavigate()
  const [search, setSearch]     = useState("")
  const [status, setStatus]     = useState("")
  const [building, setBuilding] = useState("")

  const { data: tenants = [], isLoading, refetch } = useQuery({
    queryKey: ["tenants", search, status, building],
    queryFn: () => getTenants({ search, status, building }),
  })

  const { data: buildings = [] } = useQuery({
    queryKey: ["buildings"],
    queryFn: getBuildings,
  })

  const handleDelete = async (id, unitId, name) => {
    if (!confirm(`Remove ${name}? This cannot be undone.`)) return
    try {
      await deleteTenant(id, unitId)
      toast.success("Tenant removed")
      refetch()
    } catch {
      toast.error("Failed to remove tenant")
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Tenants</h2>
          <p className="text-sm text-gray-400 mt-0.5">{tenants.length} total tenants</p>
        </div>
        <Link to="/tenants/new"
          className="flex items-center gap-2 bg-coral-500 hover:bg-coral-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add tenant
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-48 px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="expiring">Expiring</option>
          <option value="overdue">Overdue</option>
          <option value="inactive">Inactive</option>
        </select>
        <select value={building} onChange={e => setBuilding(e.target.value)}
          className="px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
          <option value="">All buildings</option>
          {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tenants.length === 0 ? (
          <div className="text-center py-20 text-gray-400 text-sm">No tenants found.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs font-medium text-gray-400 uppercase tracking-wide">
                <th className="text-left px-6 py-3">Tenant</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Unit</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Rent / mo</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Lease end</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tenants.map(t => (
                <tr key={t.id}
                  onClick={() => navigate(`/tenants/${t.id}`)}
                  className="hover:bg-gray-50 cursor-pointer transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold flex items-center justify-center flex-shrink-0">
                        {t.full_name.split(" ").map(n => n[0]).join("").slice(0,2)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{t.full_name}</div>
                        <div className="text-xs text-gray-400">{t.phone}</div>
                      </div>
                    </div>
                  </td>
			<td className="px-4 py-4 hidden lg:table-cell text-sm text-gray-700">
 			 {formatCurrency(t.monthly_rent)}
				</td>
			<td className="px-4 py-4 hidden lg:table-cell text-sm text-gray-500">
			  {formatDateShort(t.lease_end)}
				</td>
                  <td className="px-4 py-4">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-lg capitalize ${statusStyle[t.status]}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <Link to={`/tenants/${t.id}/edit`}
                        className="p-2 text-gray-400 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </Link>
                      <button onClick={() => handleDelete(t.id, t.unit_id, t.full_name)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}