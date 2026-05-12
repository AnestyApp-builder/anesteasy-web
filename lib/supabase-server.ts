import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase';

let _supabaseAdmin: ReturnType<typeof createClient<Database>> | null = null;

/**
 * Retorna o cliente Supabase com privilégios de Admin (Service Role)
 * Inicializado de forma Lazy para evitar erros durante o build
 */
export function getSupabaseAdmin() {
  if (_supabaseAdmin) return _supabaseAdmin;

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.warn('Supabase Admin variables missing. This is expected during build but will fail at runtime.');
    // Retornamos um cliente dummy ou null para não quebrar o build
    // Mas na execução real (runtime), as variáveis devem estar lá.
  }

  _supabaseAdmin = createClient<Database>(
    supabaseUrl || 'https://dummy.supabase.co',
    supabaseServiceRoleKey || 'dummy-key'
  );

  return _supabaseAdmin;
}

// Exportamos uma instância para facilitar o uso, mas que será inicializada apenas no primeiro acesso
export const supabaseAdmin = getSupabaseAdmin();
