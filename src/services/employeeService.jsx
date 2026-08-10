import { supabase } from "../lib/supabase"

export const getEmployees = async ({ search = "", role = "", building = "", status = "" } = {}) => {
  let query = supabase
    .from("employees")
    .select(`*, buildings ( name )`)
    .order("created_at", { ascending: false })

  if (role) query = query.eq("role", role)
  if (building) query = query.eq("building_id", building)
  if (status) query = query.eq("status", status)

  const { data, error } = await query
  if (error) throw error

  if (search) {
    return data.filter(e =>
      e.full_name.toLowerCase().includes(search.toLowerCase()) ||
      e.phone.includes(search)
    )
  }
  return data
}

export const getEmployeeById = async (id) => {
  const { data, error } = await supabase
    .from("employees")
    .select(`*, buildings ( * )`)
    .eq("id", id)
    .single()
  if (error) throw error
  return data
}

export const createEmployee = async (payload) => {
  const { data, error } = await supabase
    .from("employees")
    .insert([payload])
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateEmployee = async (id, payload) => {
  const { data, error } = await supabase
    .from("employees")
    .update(payload)
    .eq("id", id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteEmployee = async (id) => {
  const { error } = await supabase.from("employees").delete().eq("id", id)
  if (error) throw error
}

export const getAttendance = async (employeeId, month, year) => {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`
  const endDate = new Date(year, month, 0).toISOString().split("T")[0]

  const { data, error } = await supabase
    .from("attendance")
    .select("*")
    .eq("employee_id", employeeId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date")
  if (error) throw error
  return data
}

export const markAttendance = async (employeeId, date, status, checkIn = null, checkOut = null) => {
  const { data, error } = await supabase
    .from("attendance")
    .upsert({
      employee_id: employeeId,
      date,
      status,
      check_in: checkIn,
      check_out: checkOut,
    }, { onConflict: "employee_id,date" })
    .select()
    .single()
  if (error) throw error
  return data
}

export const getSalaryPayments = async (employeeId) => {
  const { data, error } = await supabase
    .from("salary_payments")
    .select("*")
    .eq("employee_id", employeeId)
    .order("year", { ascending: false })
    .order("month", { ascending: false })
  if (error) throw error
  return data
}

export const processSalary = async (employeeId, month, year, payload) => {
  const { data, error } = await supabase
    .from("salary_payments")
    .upsert({
      employee_id: employeeId,
      month,
      year,
      ...payload,
      net_salary: Number(payload.base_salary) + Number(payload.bonus || 0) - Number(payload.deductions || 0),
    }, { onConflict: "employee_id,month,year" })
    .select()
    .single()
  if (error) throw error
  return data
}

export const getEmployeeSummary = async () => {
  const { data, error } = await supabase
    .from("employees")
    .select("status, salary")
  if (error) throw error

  return {
    total: data.length,
    active: data.filter(e => e.status === "active").length,
    onLeave: data.filter(e => e.status === "on_leave").length,
    inactive: data.filter(e => e.status === "inactive").length,
    totalSalary: data
      .filter(e => e.status === "active")
      .reduce((sum, e) => sum + Number(e.salary), 0),
  }
}