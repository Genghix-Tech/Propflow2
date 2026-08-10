import { supabase } from "../lib/supabase"

// Public — used by the unauthenticated enquiry form to populate the building dropdown.
// Reads from `buildings_public` view (name only) since anonymous visitors can't read the full buildings table.
export const getPublicBuildings = async () => {
  const { data, error } = await supabase
    .from("buildings_public")
    .select("id, name")
    .order("name")
  if (error) throw error
  return data
}

// Public — used by the unauthenticated enquiry form. Anon key + RLS insert policy handles access.
export const submitEnquiry = async (payload) => {
  const { data, error } = await supabase
    .from("enquiries")
    .insert([payload])
    .select()
    .single()
  if (error) throw error
  return data
}

// Admin — list enquiries with optional status filter, paginated so it stays fast as data grows
export const getEnquiries = async ({ status = "", page = 0, pageSize = 20 } = {}) => {
  let query = supabase
    .from("enquiries")
    .select(`
      *,
      buildings ( name ),
      units ( unit_number )
    `, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(page * pageSize, page * pageSize + pageSize - 1)

  if (status) query = query.eq("status", status)

  const { data, error, count } = await query
  if (error) throw error
  return { data, count }
}

export const updateEnquiryStatus = async (id, status) => {
  const { error } = await supabase
    .from("enquiries")
    .update({ status })
    .eq("id", id)
  if (error) throw error
}

export const deleteEnquiry = async (id) => {
  const { error } = await supabase.from("enquiries").delete().eq("id", id)
  if (error) throw error
}
