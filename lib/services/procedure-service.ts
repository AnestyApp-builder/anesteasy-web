import { createClient } from '@supabase/supabase-js';
import { encrypt } from '../security';
import { procedureSchema } from '../validations/procedure';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

/**
 * Serviço responsável pela lógica de negócio de procedimentos médicos.
 * Centraliza a criação, validação e criptografia de dados sensíveis (LGPD).
 */
export const procedureService = {
  /**
   * Cria um novo procedimento médico no banco de dados.
   * Os dados do paciente são criptografados antes da persistência para garantir a privacidade.
   * 
   * @param procedureData Objeto contendo os campos do procedimento (paciente, cirurgião, hospital, etc.)
   * @param userId ID do médico anestesista proprietário do registro
   * @returns O procedimento criado ou erro em caso de falha
   */
  async createProcedure(procedureData: any, userId: string) {
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Configuração do servidor incompleta (Supabase URL/Key)');
    }

    // 1. Validação de Input (Zod) - Nunca confiar no frontend
    const validatedData = procedureSchema.safeParse(procedureData);
    
    if (!validatedData.success) {
      const errorMessages = validatedData.error.issues.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
      throw new Error(`Erro de validação: ${errorMessages}`);
    }

    const cleanData = validatedData.data;

    // 2. Campos para criptografar (LGPD)
    const sensitiveFields = ['patient_name', 'patient_id', 'notes', 'procedure_name'];
    const encryptedData = { ...cleanData };

    for (const field of sensitiveFields) {
      if ((encryptedData as any)[field]) {
        (encryptedData as any)[field] = encrypt((encryptedData as any)[field]);
      }
    }

    const { data, error } = await supabaseAdmin
      .from('procedures')
      .insert([{
        ...encryptedData,
        user_id: userId,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
