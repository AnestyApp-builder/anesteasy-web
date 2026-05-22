import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getMediaUrl, downloadMedia, sendWhatsAppMessage, sendWhatsAppButtons } from '@/lib/providers/whatsapp/meta';
import { detectDocumentType, structureOCRData, processImageWithOpenAI } from '@/lib/providers/llm/openai';
import { isValidImage } from '@/utils/base64';
import { MetaMessage } from '@/types/meta';
import { encrypt } from '@/lib/security';
import { adminNotifier } from '@/lib/notifications/admin-service';

/**
 * Processador principal (Worker) para mensagens do WhatsApp
 * Fluxo: Download -> OpenAI Vision Extraction -> Database Persistence
 */
export async function processWhatsAppMessage(message: MetaMessage) {
  const messageId = message.id;
  const phone = message.from;
  
  logger.info(`Starting professional processing for message ${messageId} from ${phone}`);

  try {
    // 1. Buscar usuário vinculado a este número
    const { data: account } = await supabaseAdmin
      .from('whatsapp_accounts')
      .select('user_id')
      .eq('phone_number', phone)
      .eq('verified', true)
      .maybeSingle();

    if (!account) {
      logger.warn(`Phone ${phone} not linked to any user. Aborting OCR.`);
      return;
    }

    // 2. Atualizar status para 'processing'
    await supabaseAdmin
      .from('processed_webhooks')
      .update({ status: 'processing' })
      .eq('event_id', messageId);

    let rawText = '';
    let docType = 'unknown';
    let structuredData = null;
    let costLlm = 0;

    // 3. Processamento de Imagem
    if (message.type === 'image' && message.image) {
      const mediaId = message.image.id;
      
      // Download em memória
      const mediaInfo = await getMediaUrl(mediaId);
      const buffer = await downloadMedia(mediaInfo.url);
      
      if (!isValidImage(buffer)) {
        throw new Error('Formato de imagem inválido');
      }

      logger.info(`Starting OpenAI Vision processing for ${mediaId}`);
      const visionResult = await processImageWithOpenAI(buffer);
      
      rawText = visionResult.rawText;
      structuredData = visionResult.structuredData;
      docType = visionResult.docType;
      costLlm = 0.01; // Custo estimado Vision
    }

    // 4. Salvar resultados (Criptografado para LGPD)
    await supabaseAdmin.from('ocr_messages').insert({
      phone,
      media_id: message.type === 'image' ? message.image?.id : null,
      raw_text: encrypt(rawText),
      structured_data: encrypt(JSON.stringify(structuredData)) as any,
      doc_type: docType,
      status: 'completed',
      cost_llm: costLlm
    });

    // 5. Salvar na tabela de extrações para confirmação (Criptografado)
    if (rawText && structuredData) {
      // Limpar extrações pendentes anteriores deste usuário
      await supabaseAdmin
        .from('whatsapp_extractions')
        .update({ status: 'cancelled' })
        .eq('user_id', account.user_id)
        .eq('status', 'awaiting_confirmation');

      const { error: extError } = await supabaseAdmin.from('whatsapp_extractions').insert({
        user_id: account.user_id,
        raw_ocr_text: encrypt(rawText),
        extracted_fields: encrypt(JSON.stringify(structuredData)) as any,
        status: 'awaiting_name',
        overall_confidence: 0.95
      });

      if (extError) {
        logger.error('Error saving to whatsapp_extractions', extError);
        throw extError;
      }

      // 6. Responder usuário
      // Mapear campos comuns que a IA pode retornar
      const nomePaciente = structuredData.nome_do_paciente || structuredData.paciente || structuredData.nome || 'Não identificado';

      const resumo = `📋 *Ficha Analisada!*\n\n*Paciente:* ${nomePaciente}\n\nConfirma o nome do paciente ou deseja alterar?`;
      
      await sendWhatsAppButtons(phone, resumo, [
        { id: 'confirm_name', title: '✅ Sim, confirmar' },
        { id: 'change_name', title: '✏️ Alterar nome' }
      ]);
    } else {
      await sendWhatsAppMessage(phone, "❌ Não consegui ler os dados desta imagem. Por favor, tente enviar uma foto mais nítida.");
    }

    // 7. Marcar como concluído
    await supabaseAdmin
      .from('processed_webhooks')
      .update({ status: 'completed' })
      .eq('event_id', messageId);

  } catch (error: any) {
    logger.error(`Error processing message ${messageId}`, error);
    
    await supabaseAdmin
      .from('processed_webhooks')
      .update({ status: 'failed' })
      .eq('event_id', messageId);

    // Salvar erro detalhado
    await supabaseAdmin.from('ocr_messages').insert({
      phone,
      status: 'failed',
      error_log: error.message || String(error)
    });

    await adminNotifier.notifyError(phone, error, 'Processador OCR (IA)');

    await sendWhatsAppMessage(phone, "⚠️ Tive um problema ao processar sua imagem. Por favor, tente novamente em instantes.");
  }
}
