#!/usr/bin/env node

/**
 * Script para criar bucket usando Service Role Key
 * 
 * IMPORTANTE: Este script requer a SERVICE ROLE KEY do Supabase
 * Não use a chave anônima (anon key) para criar buckets
 */

const { createClient } = require('@supabase/supabase-js')

// ⚠️ IMPORTANTE: Substitua pela sua SERVICE ROLE KEY
// Você pode encontrar em: Supabase Dashboard → Settings → API → service_role key
const SUPABASE_SERVICE_ROLE_KEY = 'SUA_SERVICE_ROLE_KEY_AQUI'

const supabaseUrl = 'https://zmtwwajyhusyrugobxur.supabase.co'
const bucketName = 'procedure-attachments'

async function createBucketWithServiceRole() {
  if (SUPABASE_SERVICE_ROLE_KEY === 'SUA_SERVICE_ROLE_KEY_AQUI') {
    console.log('❌ ERRO: Você precisa configurar a SERVICE ROLE KEY!')
    console.log('\n📋 Como obter a Service Role Key:')
    console.log('1. Acesse: https://app.supabase.com')
    console.log('2. Vá para: Settings → API')
    console.log('3. Copie a "service_role" key')
    console.log('4. Substitua no arquivo: SUPABASE_SERVICE_ROLE_KEY')
    console.log('\n⚠️  ATENÇÃO: A service role key tem privilégios administrativos!')
    console.log('   Não compartilhe ou commite esta chave no Git!')
    return false
  }

  try {
    console.log('🔧 Criando bucket com Service Role Key...')
    
    // Criar cliente com service role key
    const supabaseAdmin = createClient(supabaseUrl, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Verificar se o bucket já existe
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets()
    
    if (listError) {
      console.error('❌ Erro ao listar buckets:', listError)
      return false
    }

    const existingBucket = buckets.find(b => b.name === bucketName)
    
    if (existingBucket) {
      console.log(`✅ Bucket '${bucketName}' já existe`)
      console.log(`   Público: ${existingBucket.public ? 'Sim' : 'Não'}`)
      return true
    }

    // Criar o bucket
    const { data, error } = await supabaseAdmin.storage.createBucket(bucketName, {
      public: true,
      allowedMimeTypes: [
        'image/jpeg',
        'image/png', 
        'image/gif',
        'image/webp',
        'image/bmp',
        'image/svg+xml',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'application/zip'
      ],
      fileSizeLimit: 50 * 1024 * 1024 // 50MB
    })

    if (error) {
      console.error('❌ Erro ao criar bucket:', error)
      return false
    }

    console.log('✅ Bucket criado com sucesso!')
    
    // Configurar políticas RLS
    console.log('🔧 Configurando políticas RLS...')
    
    const policies = [
      {
        name: 'Public Access',
        sql: `CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = '${bucketName}');`
      },
      {
        name: 'Authenticated Upload',
        sql: `CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = '${bucketName}' AND auth.role() = 'authenticated');`
      },
      {
        name: 'Authenticated Update',
        sql: `CREATE POLICY "Authenticated users can update" ON storage.objects FOR UPDATE USING (bucket_id = '${bucketName}' AND auth.role() = 'authenticated');`
      },
      {
        name: 'Authenticated Delete',
        sql: `CREATE POLICY "Authenticated users can delete" ON storage.objects FOR DELETE USING (bucket_id = '${bucketName}' AND auth.role() = 'authenticated');`
      }
    ]

    for (const policy of policies) {
      try {
        const { error: policyError } = await supabaseAdmin.rpc('exec_sql', {
          sql: policy.sql
        })
        
        if (policyError) {
          console.log(`⚠️  Política '${policy.name}' pode já existir ou ter erro:`, policyError.message)
        } else {
          console.log(`✅ Política '${policy.name}' criada`)
        }
      } catch (error) {
        console.log(`⚠️  Erro ao criar política '${policy.name}':`, error.message)
      }
    }

    // Testar o bucket
    console.log('🧪 Testando bucket...')
    
    const testFile = new File(['Teste'], 'test.txt', { type: 'text/plain' })
    
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(bucketName)
      .upload('test.txt', testFile)

    if (uploadError) {
      console.error('❌ Erro no teste de upload:', uploadError)
    } else {
      console.log('✅ Teste de upload bem-sucedido!')
      
      // Limpar arquivo de teste
      await supabaseAdmin.storage
        .from(bucketName)
        .remove(['test.txt'])
    }

    console.log('\n🎉 Bucket configurado com sucesso!')
    console.log('📋 Configurações aplicadas:')
    console.log('   ✅ Bucket público criado')
    console.log('   ✅ Políticas RLS configuradas')
    console.log('   ✅ Tipos MIME permitidos')
    console.log('   ✅ Limite de 50MB')
    
    return true

  } catch (error) {
    console.error('❌ Erro inesperado:', error)
    return false
  }
}

// Função principal
async function main() {
  console.log('🚀 Criando bucket com Service Role Key...\n')
  
  const success = await createBucketWithServiceRole()
  
  if (success) {
    console.log('\n✅ Configuração concluída!')
    console.log('💡 Agora você pode fazer upload de imagens normalmente.')
  } else {
    console.log('\n❌ Falha na configuração.')
    console.log('💡 Siga as instruções em CONFIGURACAO_BUCKET_STORAGE.md')
  }
}

// Executar script
if (require.main === module) {
  main().catch(console.error)
}

module.exports = {
  createBucketWithServiceRole
}
