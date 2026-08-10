import { supabase } from "../lib/supabase"

const generateTicketNumber = async () => {
  const year = new Date().getFullYear()
  const prefix = `TKT-${year}`
  const { count } = await supabase
    .from("maintenance")
    .select("*", { count: "exact", head: true })
    .like("ticket_number", `${prefix}%`)
  return `${prefix}-${String((count || 0) + 1).padStart(4, "0")}`
}

export const getTickets = async ({ status = "", priority = "", building = "", category = "", search = "" } = {}) => {
  let query = supabase
    .from("maintenance")
    .select(`
      *,
      buildings ( name ),
      units ( unit_number ),
      tenants ( full_name, phone ),
      employees ( full_name )
    `)
    .order("created_at", { ascending: false })

  if (status)   query = query.eq("status", status)
  if (priority) query = query.eq("priority", priority)
  if (building) query = query.eq("building_id", building)
  if (category) query = query.eq("category", category)

  const { data, error } = await query
  if (error) throw error

  if (search) {
    return data.filter(t =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.ticket_number.toLowerCase().includes(search.toLowerCase())
    )
  }
  return data
}

export const getTicketById = async (id) => {
  const { data, error } = await supabase
    .from("maintenance")
    .select(`
      *,
      buildings ( * ),
      units ( * ),
      tenants ( * ),
      employees ( full_name, phone, role )
    `)
    .eq("id", id)
    .single()
  if (error) throw error
  return data
}

export const createTicket = async (payload) => {
  const ticket_number = await generateTicketNumber()
  const { data, error } = await supabase
    .from("maintenance")
    .insert([{ ...payload, ticket_number }])
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateTicket = async (id, payload) => {
  const { data, error } = await supabase
    .from("maintenance")
    .update(payload)
    .eq("id", id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteTicket = async (id) => {
  const { error } = await supabase.from("maintenance").delete().eq("id", id)
  if (error) throw error
}

export const getMaintenanceSummary = async () => {
  const { data, error } = await supabase
    .from("maintenance")
    .select("status, priority, actual_cost")
  if (error) throw error

  return {
    total:       data.length,
    open:        data.filter(t => t.status === "open").length,
    inProgress:  data.filter(t => t.status === "in_progress").length,
    resolved:    data.filter(t => t.status === "resolved").length,
    urgent:      data.filter(t => t.priority === "urgent").length,
    totalCost:   data.reduce((sum, t) => sum + Number(t.actual_cost || 0), 0),
  }
}