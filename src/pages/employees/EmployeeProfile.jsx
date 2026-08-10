import { formatCurrency, formatDate } from "../../lib/utils"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import {
  getEmployeeById, deleteEmployee,
  getAttendance, markAttendance,
  getSalaryPayments, processSalary
} from "../../services/employeeService"
import toast from "react-hot-toast"

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

const statusStyle = {
  active:   "bg-green-50 text-green-700",
  inactive: "bg-gray-100 text-gray-500",
  on_leave: "bg-yellow-50 text-yellow-700",
}

const attendanceStyle = {
  present:  "bg-green-500",
  absent:   "bg-red-500",
  half_day: "bg-yellow-400",
  on_leave: "bg-blue-400",
}

const attendanceLabel = {
  present:  "P",
  absent:   "A",
  half_day: "H",
  on_leave: "L",
}

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
]

export default function EmployeeProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const now = new Date()

  const [attMonth, setAttMonth] = useState(now.getMonth() + 1)
  const [attYear, setAttYear]   = useState(now.getFullYear())
  const [showSalaryModal, setShowSalaryModal] = useState(false)
  const [salaryForm, setSalaryForm] = useState({
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    base_salary: "",
    bonus: "0",
    deductions: "0",
    payment_method: "cash",
    payment_date: now.toISOString().split("T")[0],
    status: "paid",
    notes: "",
  })

  const { data: employee, isLoading, isError } = useQuery({
    queryKey: ["employee", id],
    queryFn: () => getEmployeeById(id),
  })

  const { data: attendance = [] } = useQuery({
    queryKey: ["attendance", id, attMonth, attYear],
    queryFn: () => getAttendance(id, attMonth, attYear),
    enabled: !!id,
  })

  const { data: salaryHistory = [] } = useQuery({
    queryKey: ["salary", id],
    queryFn: () => getSalaryPayments(id),
    enabled: !!id,
  })

  const handleDelete = async () => {
    if (!confirm(`Remove ${employee?.full_name}? This cannot be undone.`)) return
    try {
      await deleteEmployee(id)
      toast.success("Employee removed")
      queryClient.invalidateQueries(["employees"])
      navigate("/employees")
    } catch {
      toast.error("Failed to remove employee")
    }
  }

  const handleAttendance = async (date, status) => {
    try {
      await markAttendance(id, date, status)
      toast.success("Attendance marked")
      queryClient.invalidateQueries(["attendance", id, attMonth, attYear])
    } catch {
      toast.error("Failed to mark attendance")
    }
  }

  const handleSalary = async () => {
    try {
      await processSalary(id, salaryForm.month, salaryForm.year, {
        base_salary: Number(salaryForm.base_salary) || Number(employee?.salary) || 0,
        bonus: Number(salaryForm.bonus) || 0,
        deductions: Number(salaryForm.deductions) || 0,
        payment_method: salaryForm.payment_method,
        payment_date: salaryForm.payment_date,
        status: salaryForm.status,
        notes: salaryForm.notes || null,
      })
      toast.success("Salary processed!")
      setShowSalaryModal(false)
      queryClient.invalidateQueries(["salary", id])
    } catch {
      toast.error("Failed to process salary")
    }
  }

  const getDaysInMonth = (month, year) => new Date(year, month, 0).getDate()
  const daysInMonth = getDaysInMonth(attMonth, attYear)
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const d = String(i + 1).padStart(2, "0")
    const m = String(attMonth).padStart(2, "0")
    const date = `${attYear}-${m}-${d}`
    const record = attendance.find(a => a.date === date)
    return { day: i + 1, date, status: record?.status || null }
  })

  const presentCount = days.filter(d => d.status === "present").length
  const absentCount  = days.filter(d => d.status === "absent").length
  const halfDayCount = days.filter(d => d.status === "half_day").length
  const leaveCount   = days.filter(d => d.status === "on_leave").length

  const netSalary = (
    Number(salaryForm.base_salary || employee?.salary || 0) +
    Number(salaryForm.bonus || 0) -
    Number(salaryForm.deductions || 0)
  )

  if (isLoading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (isError || !employee) return (
    <div className="text-center py-32 text-gray-400 text-sm">
      Employee not found.{" "}
      <button onClick={() => navigate("/employees")} className="text-brand-500 hover:underline">
        Go back
      </button>
    </div>
  )

  const initials = employee.full_name.split(" ").map(n => n[0]).join("").slice(0, 2)

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button onClick={() => navigate("/employees")}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
          </svg>
          Back to employees
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => {
            setSalaryForm(f => ({ ...f, base_salary: String(employee.salary || "") }))
            setShowSalaryModal(true)
          }}
            className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Process salary
          </button>
          <button onClick={() => navigate(`/employees/${id}/edit`)}
            className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
          <button onClick={handleDelete}
            className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl border border-red-200 hover:bg-red-50 text-red-500 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Remove
          </button>
        </div>
      </div>

      {/* Profile header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-start gap-5 flex-wrap">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-700 text-xl font-semibold flex items-center justify-center flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-semibold text-gray-900">{employee.full_name}</h2>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${roleColors[employee.role]}`}>
                {roleLabel[employee.role]}
              </span>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-lg capitalize ${statusStyle[employee.status]}`}>
                {employee.status.replace("_", " ")}
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-1">
              {employee.buildings?.name || "Not assigned to a building"}
            </p>
            <div className="flex flex-wrap gap-4 mt-3">
              <span className="flex items-center gap-1.5 text-sm text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {employee.phone}
              </span>
              {employee.email && (
                <span className="flex items-center gap-1.5 text-sm text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {employee.email}
                </span>
              )}
            </div>
          </div>
          <div className="bg-brand-50 rounded-xl px-5 py-3 text-center flex-shrink-0">
            <div className="text-2xl font-semibold text-brand-700">
              {formatCurrency(employee.salary)}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">Monthly salary</div>
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <SectionTitle title="Personal details" />
          <InfoRow label="Full name"    value={employee.full_name} />
          <InfoRow label="Phone"        value={employee.phone} />
          <InfoRow label="Email"        value={employee.email || "—"} />
          <InfoRow label="Date of birth" value={
            employee.date_of_birth
              ? new Date(employee.date_of_birth).toLocaleDateString("en-PK", {
                  day: "2-digit", month: "long", year: "numeric"
                })
              : "—"
          } />
          <InfoRow label="Address"      value={employee.address || "—"} />
          <InfoRow label="ID type"      value={employee.id_type?.toUpperCase() || "—"} />
          <InfoRow label="ID number"    value={employee.id_number || "—"} />
          <InfoRow label="Emergency contact" value={
            employee.emergency_contact_name
              ? `${employee.emergency_contact_name} · ${employee.emergency_contact_phone}`
              : "—"
          } />
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <SectionTitle title="Job details" />
          <InfoRow label="Role"      value={roleLabel[employee.role] || "—"} />
          <InfoRow label="Building"  value={employee.buildings?.name || "Not assigned"} />
          <InfoRow label="Salary"    value={`${formatCurrency(employee.salary)} / month`} />
          <InfoRow label="Join date" value={formatDate(employee.join_date)} />
          <InfoRow label="Status"    value={employee.status.replace("_", " ")} />
          {employee.notes && (
            <InfoRow label="Notes" value={employee.notes} />
          )}
        </div>
      </div>

      {/* Attendance section */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <h3 className="text-sm font-semibold text-gray-900">Attendance</h3>
          <div className="flex items-center gap-2">
            <select value={attMonth} onChange={e => setAttMonth(Number(e.target.value))}
              className="text-sm px-3 py-2 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <select value={attYear} onChange={e => setAttYear(Number(e.target.value))}
              className="text-sm px-3 py-2 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* Attendance summary */}
        <div className="grid grid-cols-4 divide-x divide-gray-100 border-b border-gray-100">
          {[
            { label: "Present",  count: presentCount, color: "text-green-600" },
            { label: "Absent",   count: absentCount,  color: "text-red-500" },
            { label: "Half day", count: halfDayCount, color: "text-yellow-600" },
            { label: "On leave", count: leaveCount,   color: "text-blue-500" },
          ].map(item => (
            <div key={item.label} className="p-4 text-center">
              <div className={`text-xl font-semibold ${item.color}`}>{item.count}</div>
              <div className="text-xs text-gray-400 mt-0.5">{item.label}</div>
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="p-6">
          <div className="text-xs text-gray-400 mb-3 flex items-center gap-4 flex-wrap">
            <span>Click a day to mark attendance:</span>
            {[
              { status: "present",  label: "Present",  color: "bg-green-500" },
              { status: "absent",   label: "Absent",   color: "bg-red-500" },
              { status: "half_day", label: "Half day", color: "bg-yellow-400" },
              { status: "on_leave", label: "Leave",    color: "bg-blue-400" },
            ].map(l => (
              <span key={l.status} className="flex items-center gap-1.5">
                <span className={`w-3 h-3 rounded-sm ${l.color}`} />
                {l.label}
              </span>
            ))}
          </div>
          <div className="grid gap-2"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(44px, 1fr))" }}>
            {days.map(({ day, date, status }) => (
              <div key={date} className="relative group">
                <div className={`
                  w-full aspect-square rounded-xl flex flex-col items-center justify-center
                  text-xs font-medium cursor-pointer transition border
                  ${status
                    ? `${attendanceStyle[status]} text-white border-transparent`
                    : "bg-gray-50 text-gray-400 border-gray-100 hover:border-brand-300"
                  }
                `}>
                  <span>{day}</span>
                  {status && <span className="text-xs opacity-80">{attendanceLabel[status]}</span>}
                </div>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-10 hidden group-hover:flex flex-col bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden min-w-max">
                  {[
                    { status: "present",  label: "Present",  color: "hover:bg-green-50 text-green-700" },
                    { status: "absent",   label: "Absent",   color: "hover:bg-red-50 text-red-700" },
                    { status: "half_day", label: "Half day", color: "hover:bg-yellow-50 text-yellow-700" },
                    { status: "on_leave", label: "Leave",    color: "hover:bg-blue-50 text-blue-700" },
                  ].map(opt => (
                    <button key={opt.status}
                      onClick={() => handleAttendance(date, opt.status)}
                      className={`px-4 py-2 text-xs text-left font-medium ${opt.color} transition`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Salary history */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Salary history</h3>
          <button onClick={() => {
            setSalaryForm(f => ({ ...f, base_salary: String(employee.salary || "") }))
            setShowSalaryModal(true)
          }}
            className="text-xs text-brand-500 hover:text-brand-700 font-medium transition">
            Process salary
          </button>
        </div>
        {salaryHistory.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">
            No salary records yet.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-xs font-medium text-gray-400 uppercase tracking-wide bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3">Period</th>
                <th className="text-right px-4 py-3 hidden sm:table-cell">Base</th>
                <th className="text-right px-4 py-3 hidden sm:table-cell">Bonus</th>
                <th className="text-right px-4 py-3 hidden sm:table-cell">Deductions</th>
                <th className="text-right px-4 py-3">Net salary</th>
                <th className="text-left px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {salaryHistory.map(sal => (
                <tr key={sal.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-3 text-sm text-gray-700">
                    {MONTHS[sal.month - 1]} {sal.year}
                    {sal.payment_date && (
                      <div className="text-xs text-gray-400">
                        Paid {new Date(sal.payment_date).toLocaleDateString("en-PK", {
                          day: "2-digit", month: "short"
                        })}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 text-right hidden sm:table-cell">
                    {formatCurrency(sal.base_salary)}
                  </td>
                  <td className="px-4 py-3 text-sm text-green-600 text-right hidden sm:table-cell">
                    +{formatCurrency(sal.bonus)}
                  </td>
                  <td className="px-4 py-3 text-sm text-red-500 text-right hidden sm:table-cell">
                    -{formatCurrency(sal.deductions)}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                    {formatCurrency(sal.net_salary)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${
                      sal.status === "paid"
                        ? "bg-green-50 text-green-700"
                        : "bg-yellow-50 text-yellow-700"
                    }`}>
                      {sal.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Process salary modal */}
      {showSalaryModal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-base font-semibold text-gray-900">Process salary</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Month</label>
                <select value={salaryForm.month}
                  onChange={e => setSalaryForm(f => ({ ...f, month: Number(e.target.value) }))}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Year</label>
                <select value={salaryForm.year}
                  onChange={e => setSalaryForm(f => ({ ...f, year: Number(e.target.value) }))}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                  {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Base salary (PKR)</label>
              <input type="number"
                value={salaryForm.base_salary}
                onChange={e => setSalaryForm(f => ({ ...f, base_salary: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Bonus (PKR)</label>
                <input type="number" value={salaryForm.bonus}
                  onChange={e => setSalaryForm(f => ({ ...f, bonus: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Deductions (PKR)</label>
                <input type="number" value={salaryForm.deductions}
                  onChange={e => setSalaryForm(f => ({ ...f, deductions: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 flex justify-between items-center">
              <span className="text-sm text-gray-500">Net salary</span>
              <span className="text-base font-semibold text-brand-600">
                {formatCurrency(netSalary)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Payment method</label>
                <select value={salaryForm.payment_method}
                  onChange={e => setSalaryForm(f => ({ ...f, payment_method: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="upi">Online transfer</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Payment date</label>
                <input type="date" value={salaryForm.payment_date}
                  onChange={e => setSalaryForm(f => ({ ...f, payment_date: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Status</label>
              <select value={salaryForm.status}
                onChange={e => setSalaryForm(f => ({ ...f, status: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowSalaryModal(false)}
                className="flex-1 py-2.5 text-sm rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={handleSalary}
                className="flex-1 py-2.5 text-sm rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium transition">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SectionTitle({ title }) {
  return (
    <h3 className="text-sm font-semibold text-gray-700 mb-4 pb-3 border-b border-gray-100">
      {title}
    </h3>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-start py-2.5 border-b border-gray-50 last:border-0 gap-4">
      <span className="text-sm text-gray-400 flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-800 font-medium text-right capitalize">{value}</span>
    </div>
  )
}