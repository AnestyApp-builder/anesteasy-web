import { NextRequest, NextResponse } from 'next/server'

/**
 * Teste SMTP direto usando NodeMailer
 * Este teste tenta enviar um email diretamente usando as credenciais SMTP
 * sem passar pelo Supabase Auth
 */

export async function POST(request: NextRequest) {
  try {
    const { email, smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom } = await request.json()

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email é obrigatório' },
        { status: 400 }
      )
    }

    // Se não forneceu credenciais SMTP, usar as do ambiente
    const host = smtpHost || process.env.SMTP_HOST || 'smtpout.secureserver.net'
    const port = smtpPort || parseInt(process.env.SMTP_PORT || '587')
    const user = smtpUser || process.env.SMTP_USER
    const pass = smtpPass || process.env.SMTP_PASS
    const from = smtpFrom || process.env.SMTP_FROM || user

    if (!user || !pass) {
      return NextResponse.json({
        success: false,
        error: 'Credenciais SMTP não fornecidas',
        message: 'Configure SMTP_USER e SMTP_PASS nas variáveis de ambiente ou envie no corpo da requisição',
        required: {
          smtpHost: 'Host SMTP (ex: smtpout.secureserver.net)',
          smtpPort: 'Porta SMTP (ex: 587)',
          smtpUser: 'Usuário SMTP (seu email completo)',
          smtpPass: 'Senha SMTP',
          smtpFrom: 'Email remetente (opcional, usa smtpUser se não fornecido)'
        }
      }, { status: 400 })
    }

    // Tentar enviar email usando fetch para um serviço de teste SMTP
    // Nota: Em produção, você deve usar uma biblioteca como nodemailer
    // Mas como estamos no Next.js, vamos usar uma abordagem diferente
    
    return NextResponse.json({
      success: false,
      error: 'Teste SMTP direto não implementado no servidor',
      message: 'Para testar SMTP diretamente, você precisa:',
      options: [
        {
          name: 'Opção 1: Verificar logs do Supabase',
          steps: [
            '1. Acesse Supabase Dashboard → Logs → Auth',
            '2. Procure por tentativas de envio de email',
            '3. Verifique se há erros de SMTP',
            '4. Os logs mostrarão se o email foi realmente enviado'
          ]
        },
        {
          name: 'Opção 2: Testar credenciais SMTP manualmente',
          steps: [
            '1. Use um cliente de email (Outlook, Thunderbird, Mail)',
            '2. Configure com as mesmas credenciais SMTP',
            '3. Tente enviar um email de teste',
            '4. Se funcionar no cliente, o problema está no Supabase',
            '5. Se não funcionar, as credenciais estão incorretas'
          ]
        },
        {
          name: 'Opção 3: Usar Edge Function com SMTP direto',
          steps: [
            '1. Crie uma Edge Function no Supabase',
            '2. Use uma biblioteca SMTP como nodemailer',
            '3. Configure as credenciais SMTP na Edge Function',
            '4. Teste o envio diretamente'
          ]
        }
      ],
      smtpInfo: {
        host,
        port,
        user: user ? `${user.substring(0, 3)}***` : 'Não fornecido',
        from: from || user
      }
    })

  } catch (error) {
    console.error('❌ Erro ao processar teste SMTP direto:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro ao processar teste',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}

