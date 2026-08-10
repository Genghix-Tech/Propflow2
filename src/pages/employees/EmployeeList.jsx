import { formatCurrency } from "../../lib/utils"
import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { getEmployees, getEmployeeSummary, deleteEmployee } from "../../services/employeeService"
import { getBuildings } from "../../services/tenantService"
import toast from "react-hot-toast"

const statusStyle = {
  active:   "bg-green-50 text-green-700",
  inactive: "bg-gray-100 text-gray-500",
  on_leave: "bg-yellow-50 text-yellow-700",
}

const roleLabel = {
  security_guard: "Security guard",
  cleaner:        "Cleaner",
  electrician:    "Electrician",
  plumber:        "Plumber",
  manager:        "Manager",
  receptionist:   "Receptionist",
  maintenance:    "Maintenance",
  other:          "Other",
}

const roleColors = {
  security_guard: "bg-blue-50 text-blue-700",
  cleaner:        "bg-teal-50 text-teal-700",
  electrician:    "bg-yellow-50 text-yellow-700",
  plumber:        "bg-orange-50 text-orange-700",
  manager:        "bg-purple-50 text-purple-700",
  receptionist:   "bg-pink-50 text-pink-700",
  maintenance:    "bg-red-50 text-red-700",
  other:          "bg-gray-100 text-gray-600",
}

export default function EmployeeList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch]     = useState("")
  const [role, setRole]         = useState("")
  const [building, setBuilding] = useState("")
  const [status, setStatus]     = useState("")

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees", search, role, building, status],
    queryFn: () => getEmployees({ search, role, building, status }),
  })

  const { data: summary } = useQuery({
    queryKey: ["employee-summary"],
    queryFn: getEmployeeSummary,
  })

  const { data: buildings = [] } = useQuery({
    queryKey: ["buildings"],
    queryFn: getBuildings,
  })

  const handleDelete = async (id, name, e) => {
    e.stopPropagation()
    if (!confirm(`Remove ${name}? This cannot be undone.`)) return
    try {
      await deleteEmployee(id)
      toast.success("Employee removed")
      queryClient.invalidateQueries(["employees"])
      queryClient.invalidateQueries(["employee-summary"])
    } catch {
      toast.error("Failed to remove employee")
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Employees</h2>
          <p className="text-sm text-gray-400 mt-0.5">{employees.length} staff members</p>
        </div>
        <button onClick={() => navigate("/employees/new")}
          className="flex items-center gap-2 bg-coral-500 hover:bg-coral-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add employee
        </button>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total staff",      value: summary.total,       color: "text-gray-700" },
            { label: "Active",           value: summary.active,      color: "text-green-600" },
            { label: "On leave",         value: summary.onLeave,     color: "text-yellow-600" },
            { label: "Monthly payroll", value: formatCurrency(summary.totalSalary), color: "text-brand-600" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className={`text-xl font-semibold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input type="text" placeholder="Search by name or phone..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-48 px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
        <select value={role} onChange={e => setRole(e.target.value)}
          className="px-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">All roles</option>
          {Object.entries(roleLabel).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        <select value={building} onChange={e => setBuilding(e.target.value)}
          className="px-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">All buildings</option>
          {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="px-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="on_leave">On leave</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : employees.length === 0 ? (
          <div className="text-center py-20 text-gray-400 text-sm">No employees found.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs font-medium text-gray-400 uppercase tracking-wide">
                <th className="text-left px-6 py-3">Employee</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Role</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Building</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Salary</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {employees.map(emp => (
                <tr key={emp.id}
                  onClick={() => navigate(`/employees/${emp.id}`)}
                  className="hover:bg-gray-50 cursor-pointer transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold flex items-center justify-center flex-shrink-0">
                        {emp.full_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{emp.full_name}</div>
                        <div className="text-xs text-gray-400">{emp.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 hidden md:table-cell">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${roleColors[emp.role]}`}>
                      {roleLabel[emp.role]}
                    </span>
                  </td>
                  <td className="px-4 py-4 hidden lg:table-cell text-sm text-gray-500">
                    {emp.buildings?.name || "—"}
                  </td>
                  <td className="px-4 py-4 hidden lg:table-cell text-sm text-gray-700 font-medium">
                    {formatCurrency(emp.salary)}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-lg capitalize ${statusStyle[emp.status]}`}>
                      {emp.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={e => { e.stopPropagation(); navigate(`/employees/${emp.id}/edit`) }}
                        className="p-2 text-gray-400 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={e => handleDelete(emp.id, emp.full_name, e)}
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