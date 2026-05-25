import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import crypto from 'crypto'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    if (!email) return NextResponse.json({ success: true })

    const supabase = createAdminClient()

    const { data: secretary } = await supabase
      .from('secretarias')
      .select('id, nome, email, status')
      .eq('email', email.toLowerCase().trim())
      .eq('type', 'grupo')
      .eq('status', 'ativo')
      .maybeSingle()

    if (secretary) {
      const token = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hora

      await supabase
        .from('secretarias')
        .update({
          password_reset_token: token,
          password_reset_expires_at: expiresAt.toISOString()
        })
        .eq('id', secretary.id)

      const origin = request.headers.get('origin') ?? 'https://app.anesteasy.com.br'
      const resetUrl = `${origin}/secretaria/reset-password/${token}`

      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<body style="font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:0;">
  <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:12px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="background:#14b8a6;display:inline-block;padding:12px 20px;border-radius:10px;">
        <span style="color:white;font-size:20px;font-weight:bold;">AnestEasy</span>
      </div>
    </div>
    <h2 style="color:#1e293b;margin-bottom:8px;">Redefinição de senha</h2>
    <p style="color:#64748b;">Olá, <strong>${secretary.nome}</strong>!</p>
    <p style="color:#64748b;">Recebemos uma solicitação de redefinição de senha para a sua conta de secretária.</p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${resetUrl}" style="background:#14b8a6;color:white;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;font-size:16px;">
        Redefinir minha senha
      </a>
    </div>
    <p style="color:#94a3b8;font-size:13px;">Este link expira em <strong>1 hora</strong>.</p>
    <p style="color:#94a3b8;font-size:13px;">Se você não solicitou a redefinição, ignore este email — sua senha permanece inalterada.</p>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
    <p style="color:#94a3b8;font-size:12px;text-align:center;margin:0;">Equipe AnestEasy</p>
  </div>
</body>
</html>`

      const resendApiKey = process.env.RESEND_API_KEY
      if (resendApiKey) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'AnestEasy <noreply@anesteasy.com.br>',
            to: [secretary.email],
            subject: '🔑 Redefinição de senha — AnestEasy',
            html,
          }),
        })
      } else {
        console.warn('RESEND_API_KEY não configurada — email de reset não enviado')
      }
    }

    // Sempre retorna sucesso (não revela se o email existe ou não)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: true })
  }
}
