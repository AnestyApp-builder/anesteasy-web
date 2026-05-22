import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { logger } from '@/lib/logger';
import { validateMetaSignature, sendWhatsAppMessage, sendWhatsAppButtons, markMessageAsRead } from '@/lib/providers/whatsapp/meta';
import { supabaseAdmin } from '@/lib/supabase-server';
import { processWhatsAppMessage } from '@/lib/queue/processor';
import { MetaWebhookBody } from '@/types/meta';
import { decrypt, encrypt } from '@/lib/security';
import { adminNotifier } from '@/lib/notifications/admin-service';

export const runtime = 'nodejs';
export const maxDuration = 60; // Aumentar para suportar processamento inicial se necessário

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN;

/**
 * GET /api/whatsapp/webhook
 * Verificação do webhook da Meta
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    logger.info('Webhook verified successfully');
    return new NextResponse(challenge, { status: 200 });
  }

  logger.warn('Webhook verification failed');
  return new NextResponse('Forbidden', { status: 403 });
}

/**
 * POST /api/whatsapp/webhook
 * Recebimento de mensagens e lógica de negócio
 */
export async function POST(req: NextRequest) {
  const payload = await req.text();
  const signature = req.headers.get('x-hub-signature-256') || '';

  // 0. Registro de Log Bruto (Auditoria & Debug)
  try {
    await supabaseAdmin.from('webhook_logs').insert({
      payload: JSON.parse(payload)
    });
  } catch (e) {
    logger.error('Erro ao salvar webhook_log', e);
  }


  // 1. Validar assinatura (Segurança Profissional)
  // Usamos o APP_SECRET para validar o HMAC
  if (!validateMetaSignature(payload, signature)) {
    logger.error('Invalid signature in webhook request');
    // return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  logger.info(`Received webhook payload: ${payload.substring(0, 200)}...`);

  let body: MetaWebhookBody;
  try {
    body = JSON.parse(payload);
  } catch (e) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Ignorar eventos sem corpo útil
  const value = body.entry?.[0]?.changes?.[0]?.value;
  if (!value) return NextResponse.json({ status: 'ignored' });

  // 1. Filtrar Status Updates (Delivered, Read, etc) - OTMIZAÇÃO 
  if (value.statuses) {
    return NextResponse.json({ status: 'ignored_status_update' });
  }

  const message = value.messages?.[0];
  if (!message) {
    return NextResponse.json({ status: 'no_message' });
  }

  const messageId = message.id;
  const from = message.from;

  logger.info(`Processing message ${messageId} from ${from} type ${message.type}`);

  // 1.5 Marcar como lida e simular presença (Profissionalismo)
  try {
    await markMessageAsRead(messageId);
  } catch (e) {
    logger.error(`Error marking message as read: ${e}`);
  }

  try {
    // 2. Idempotência Otimizada (Single Query)
    // Tentamos inserir direto. Se falhar por duplicidade, o registro já existe.
    const { error: insertError } = await supabaseAdmin
      .from('processed_webhooks')
      .insert({
        event_id: messageId,
        status: 'pending'
      });

    if (insertError) {
      if (insertError.code === '23505') { // Unique violation
        logger.info(`Message ${messageId} already processed.`);
        return NextResponse.json({ status: 'already_processed' });
      }
      throw insertError;
    }

    // 3. Registrar a mensagem no histórico (Inbox)
    const { data: account } = await supabaseAdmin
      .from('whatsapp_accounts')
      .select('user_id')
      .eq('phone_number', from)
      .eq('verified', true)
      .maybeSingle();

    const textContent = message.type === 'text' 
      ? message.text?.body 
      : (message.type === 'interactive' 
        ? message.interactive?.button_reply?.title 
        : (message.type === 'image' ? '📷 [Foto da Ficha]' : `[Mídia: ${message.type}]`));

    await supabaseAdmin.from('whatsapp_messages').insert({
      wamid: messageId,
      user_id: account?.user_id || null,
      phone_number: from,
      message_type: message.type,
      text_content: textContent,
      direction: 'inbound',
      status: 'received',
      media_id: message.type === 'image' ? message.image?.id : (message.type === 'document' ? message.document?.id : null)
    });

    // 4. Lógica de Mensagem (Texto ou Botões)
    if (message.type === 'text' || message.type === 'interactive') {
      let text = '';
      if (message.type === 'text') {
        text = message.text?.body?.trim() || '';
      } else if (message.type === 'interactive') {
        // Mapear IDs de botões para comandos de texto (Compatibilidade)
        const buttonId = message.interactive?.button_reply?.id;
        if (buttonId === 'continue_flow') text = '1';
        else if (buttonId === 'new_flow') text = '2';
        else if (buttonId === 'confirm_name' || buttonId === 'confirm_anesthesia' || buttonId === 'confirm_procedure' || buttonId === 'confirm_hospital' || buttonId === 'confirm_surgeon' || buttonId === 'sec_yes') text = 'SIM';
        else if (buttonId === 'change_name' || buttonId === 'change_anesthesia' || buttonId === 'change_procedure' || buttonId === 'change_hospital' || buttonId === 'change_surgeon' || buttonId === 'sec_no') text = 'ALTERAR';
        else if (buttonId === 'empty_surgeon') text = 'VAZIO';
        else text = message.interactive?.button_reply?.title || '';
      }
      
      const textLower = text.toLowerCase();

      // --- VINCULAÇÃO (Código de 6 dígitos) ---
      if (/^\d{6}$/.test(text)) {
        await handleDoctorLinking(from, text);
        return NextResponse.json({ status: 'linking_processed' });
      }

      // Buscar se existe conta verificada
      const { data: account } = await supabaseAdmin
        .from('whatsapp_accounts')
        .select('user_id')
        .eq('phone_number', from)
        .eq('verified', true)
        .maybeSingle();

      if (!account) {
        // --- FALLBACK PARA USUÁRIO NÃO VINCULADO ---
        await sendWhatsAppMessage(from, "🤖 *Agente pessoal - AnestEasy*:\n\nOlá! 👋 Notamos que seu número ainda não está vinculado ao sistema. Estou encaminhando seu contato para meu Supervisor para te ajudar.");
        
        const adminNumber = process.env.ADMIN_WHATSAPP_NUMBER;
        if (adminNumber) {
          const adminMsg = `👨‍💼 *Novo Contato Desconhecido*\n\n📱 *Número:* ${from}\n💬 *Mensagem:* ${text}`;
          await sendWhatsAppMessage(adminNumber, adminMsg);
        }
        return NextResponse.json({ status: 'unlinked_user_handled' });
      }

      // Se existe conta, buscar extração pendente em qualquer etapa do fluxo
      const { data: extraction } = await supabaseAdmin
        .from('whatsapp_extractions')
        .select('*')
        .eq('user_id', account.user_id)
        .in('status', ['awaiting_name', 'awaiting_anesthesia', 'awaiting_procedure', 'awaiting_hospital', 'awaiting_surgeon', 'awaiting_secretary', 'awaiting_confirmation', 'awaiting_decision'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // --- DETECÇÃO DE SAUDAÇÃO ---
      const greetings = ['oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'opa', 'hey', 'hello', 'ajuda', 'ajudar'];
      const isGreeting = greetings.includes(textLower);

      if (extraction) {
        // Se for saudação e houver pendência, perguntar o que fazer
        if (isGreeting) {
          const fields = typeof extraction.extracted_fields === 'string' 
            ? JSON.parse(decrypt(extraction.extracted_fields)) 
            : (extraction.extracted_fields || {});
          
          const paciente = fields.nome_do_paciente || fields.paciente || 'Não identificado';
          
          await sendWhatsAppButtons(from, `👋 Olá! Vi que você tem um registro pendente do paciente *${paciente}*.\n\nComo deseja prosseguir?`, [
            { id: 'continue_flow', title: 'Continuar Registro' },
            { id: 'new_flow', title: 'Iniciar Novo' }
          ]);
          
          // Mudar para um estado temporário de decisão
          await supabaseAdmin.from('whatsapp_extractions').update({ status: 'awaiting_decision' }).eq('id', extraction.id);
          return NextResponse.json({ status: 'greeting_with_pending_handled' });
        }

        // 1. Descriptografar campos para manipulação
          let fields: any = {};
          if (typeof extraction.extracted_fields === 'string') {
            try {
              const decrypted = decrypt(extraction.extracted_fields);
              fields = JSON.parse(decrypted);
            } catch (e) {
              logger.error('Erro ao descriptografar campos', e);
              fields = extraction.extracted_fields;
            }
          } else {
            fields = extraction.extracted_fields || {};
          }

          // 2. Lógica de Cancelamento (Universal)
          if (['cancelar', '❌', '0', 'parar'].includes(textLower)) {
            await supabaseAdmin.from('whatsapp_extractions').update({ status: 'cancelled' }).eq('id', extraction.id);
            await sendWhatsAppMessage(from, "🗑️ *Registro cancelado.* Se precisar, é só enviar uma nova foto!");
            return NextResponse.json({ status: 'cancelled' });
          }

          // 3. Gerenciador de Estados (Fluxo Guiado)
          
          // ETAPA: CONFIRMAÇÃO DE NOME
          if (extraction.status === 'awaiting_name' || extraction.status === 'awaiting_confirmation') {
            if (textLower === 'alterar') {
              await sendWhatsAppMessage(from, "✍️ Entendido! Por favor, digite o *nome correto* do paciente:");
              return NextResponse.json({ status: 'awaiting_new_name' });
            }

            if (!['sim', 's', 'ok', 'confirmar', '✅', '1'].includes(textLower)) {
              fields.nome_do_paciente = text; // Usuário enviou um novo nome
            }
            
            await supabaseAdmin.from('whatsapp_extractions').update({ 
              extracted_fields: encrypt(JSON.stringify(fields)) as any,
              status: 'awaiting_anesthesia'
            }).eq('id', extraction.id);

            const anestesiaSugerida = fields.tecnica_anestesica || fields.tecnica || '';
            
            if (anestesiaSugerida && anestesiaSugerida !== 'Não identificado') {
              await sendWhatsAppButtons(from, `💉 Identifiquei a anestesia: *${anestesiaSugerida}*.\n\nConfirma ou deseja alterar?`, [
                { id: 'confirm_anesthesia', title: '✅ Sim, confirmar' },
                { id: 'change_anesthesia', title: '✏️ Alterar anestesia' }
              ]);
            } else {
              await sendWhatsAppMessage(from, "💉 Ótimo! Agora me diga, qual foi a *técnica anestésica* utilizada? (Ex: Geral, Raqui, Sedação, Bloqueio...)");
            }
            return NextResponse.json({ status: 'name_confirmed' });
          }

          // ETAPA: TIPO DE ANESTESIA
          if (extraction.status === 'awaiting_anesthesia') {
            if (textLower === 'alterar') {
              await sendWhatsAppMessage(from, "💉 Entendido! Qual foi a *técnica anestésica* utilizada?");
              return NextResponse.json({ status: 'awaiting_new_anesthesia' });
            }

            if (!['sim', 's', 'ok', 'confirmar', '✅', '1'].includes(textLower)) {
              fields.tecnica = text;
              fields.tecnica_anestesica = text;
            } else {
              // Confirmou a sugestão da IA
              fields.tecnica = fields.tecnica_anestesica || fields.tecnica || 'Geral';
            }

            const procSugerido = fields.procedimento || fields.cirurgia || '';
            
            await supabaseAdmin.from('whatsapp_extractions').update({ 
              extracted_fields: encrypt(JSON.stringify(fields)) as any,
              status: 'awaiting_procedure'
            }).eq('id', extraction.id);

            if (procSugerido && procSugerido !== 'Não identificado') {
              await sendWhatsAppButtons(from, `📝 Identifiquei o procedimento: *${procSugerido}*.\n\nConfirma ou deseja alterar?`, [
                { id: 'confirm_procedure', title: '✅ Sim, confirmar' },
                { id: 'change_procedure', title: '✏️ Alterar cirurgia' }
              ]);
            } else {
              await sendWhatsAppMessage(from, "🧐 Qual foi o *procedimento* (cirurgia) realizado?");
            }
            return NextResponse.json({ status: 'anesthesia_saved' });
          }

          // ETAPA: CONFIRMAÇÃO DE PROCEDIMENTO
          if (extraction.status === 'awaiting_procedure') {
            if (textLower === 'alterar') {
              await sendWhatsAppMessage(from, "🧐 Entendido! Qual foi o *procedimento* (cirurgia) realizado?");
              return NextResponse.json({ status: 'awaiting_new_procedure' });
            }

            if (!['sim', 's', 'ok', 'confirmar', '✅', '1'].includes(textLower)) {
              fields.procedimento = text;
            }

            await supabaseAdmin.from('whatsapp_extractions').update({ 
              extracted_fields: encrypt(JSON.stringify(fields)) as any,
              status: 'awaiting_hospital'
            }).eq('id', extraction.id);

            const hospitalSugerido = fields.hospital || fields.local || '';
            
            if (hospitalSugerido && hospitalSugerido !== 'Não identificado') {
              await sendWhatsAppButtons(from, `🏥 Identifiquei o Hospital: *${hospitalSugerido}*.\n\nConfirma ou deseja alterar?`, [
                { id: 'confirm_hospital', title: '✅ Sim, confirmar' },
                { id: 'change_hospital', title: '✏️ Alterar hospital' }
              ]);
            } else {
              await sendWhatsAppMessage(from, "🏥 Qual foi o *Hospital* ou Clínica?");
            }
            return NextResponse.json({ status: 'procedure_confirmed_awaiting_hospital' });
          }

          // ETAPA: HOSPITAL
          if (extraction.status === 'awaiting_hospital') {
            if (textLower === 'alterar') {
              await sendWhatsAppMessage(from, "🏥 Entendido! Qual o nome do *Hospital/Clínica*?");
              return NextResponse.json({ status: 'awaiting_new_hospital' });
            }

            if (!['sim', 's', 'ok', 'confirmar', '✅', '1'].includes(textLower)) {
              fields.hospital = text;
            }

            await supabaseAdmin.from('whatsapp_extractions').update({ 
              extracted_fields: encrypt(JSON.stringify(fields)) as any,
              status: 'awaiting_surgeon'
            }).eq('id', extraction.id);

            const cirurgiaoSugerido = fields.cirurgiao || fields.surgeon_name || fields.medico || '';
            
            if (cirurgiaoSugerido && cirurgiaoSugerido !== 'Não identificado') {
              await sendWhatsAppButtons(from, `👨‍⚕️ Identifiquei o Cirurgião: *${cirurgiaoSugerido}*.\n\nComo deseja prosseguir?`, [
                { id: 'confirm_surgeon', title: '✅ Confirmar' },
                { id: 'change_surgeon', title: '✏️ Digitar nome' },
                { id: 'empty_surgeon', title: '⚪ Deixar vazio' }
              ]);
            } else {
              await sendWhatsAppButtons(from, "👨‍⚕️ Qual o nome do *Cirurgião*?", [
                { id: 'change_surgeon', title: '✏️ Digitar nome' },
                { id: 'empty_surgeon', title: '⚪ Deixar vazio' }
              ]);
            }
            return NextResponse.json({ status: 'hospital_confirmed_awaiting_surgeon' });
          }

          // ETAPA: CIRURGIÃO
          if (extraction.status === 'awaiting_surgeon') {
            if (textLower === 'alterar' || textLower === 'digitar nome') {
              await sendWhatsAppMessage(from, "👨‍⚕️ Por favor, digite o nome do *Cirurgião*:");
              return NextResponse.json({ status: 'awaiting_new_surgeon' });
            }

            if (textLower === 'vazio' || textLower === 'deixar vazio') {
              fields.cirurgiao = '';
              fields.surgeon_name = '';
            } else if (!['sim', 's', 'ok', 'confirmar', '✅', '1'].includes(textLower)) {
              fields.cirurgiao = text;
              fields.surgeon_name = text;
            }

            await supabaseAdmin.from('whatsapp_extractions').update({ 
              extracted_fields: encrypt(JSON.stringify(fields)) as any,
              status: 'awaiting_secretary'
            }).eq('id', extraction.id);

            await sendWhatsAppButtons(from, "🤝 *Deseja disponibilizar este procedimento no link seguro da secretária?*", [
              { id: 'sec_yes', title: 'Sim, permitir' },
              { id: 'sec_no', title: 'Não, manter privado' }
            ]);
            return NextResponse.json({ status: 'surgeon_confirmed_awaiting_secretary' });
          }

          // ETAPA: ESCOLHA DA SECRETÁRIA (Finalização)
          if (extraction.status === 'awaiting_secretary') {
            await handleSecretarySelection(from, text, { ...extraction, extracted_fields: fields });
            return NextResponse.json({ status: 'flow_completed' });
          }

          // ETAPA: DECISÃO (CONTINUAR OU NOVO)
          if (extraction.status === 'awaiting_decision') {
            if (['2', 'novo', 'iniciar novo', 'cancelar'].includes(textLower)) {
              await supabaseAdmin.from('whatsapp_extractions').update({ status: 'cancelled' }).eq('id', extraction.id);
              await sendWhatsAppMessage(from, "✅ Registro anterior cancelado. Pode me enviar a foto da nova ficha quando quiser! 📸");
              return NextResponse.json({ status: 'new_started' });
            } else {
              // Voltar para o estado anterior (tentar deduzir ou resetar para name)
              await supabaseAdmin.from('whatsapp_extractions').update({ status: 'awaiting_name' }).eq('id', extraction.id);
              await sendGenericHelp(from, { ...extraction, status: 'awaiting_name' });
              return NextResponse.json({ status: 'continued' });
            }
          }
        }

      // --- MENSAGEM GENÉRICA (SEM PENDÊNCIA) ---
      await sendGenericHelp(from);
      return NextResponse.json({ status: 'help_sent' });
    }

    // 4. Lógica de Imagem/Documento (OCR Profissional)
    if (message.type === 'image' || message.type === 'document') {
      // Verificar vínculo antes de processar mídia pesada
      const { data: account } = await supabaseAdmin
        .from('whatsapp_accounts')
        .select('user_id')
        .eq('phone_number', from)
        .eq('verified', true)
        .maybeSingle();

      if (!account) {
        await sendWhatsAppMessage(from, "🤖 *Agente pessoal - AnestEasy*:\n\nOlá! 👋 Para processar fotos de fichas, seu número precisa estar vinculado. Estou encaminhando sua solicitação para meu Supervisor.");
        
        const adminNumber = process.env.ADMIN_WHATSAPP_NUMBER;
        if (adminNumber) {
          const adminMsg = `👨‍💼 *Novo Contato (Mídia) Desconhecido*\n\n📱 *Número:* ${from}\n📎 *Tipo:* ${message.type}`;
          await sendWhatsAppMessage(adminNumber, adminMsg);
        }
        return NextResponse.json({ status: 'unlinked_media_handled' });
      }

      // Disparar processamento assíncrono profissional
      waitUntil(processWhatsAppMessage(message));
      
      // Feedback imediato
      await sendWhatsAppMessage(from, "📸 *Recebi sua ficha!*\n\nJá estou analisando os dados com IA. Isso pode levar alguns segundos...🩺🚀");
      
      return NextResponse.json({ status: 'processing_started' });
    }

    return NextResponse.json({ status: 'type_not_supported' });

  } catch (error: any) {
    logger.error(`Critical error in webhook: ${error.message}`);
    
    // Notificar administrador sobre erro crítico no webhook usando o novo serviço
    const from = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from || 'desconhecido';
    await adminNotifier.notifyError(from, error, 'Webhook (POST)');

    return NextResponse.json({ error: error.message }, { status: 200 });
  }
}

/**
 * Helpers de Lógica de Negócio (Legado Integrado)
 */

async function handleDoctorLinking(from: string, code: string) {
  const { data: pending } = await supabaseAdmin
    .from('whatsapp_accounts')
    .select('id, user_id, verification_expires_at')
    .eq('verification_code', code)
    .eq('verified', false)
    .maybeSingle();

  if (pending) {
    if (pending.verification_expires_at && new Date(pending.verification_expires_at) < new Date()) {
      await sendWhatsAppMessage(from, "⏰ Este código expirou. Gere um novo no app.");
      return;
    }

    await supabaseAdmin.from('whatsapp_accounts').update({
      phone_number: from,
      verified: true,
      verification_code: null,
      verification_expires_at: null,
      updated_at: new Date().toISOString()
    }).eq('id', pending.id);

    const { data: user } = await supabaseAdmin.from('users').select('name').eq('id', pending.user_id).single();
    
    await sendWhatsAppMessage(from, `✅ *Vinculação concluída!*\n\nOlá, ${user?.name || 'Doutor'}! Seu WhatsApp está conectado.\n\n📸 Agora é só enviar fotos de fichas anestésicas!`);
  } else {
    await sendWhatsAppMessage(from, "❌ Código inválido. Verifique no app em *Configurações > WhatsApp*.");
  }
}



async function handleSecretarySelection(from: string, text: string, extraction: any) {
  const { data: account } = await supabaseAdmin.from('whatsapp_accounts').select('user_id').eq('phone_number', from).eq('verified', true).maybeSingle();
  if (!account) return;

  const textLower = text.trim().toLowerCase();
  let showToSecretary = true;

  if (['1', 'sim', 's', 'yes', 'y', 'confirmar', '✅', 'com certeza', 'claro', 'pode ser'].includes(textLower)) {
    showToSecretary = true;
  } else if (['2', '0', 'nao', 'não', 'n', 'no', 'cancelar', '❌', 'não vincular'].includes(textLower)) {
    showToSecretary = false;
  } else {
    await sendWhatsAppMessage(from, "⚠️ Opção inválida. Digite *1* (Sim) ou *2* (Não) para vincular à secretária.");
    return;
  }

  // Finalizar salvamento do procedimento
  const f = extraction.extracted_fields as any;
  const formattedDate = formatOCRDate(f.data_da_cirurgia || f.data || f.data_procedimento);

    const { data: proc, error } = await supabaseAdmin.from('procedures').insert({
      user_id: account.user_id,
      patient_name: encrypt(f.nome_do_paciente || f.paciente || f.nome || 'Não identificado'),
      procedure_name: f.procedimento || f.cirurgia || f.procedure || 'Não identificado',
      tecnica_anestesica: f.tecnica || '',
      procedure_type: 'Anestesia',
      procedure_date: formattedDate,
      hospital_clinic: f.hospital || f.local || '',
      surgeon_name: f.cirurgião || f.cirurgiao || f.medico || '',
      convenio: f.convenio || '',
      carteirinha: f.carteirinha || '',
      procedure_value: 0,
      payment_status: 'pending',
      show_to_secretary: showToSecretary
    }).select().single();

  if (error) {
    logger.error('Error inserting procedure', error);
    await sendWhatsAppMessage(from, "⚠️ Tive um erro técnico ao salvar o procedimento no banco.");
    return;
  }

  if (proc) {
    await supabaseAdmin.from('whatsapp_extractions').update({ status: 'confirmed', procedure_id: proc.id }).eq('id', extraction.id);
    
    const summary = `✅ *PROCEDIMENTO REGISTRADO!* 🚀\n\n` +
                   `👤 *Paciente:* ${f.nome_do_paciente || 'Não identificado'}\n` +
                   `💉 *Anestesia:* ${f.tecnica || 'Não informada'}\n` +
                   `📝 *Cirurgia:* ${f.procedimento || 'Não informada'}\n` +
                   `🏥 *Local:* ${f.hospital || 'Não informado'}\n\n` +
                   (showToSecretary 
                     ? `🤝 _Disponível para a secretária._` 
                     : `🔒 _Registro privado (apenas você vê)._`);

    await sendWhatsAppMessage(from, summary);
  }
}

async function sendGenericHelp(from: string, extraction?: any) {
  if (extraction) {
    let msg = "👋 Olá! Vi que você tem um registro em andamento. ";
    
    switch (extraction.status) {
      case 'awaiting_name':
      case 'awaiting_confirmation':
        msg += "\n\n*Confirma o nome do paciente?* Digite *SIM* ou o *NOME CORRETO*.";
        break;
      case 'awaiting_anesthesia':
        msg += "\n\n*Qual foi a técnica anestésica utilizada?* (Ex: Geral, Raqui...)";
        break;
      case 'awaiting_procedure':
        msg += "\n\n*Confirma o procedimento?* Digite *SIM* ou o *PROCEDIMENTO CORRETO*.";
        break;
      case 'awaiting_hospital':
        msg += "\n\n*Qual o nome do Hospital ou Clínica?*";
        break;
      case 'awaiting_surgeon':
        msg += "\n\n*Qual o nome do Cirurgião?* Você também pode escolher *Deixar Vazio*.";
        break;
      case 'awaiting_secretary':
        msg += "\n\n*Deseja enviar para a secretária?* Digite *1* (Sim) ou *2* (Não).";
        break;
      default:
        msg += "\n\nComo posso te ajudar agora? Digite *CANCELAR* para recomeçar.";
    }
    
    await sendWhatsAppMessage(from, msg);
  } else {
    await sendWhatsAppMessage(from, "👋 Olá! Sou o assistente da *AnestEasy*.\n\nPara registrar um procedimento, basta me enviar uma *foto da ficha anestésica* ou da etiqueta do paciente. Estou pronto para ajudar! 📸");
  }
}

/**
 * Helper para formatar data do OCR (DD/MM/YYYY para YYYY-MM-DD)
 */
function formatOCRDate(rawDate: any): string {
  let formattedDate = new Date().toISOString().split('T')[0];
  
  if (rawDate && typeof rawDate === 'string' && rawDate.includes('/')) {
    const parts = rawDate.split('/');
    if (parts.length === 3) {
      const day = parts[0].replace(/\D/g, '').substring(0, 2).padStart(2, '0');
      const month = parts[1].replace(/\D/g, '').substring(0, 2).padStart(2, '0');
      const year = parts[2].replace(/\D/g, '').substring(0, 4);
      
      if (/^\d{4}$/.test(year) && /^\d{2}$/.test(month) && /^\d{2}$/.test(day)) {
        formattedDate = `${year}-${month}-${day}`;
      }
    }
  }
  
  return formattedDate;
}
