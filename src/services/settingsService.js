import { supabase } from "../lib/supabase"

// Singleton row — see migrations/app_settings_bank_info.sql. Holds app-wide
// config that isn't tied to a tenant/invoice/building; currently just the
// bank/payment-receiving details printed on every invoice.
export const getAppSettings = async () => {
  const { data, error } = await supabase
    .from("app_settings")
    .select("*")
    .eq("id", true)
    .maybeSingle()
  if (error) throw error
  return data || { invoice_bank_info: "" }
}

export const updateInvoiceBankInfo = async (invoice_bank_info) => {
  const { data, error } = await supabase
    .from("app_settings")
    .update({ invoice_bank_info, updated_at: new Date().toISOString() })
    .eq("id", true)
    .select()
    .single()
  if (error) throw error
  return data
}
