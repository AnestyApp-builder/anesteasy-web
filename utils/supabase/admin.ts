import { createClient } from '@supabase/supabase-js'

/**
 * Cria um cliente Supabase com privilégios de administrador (service_role).
 * ATENÇÃO: Use apenas no lado do servidor e com extrema cautela.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
