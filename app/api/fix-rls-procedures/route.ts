import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// ⚠️ Este endpoint usa Service Role Key e deve ser protegido
export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({
        error: 'Configuração incompleta',
        message: 'NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados',
        instructions: [
          '1. Acesse https://app.supabase.com',
          '2. Vá para Settings → API',
          '3. Copie a Service Role Key',
          '4. Adicione ao .env.local: SUPABASE_SERVICE_ROLE_KEY=sua_key_aqui',
          '5. Reinicie o servidor'
        ]
      }, { status: 500 })
    }

    // Cliente com service role key (privilégios administrativos)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const results = []

    // Verificar políticas existentes
    const { data: existingPolicies, error: checkError } = await supabaseAdmin
      .from('pg_policies')
      .select('policyname')
      .eq('tablename', 'procedures')

    if (checkError) {
      console.error('Erro ao verificar políticas:', checkError)
    } else {
      results.push({ step: 'check', message: `${existingPolicies?.length || 0} políticas existentes encontradas` })
    }

    // Lista de políticas SQL para criar
    const policies = [
      {
        name: 'Users can insert their own procedures',
        sql: `
          CREATE POLICY "Users can insert their own procedures" 
          ON procedures
          FOR INSERT 
          TO authenticated
          WITH CHECK (auth.uid() = user_id);
        `
      },
      {
        name: 'Users can view their own procedures',
        sql: `
          CREATE POLICY "Users can view their own procedures" 
          ON procedures
          FOR SELECT 
          TO authenticated
          USING (auth.uid() = user_id);
        `
      },
      {
        name: 'Users can update their own procedures',
        sql: `
          CREATE POLICY "Users can update their own procedures" 
          ON procedures
          FOR UPDATE 
          TO authenticated
          USING (auth.uid() = user_id)
          WITH CHECK (auth.uid() = user_id);
        `
      },
      {
        name: 'Users can delete their own procedures',
        sql: `
          CREATE POLICY "Users can delete their own procedures" 
          ON procedures
          FOR DELETE 
          TO authenticated
          USING (auth.uid() = user_id);
        `
      },
      {
        name: 'Secretarias can view linked procedures',
        sql: `
          CREATE POLICY "Secretarias can view linked procedures" 
          ON procedures
          FOR SELECT 
          TO authenticated
          USING (
            secretaria_id IN (
              SELECT id FROM secretarias WHERE email = auth.jwt() ->> 'email'
            )
          );
        `
      },
      {
        name: 'Secretarias can update linked procedures',
        sql: `
          CREATE POLICY "Secretarias can update linked procedures" 
          ON procedures
          FOR UPDATE 
          TO authenticated
          USING (
            secretaria_id IN (
              SELECT id FROM secretarias WHERE email = auth.jwt() ->> 'email'
            )
          )
          WITH CHECK (
            secretaria_id IN (
              SELECT id FROM secretarias WHERE email = auth.jwt() ->> 'email'
            )
          );
        `
      }
    ]

    // Tentar criar cada política
    for (const policy of policies) {
      try {
        // Primeiro, tentar remover a política se já existir
        const { error: dropError } = await supabaseAdmin.rpc('exec_sql', {
          sql: `DROP POLICY IF EXISTS "${policy.name}" ON procedures;`
        })

        // Criar a política
        const { data, error } = await supabaseAdmin.rpc('exec_sql', {
          sql: policy.sql
        })

        if (error) {
          // Se o erro for que a política já existe, está ok
          if (error.message.includes('already exists')) {
            results.push({ 
              policy: policy.name, 
              status: 'exists', 
              message: 'Política já existe' 
            })
          } else {
            results.push({ 
              policy: policy.name, 
              status: 'error', 
              error: error.message 
            })
          }
        } else {
          results.push({ 
            policy: policy.name, 
            status: 'created', 
            message: 'Política criada com sucesso' 
          })
        }
      } catch (err: any) {
        results.push({ 
          policy: policy.name, 
          status: 'error', 
          error: err.message 
        })
      }
    }

    // Habilitar RLS se não estiver habilitado
    try {
      await supabaseAdmin.rpc('exec_sql', {
        sql: 'ALTER TABLE procedures ENABLE ROW LEVEL SECURITY;'
      })
      results.push({ 
        step: 'enable_rls', 
        status: 'success', 
        message: 'RLS habilitado na tabela procedures' 
      })
    } catch (err: any) {
      // Se RLS já estiver habilitado, ignorar erro
      results.push({ 
        step: 'enable_rls', 
        status: 'info', 
        message: 'RLS já estava habilitado ou erro ao habilitar' 
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Processo de configuração RLS concluído',
      results,
      nextSteps: [
        '1. Tente salvar um procedimento novamente',
        '2. Se ainda não funcionar, execute os comandos SQL manualmente no Supabase Dashboard'
      ]
    })

  } catch (error: any) {
    console.error('Erro ao configurar RLS:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      instructions: [
        'Execute os comandos SQL manualmente no Supabase Dashboard:',
        '1. Acesse https://app.supabase.com',
        '2. Vá para SQL Editor',
        '3. Execute os comandos do arquivo SOLUCAO_RLS_PROCEDURES.sql'
      ]
    }, { status: 500 })
  }
}

// Health check
export async function GET() {
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
  
  return NextResponse.json({
    status: 'ready',
    hasServiceKey,
    message: hasServiceKey 
      ? 'Service Role Key configurada. Execute POST para criar as políticas RLS.' 
      : 'Service Role Key NÃO configurada. Configure no .env.local'
  })
}

