import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  getBuildingById, updateBuilding,
  createUnit, updateUnit, deleteUnit
} from "../../services/buildingService"
import toast from "react-hot-toast"

export default function BuildingDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editMode, setEditMode] = useState(false)
  const [showUnitModal, setShowUnitModal] = useState(false)
  const [editUnit, setEditUnit] = useState(null)
  const [buildingForm, setBuildingForm] = useState(null)
  const [unitForm, setUnitForm] = useState({
    unit_number: "", floor: "", type: "residential", bedrooms: ""
  })
  const [saving, setSaving] = useState(false)

  const { data: building, isLoading, isError } = useQuery({
    queryKey: ["building", id],
    queryFn: () => getBuildingById(id),
    onSuccess: (data) => {
      if (!buildingForm) {
        setBuildingForm({
          name: data.name || "",
          address: data.address || "",
          total_units: data.total_units || "",
        })
      }
    }
  })

  const handleSaveBuilding = async () => {
    setSaving(true)
    try {
      await updateBuilding(id, {
        name: buildingForm.name,
        address: buildingForm.address || null,
        total_units: Number(buildingForm.total_units) || 0,
      })
      toast.success("Building updated!")
      setEditMode(false)
      queryClient.invalidateQueries(["building", id])
      queryClient.invalidateQueries(["buildings-full"])
    } catch {
      toast.error("Failed to update building")
    } finally {
      setSaving(false)
    }
  }

  const handleSaveUnit = async () => {
    if (!unitForm.unit_number.trim()) { toast.error("Unit number is required"); return }
    setSaving(true)
    try {
      if (editUnit) {
        await updateUnit(editUnit.id, {
          unit_number: unitForm.unit_number,
          floor: Number(unitForm.floor) || 0,
          type: unitForm.type,
          bedrooms: unitForm.bedrooms || null,
        })
        toast.success("Unit updated!")
      } else {
        await createUnit({
          building_id: id,
          unit_number: unitForm.unit_number,
          floor: Number(unitForm.floor) || 0,
          type: unitForm.type,
          bedrooms: unitForm.bedrooms || null,
          is_occupied: false,
        })
        toast.success("Unit added!")
      }
      setShowUnitModal(false)
      setEditUnit(null)
      setUnitForm({ unit_number: "", floor: "", type: "residential", bedrooms: "" })
      queryClient.invalidateQueries(["building", id])
      queryClient.invalidateQueries(["buildings-full"])
    } catch {
      toast.error("Failed to save unit")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteUnit = async (unitId) => {
    if (!confirm("Delete this unit?")) return
    try {
      await deleteUnit(unitId)
      toast.success("Unit deleted")
      queryClient.invalidateQueries(["building", id])
    } catch {
      toast.error("Cannot delete — a tenant may be assigned to this unit")
    }
  }

  const openEditUnit = (unit) => {
    setEditUnit(unit)
    setUnitForm({
      unit_number: unit.unit_number || "",
      floor: unit.floor || "",
      type: unit.type || "residential",
      bedrooms: unit.bedrooms || "",
    })
    setShowUnitModal(true)
  }

  if (isLoading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (isError || !building) return (
    <div className="text-center py-32 text-gray-400 text-sm">
      Building not found.{" "}
      <button onClick={() => navigate("/buildings")} className="text-brand-500 hover:underline">
        Go back
      </button>
    </div>
  )

  const totalUnits    = building.units?.length || 0
  const occupiedUnits = building.units?.filter(u => u.is_occupied).length || 0
  const vacantUnits   = totalUnits - occupiedUnits
  const occupancyPct  = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button onClick={() => navigate("/buildings")}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
          </svg>
          Back to buildings
        </button>
        <div className="flex items-center gap-2">
          {editMode ? (
            <>
              <button onClick={() => setEditMode(false)}
                className="text-sm px-4 py-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={handleSaveBuilding} disabled={saving}
                className="flex items-center gap-2 bg-coral-500 hover:bg-coral-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition disabled:opacity-60">
                {saving ? "Saving..." : "Save changes"}
              </button>
            </>
          ) : (
            <button onClick={() => {
              setBuildingForm({
                name: building.name || "",
                address: building.address || "",
                total_units: building.total_units || "",
              })
              setEditMode(true)
            }}
              className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Building header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        {editMode && buildingForm ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Building name</label>
              <input type="text" value={buildingForm.name}
                onChange={e => setBuildingForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Address</label>
              <input type="text" value={buildingForm.address}
                onChange={e => setBuildingForm(f => ({ ...f, address: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Total units</label>
              <input type="number" value={buildingForm.total_units}
                onChange={e => setBuildingForm(f => ({ ...f, total_units: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center flex-shrink-0">
              <svg className="w-7 h-7 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900">{building.name}</h2>
              {building.address && (
                <p className="text-sm text-gray-400 mt-1 flex items-center gap-1.5">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {building.address}
                </p>
              )}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                  <span>Occupancy rate</span>
                  <span>{occupancyPct}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      occupancyPct >= 90 ? "bg-green-500" :
                      occupancyPct >= 70 ? "bg-brand-500" : "bg-yellow-500"
                    }`}
                    style={{ width: `${occupancyPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats row */}
        {!editMode && (
          <div className="grid grid-cols-3 gap-3 mt-5">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-xl font-semibold text-gray-900">{totalUnits}</div>
              <div className="text-xs text-gray-400 mt-0.5">Total units</div>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <div className="text-xl font-semibold text-green-700">{occupiedUnits}</div>
              <div className="text-xs text-gray-400 mt-0.5">Occupied</div>
            </div>
            <div className="bg-yellow-50 rounded-xl p-3 text-center">
              <div className="text-xl font-semibold text-yellow-700">{vacantUnits}</div>
              <div className="text-xs text-gray-400 mt-0.5">Vacant</div>
            </div>
          </div>
        )}
      </div>

      {/* Units section */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Units ({totalUnits})</h3>
          <button onClick={() => {
            setEditUnit(null)
            setUnitForm({ unit_number: "", floor: "", type: "residential", bedrooms: "" })
            setShowUnitModal(true)
          }}
            className="flex items-center gap-1.5 text-sm text-brand-500 hover:text-brand-700 font-medium transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add unit
          </button>
        </div>

        {!building.units || building.units.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            No units added yet.
            <button onClick={() => setShowUnitModal(true)}
              className="block mx-auto mt-2 text-brand-500 hover:text-brand-700 font-medium transition">
              Add first unit →
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-xs font-medium text-gray-400 uppercase tracking-wide bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3">Unit</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Floor</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Type</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Bedrooms</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {building.units
                .sort((a, b) => (a.floor || 0) - (b.floor || 0))
                .map(unit => (
                  <tr key={unit.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">
                      {unit.unit_number}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden sm:table-cell">
                      {unit.floor !== null ? `Floor ${unit.floor}` : "—"}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-lg capitalize ${
                        unit.type === "commercial"
                          ? "bg-purple-50 text-purple-700"
                          : "bg-blue-50 text-blue-700"
                      }`}>
                        {unit.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">
                      {unit.bedrooms || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${
                        unit.is_occupied
                          ? "bg-green-50 text-green-700"
                          : "bg-yellow-50 text-yellow-700"
                      }`}>
                        {unit.is_occupied ? "Occupied" : "Vacant"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEditUnit(unit)}
                          className="p-2 text-gray-400 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {!unit.is_occupied && (
                          <button onClick={() => handleDeleteUnit(unit.id)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Tenants in this building */}
      {building.tenants && building.tenants.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">
              Tenants ({building.tenants.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-50">
            {building.tenants.map(tenant => (
              <div key={tenant.id} className="flex items-center justify-between px-6 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold flex items-center justify-center">
                    {tenant.full_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </div>
                  <span className="text-sm text-gray-700">{tenant.full_name}</span>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-lg capitalize ${
                  tenant.status === "active"   ? "bg-green-50 text-green-700" :
                  tenant.status === "expiring" ? "bg-yellow-50 text-yellow-700" :
                  tenant.status === "overdue"  ? "bg-red-50 text-red-700" :
                  "bg-gray-100 text-gray-500"
                }`}>
                  {tenant.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit unit modal */}
      {showUnitModal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-base font-semibold text-gray-900">
              {editUnit ? "Edit unit" : "Add new unit"}
            </h3>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Unit number <span className="text-red-400">*</span>
              </label>
              <input type="text" value={unitForm.unit_number}
                onChange={e => setUnitForm(f => ({ ...f, unit_number: e.target.value }))}
                placeholder="e.g. Flat 101, Shop 5"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Floor</label>
                <input type="number" value={unitForm.floor}
                  onChange={e => setUnitForm(f => ({ ...f, floor: e.target.value }))}
                  placeholder="e.g. 3"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Type</label>
                <select value={unitForm.type}
                  onChange={e => setUnitForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                </select>
              </div>
            </div>
            {unitForm.type === "residential" && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Bedrooms</label>
                <select value={unitForm.bedrooms}
                  onChange={e => setUnitForm(f => ({ ...f, bedrooms: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                  <option value="">Select</option>
                  <option value="Studio">Studio</option>
                  <option value="1 BHK">1 BHK</option>
                  <option value="2 BHK">2 BHK</option>
                  <option value="3 BHK">3 BHK</option>
                  <option value="4 BHK">4 BHK</option>
                  <option value="Penthouse">Penthouse</option>
                </select>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button onClick={() => {
                setShowUnitModal(false)
                setEditUnit(null)
              }}
                className="flex-1 py-2.5 text-sm rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={handleSaveUnit} disabled={saving}
                className="flex-1 py-2.5 text-sm rounded-xl bg-coral-500 hover:bg-coral-700 text-white font-medium transition disabled:opacity-60">
                {saving ? "Saving..." : editUnit ? "Save changes" : "Add unit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}