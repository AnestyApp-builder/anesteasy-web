/**
 * API Route para upload de arquivos de procedimento
 * Solução server-side para contornar problemas de CORS/XHR no mobile
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export async function POST(request: NextRequest) {
  try {
    // Verificar se as variáveis de ambiente estão configuradas
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Configuração do servidor incompleta' },
        { status: 500 }
      )
    }

    // Obter dados do formulário
    const formData = await request.formData()
    const file = formData.get('file') as File | Blob
    const userId = formData.get('userId') as string
    const filePath = formData.get('filePath') as string

    if (!file || !userId || !filePath) {
      return NextResponse.json(
        { error: 'Dados incompletos: file, userId e filePath são obrigatórios' },
        { status: 400 }
      )
    }

    // MOBILE FIX: Verificar se o arquivo está vazio
    const fileSize = file.size
    const fileName = file instanceof File ? file.name : 'uploaded-file'
    const fileType = file.type || 'application/octet-stream'


    if (fileSize === 0) {
      console.error(`[API-UPLOAD] ❌ Arquivo está vazio (0 bytes)`)
      return NextResponse.json(
        { error: 'Arquivo está vazio (0 bytes). Pode ser um problema de conversão no mobile.' },
        { status: 400 }
      )
    }

    // Criar cliente Supabase com service role (bypass RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Converter File/Blob para ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)


    // Fazer upload usando service role
    const { data, error } = await supabaseAdmin.storage
      .from('procedure-attachments')
      .upload(filePath, buffer, {
        contentType: fileType, // Usar fileType (pode ter sido corrigido no frontend)
        upsert: false,
        cacheControl: '3600'
      })

    if (error) {
      console.error(`[API-UPLOAD] Erro no upload:`, error)
      return NextResponse.json(
        { error: error.message || 'Erro ao fazer upload' },
        { status: 500 }
      )
    }

    // Obter URL pública
    const { data: urlData } = supabaseAdmin.storage
      .from('procedure-attachments')
      .getPublicUrl(filePath)


    return NextResponse.json({
      success: true,
      data: {
        path: data.path,
        id: data.id || '',
        fullPath: data.path,
        publicUrl: urlData.publicUrl
      }
    })
  } catch (error: any) {
    console.error(`[API-UPLOAD] Erro inesperado:`, error)
    return NextResponse.json(
      { error: error.message || 'Erro desconhecido ao fazer upload' },
      { status: 500 }
    )
  }
}

