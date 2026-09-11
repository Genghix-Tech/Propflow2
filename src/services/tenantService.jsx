import { supabase } from "../lib/supabase"

export const getTenants = async ({ search = "", status = "", building = "" } = {}) => {
  let query = supabase
    .from("tenants")
    .select(`
      id, full_name, email, phone, status,
      building_id, unit_id,
      monthly_rent, maintenance_charges, security_deposit, advance_deposit,
      tax_type, tax_percentage,
      lease_start, lease_end,
      units ( unit_number, floor, type, bedrooms ),
      buildings ( name )
    `)
    .order("created_at", { ascending: false })

  if (search) query = query.ilike("full_name", `%${search}%`)
  if (status) query = query.eq("status", status)
  if (building) query = query.eq("building_id", building)

  const { data, error } = await query
  if (error) throw error
  return data
}

export const getTenantById = async (id) => {
  const { data, error } = await supabase
    .from("tenants")
    .select(`
      *,
      units ( * ),
      buildings ( * )
    `)
    .eq("id", id)
    .single()
  if (error) throw error
  return data
}

export const createTenant = async (payload) => {
  const { data, error } = await supabase
    .from("tenants")
    .insert([payload])
    .select()
    .single()
  if (error) throw error

  // Mark unit as occupied
  if (payload.unit_id) {
    await supabase.from("units")
      .update({ is_occupied: true })
      .eq("id", payload.unit_id)
  }

  return data
}

export const updateTenant = async (id, payload) => {
  const { data, error } = await supabase
    .from("tenants")
    .update(payload)
    .eq("id", id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteTenant = async (id, unitId) => {
  const { error } = await supabase.from("tenants").delete().eq("id", id)
  if (error) throw error
  if (unitId) {
    await supabase.from("units").update({ is_occupied: false }).eq("id", unitId)
  }
}

export const getBuildings = async () => {
  const { data, error } = await supabase.from("buildings").select("*").order("name")
  if (error) throw error
  return data
}

export const getVacantUnits = async (buildingId) => {
  const { data, error } = await supabase
    .from("units")
    .select("*")
    .eq("building_id", buildingId)
    .eq("is_occupied", false)
    .order("unit_number")
  if (error) throw error
  return data
}