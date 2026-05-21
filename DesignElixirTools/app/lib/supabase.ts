import { createClient } from "@supabase/supabase-js"

export function createSupabaseClient(token?: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    token ? {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    } : {}
  )
}