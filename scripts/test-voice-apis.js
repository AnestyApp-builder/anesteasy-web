#!/usr/bin/env node

/**
 * Script de teste para verificar se as APIs de cadastro por voz estão configuradas corretamente
 * 
 * Uso: node scripts/test-voice-apis.js
 */

const fs = require('fs')
const path = require('path')

console.log('🔍 Verificando configuração das APIs de Cadastro por Voz...\n')

let allChecksPass = true

// Verificar se o arquivo .env.local existe
console.log('1️⃣ Verificando arquivo .env.local...')
const envPath = path.join(process.cwd(), '.env.local')
if (!fs.existsSync(envPath)) {
  console.log('   ❌ Arquivo .env.local não encontrado')
  allChecksPass = false
} else {
  console.log('   ✅ Arquivo .env.local encontrado')
  
  // Ler o conteúdo do .env.local
  const envContent = fs.readFileSync(envPath, 'utf-8')
  
  // Verificar OPENAI_API_KEY
  console.log('\n2️⃣ Verificando OPENAI_API_KEY...')
  if (envContent.includes('OPENAI_API_KEY=') && !envContent.includes('OPENAI_API_KEY=sk-your-')) {
    console.log('   ✅ OPENAI_API_KEY configurada')
  } else {
    console.log('   ❌ OPENAI_API_KEY não configurada ou usando valor placeholder')
    console.log('   📝 Adicione: OPENAI_API_KEY=sk-...')
    allChecksPass = false
  }
  
  // Verificar GOOGLE_APPLICATION_CREDENTIALS
  console.log('\n3️⃣ Verificando GOOGLE_APPLICATION_CREDENTIALS...')
  if (envContent.includes('GOOGLE_APPLICATION_CREDENTIALS=')) {
    const match = envContent.match(/GOOGLE_APPLICATION_CREDENTIALS=(.+)/m)
    if (match && match[1]) {
      const credPath = match[1].trim()
      const fullCredPath = path.join(process.cwd(), credPath)
      
      if (fs.existsSync(fullCredPath)) {
        console.log('   ✅ GOOGLE_APPLICATION_CREDENTIALS configurada')
        console.log(`   📄 Arquivo: ${credPath}`)
        
        // Verificar se o arquivo JSON é válido
        try {
          const credContent = JSON.parse(fs.readFileSync(fullCredPath, 'utf-8'))
          if (credContent.type === 'service_account' && credContent.private_key && credContent.project_id) {
            console.log('   ✅ Arquivo de credenciais válido')
          } else {
            console.log('   ⚠️ Arquivo de credenciais pode estar incompleto')
            allChecksPass = false
          }
        } catch (error) {
          console.log('   ❌ Arquivo de credenciais inválido (JSON malformado)')
          allChecksPass = false
        }
      } else {
        console.log(`   ❌ Arquivo de credenciais não encontrado: ${credPath}`)
        allChecksPass = false
      }
    }
  } else {
    console.log('   ❌ GOOGLE_APPLICATION_CREDENTIALS não configurada')
    console.log('   📝 Adicione: GOOGLE_APPLICATION_CREDENTIALS=./keys/google-vision.json')
    allChecksPass = false
  }
}

// Verificar se os pacotes necessários estão instalados
console.log('\n4️⃣ Verificando pacotes instalados...')
const packageJson = require(path.join(process.cwd(), 'package.json'))

const requiredPackages = [
  '@google-cloud/speech',
  'openai',
]

requiredPackages.forEach(pkg => {
  if (packageJson.dependencies[pkg]) {
    console.log(`   ✅ ${pkg} instalado (v${packageJson.dependencies[pkg]})`)
  } else {
    console.log(`   ❌ ${pkg} NÃO instalado`)
    console.log(`   📝 Execute: npm install ${pkg}`)
    allChecksPass = false
  }
})

// Verificar se os arquivos da funcionalidade existem
console.log('\n5️⃣ Verificando arquivos da funcionalidade...')
const requiredFiles = [
  'components/VoiceRecorder.tsx',
  'app/api/speech-to-text/route.ts',
  'app/api/extract-procedure-fields/route.ts',
]

requiredFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file)
  if (fs.existsSync(filePath)) {
    console.log(`   ✅ ${file}`)
  } else {
    console.log(`   ❌ ${file} não encontrado`)
    allChecksPass = false
  }
})

// Resultado final
console.log('\n' + '='.repeat(60))
if (allChecksPass) {
  console.log('✅ TODAS AS VERIFICAÇÕES PASSARAM!')
  console.log('\n🎉 O sistema de cadastro por voz está pronto para uso!')
  console.log('\n📖 Consulte docs/CADASTRO_POR_VOZ.md para mais informações')
  process.exit(0)
} else {
  console.log('❌ ALGUMAS VERIFICAÇÕES FALHARAM')
  console.log('\n🔧 Corrija os problemas acima antes de usar o cadastro por voz')
  console.log('📖 Consulte docs/CADASTRO_POR_VOZ.md para instruções de configuração')
  process.exit(1)
}

