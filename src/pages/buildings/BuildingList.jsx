import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { getBuildings, deleteBuilding } from "../../services/buildingService"
import toast from "react-hot-toast"

export default function BuildingList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")

  const { data: buildings = [], isLoading } = useQuery({
    queryKey: ["buildings-full"],
    queryFn: getBuildings,
  })

  const filtered = buildings.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    (b.address || "").toLowerCase().includes(search.toLowerCase())
  )

  const handleDelete = async (id, name, e) => {
    e.stopPropagation()
    if (!confirm(`Delete ${name}? All units in this building will also be deleted.`)) return
    try {
      await deleteBuilding(id)
      toast.success("Building deleted")
      queryClient.invalidateQueries(["buildings-full"])
      queryClient.invalidateQueries(["buildings"])
    } catch {
      toast.error("Failed to delete — make sure no tenants are assigned to this building")
    }
  }

  const getOccupancy = (building) => {
    const total = building.units?.length || 0
    const occupied = building.units?.filter(u => u.is_occupied).length || 0
    return { total, occupied, vacant: total - occupied }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Buildings</h2>
          <p className="text-sm text-gray-400 mt-0.5">{buildings.length} properties</p>
        </div>
        <button onClick={() => navigate("/buildings/new")}
          className="flex items-center gap-2 bg-coral-500 hover:bg-coral-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add building
        </button>
      </div>

      {/* Search */}
      <input type="text" placeholder="Search by name or address..."
        value={search} onChange={e => setSearch(e.target.value)}
        className="w-full max-w-md px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />

      {/* Buildings grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 text-center py-20">
          <div className="text-4xl mb-3">🏢</div>
          <div className="text-gray-400 text-sm">No buildings yet.</div>
          <button onClick={() => navigate("/buildings/new")}
            className="mt-4 text-sm text-brand-500 hover:text-brand-700 font-medium transition">
            Add your first building →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(building => {
            const { total, occupied, vacant } = getOccupancy(building)
            const occupancyPct = total > 0 ? Math.round((occupied / total) * 100) : 0

            return (
              <div key={building.id}
                onClick={() => navigate(`/buildings/${building.id}`)}
                className="bg-white rounded-2xl border border-gray-100 p-6 hover:border-gray-200 hover:shadow-sm cursor-pointer transition">

                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <button onClick={e => handleDelete(building.id, building.name, e)}
                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                <h3 className="text-base font-semibold text-gray-900 mb-1">{building.name}</h3>
                {building.address && (
                  <p className="text-xs text-gray-400 mb-4 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {building.address}
                  </p>
                )}

                {/* Occupancy bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                    <span>Occupancy</span>
                    <span>{occupancyPct}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        occupancyPct >= 90 ? "bg-green-500" :
                        occupancyPct >= 70 ? "bg-brand-500" :
                        "bg-yellow-500"
                      }`}
                      style={{ width: `${occupancyPct}%` }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                    <div className="text-base font-semibold text-gray-900">{total}</div>
                    <div className="text-xs text-gray-400">Total</div>
                  </div>
                  <div className="bg-green-50 rounded-xl p-2.5 text-center">
                    <div className="text-base font-semibold text-green-700">{occupied}</div>
                    <div className="text-xs text-gray-400">Occupied</div>
                  </div>
                  <div className="bg-yellow-50 rounded-xl p-2.5 text-center">
                    <div className="text-base font-semibold text-yellow-700">{vacant}</div>
                    <div className="text-xs text-gray-400">Vacant</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}