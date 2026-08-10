import { supabase } from "../lib/supabase"

export const getBuildings = async () => {
  const { data, error } = await supabase
    .from("buildings")
    .select(`
      *,
      units ( id, is_occupied )
    `)
    .order("created_at", { ascending: false })
  if (error) throw error
  return data
}

export const getBuildingById = async (id) => {
  const { data, error } = await supabase
    .from("buildings")
    .select(`
      *,
      units ( * ),
      tenants ( id, full_name, status )
    `)
    .eq("id", id)
    .single()
  if (error) throw error
  return data
}

export const createBuilding = async (payload) => {
  const { data, error } = await supabase
    .from("buildings")
    .insert([payload])
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateBuilding = async (id, payload) => {
  const { data, error } = await supabase
    .from("buildings")
    .update(payload)
    .eq("id", id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteBuilding = async (id) => {
  const { error } = await supabase.from("buildings").delete().eq("id", id)
  if (error) throw error
}

export const createUnit = async (payload) => {
  const { data, error } = await supabase
    .from("units")
    .insert([payload])
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateUnit = async (id, payload) => {
  const { data, error } = await supabase
    .from("units")
    .update(payload)
    .eq("id", id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteUnit = async (id) => {
  const { error } = await supabase.from("units").delete().eq("id", id)
  if (error) throw error
}