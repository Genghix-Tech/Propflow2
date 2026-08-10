import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { createBuilding } from "../../services/buildingService"
import toast from "react-hot-toast"

const defaultForm = {
  name: "",
  address: "",
  total_units: "",
  description: "",
}

export default function AddBuilding() {
  const navigate = useNavigate()
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error("Building name is required"); return }

    setSaving(true)
    try {
      const building = await createBuilding({
        name: form.name.trim(),
        address: form.address || null,
        total_units: Number(form.total_units) || 0,
      })
      toast.success("Building added successfully!")
      navigate(`/buildings/${building.id}`)
    } catch (err) {
      toast.error("Failed to add building: " + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Add new building</h2>
          <p className="text-sm text-gray-400 mt-0.5">Add a property to your portfolio</p>
        </div>
        <button onClick={() => navigate("/buildings")}
          className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1.5 transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 pb-3 border-b border-gray-100">
            Building details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Building name <span className="text-red-400">*</span>
              </label>
              <input type="text" value={form.name}
                onChange={e => set("name", e.target.value)}
                placeholder="e.g. Tower A, Green Heights"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Address</label>
              <input type="text" value={form.address}
                onChange={e => set("address", e.target.value)}
                placeholder="e.g. Block 5, Clifton, Karachi"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Total units</label>
              <input type="number" value={form.total_units}
                onChange={e => set("total_units", e.target.value)}
                placeholder="e.g. 20"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button type="button" onClick={() => navigate("/buildings")}
            className="text-sm px-4 py-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 bg-coral-500 hover:bg-coral-700 text-white text-sm font-medium px-6 py-2.5 rounded-xl transition disabled:opacity-60">
            {saving
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</>
              : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>Save building</>
            }
          </button>
        </div>
      </form>
    </div>
  )
}