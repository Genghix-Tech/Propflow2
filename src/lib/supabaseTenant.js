import { createClient } from "@supabase/supabase-js"

export const supabaseTenant = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      storageKey: "propflow-tenant-session",
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    }
  }
)