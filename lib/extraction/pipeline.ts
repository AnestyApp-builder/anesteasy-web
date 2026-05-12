import { WhatsAppClient } from "@/lib/whatsapp/client";
import { extractTextFromImage } from "./ocr";
import { parseFichaWithAI } from "@/utils/parseFichaAI";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function processWhatsAppMedia(messageId: string, mediaId: string, userId: string, phoneNumber: string) {
  try {
    // 1. Atualizar status da mensagem para processing
    await supabaseAdmin
      .from('whatsapp_messages')
      .update({ status: 'processing' })
      .eq('id', messageId);

    // 2. Obter URL de download e baixar imagem
    console.log('Step 2: Getting media URL...');
    const mediaUrl = await WhatsAppClient.getMediaUrl(mediaId);
    console.log('Step 2.1: Downloading media from:', mediaUrl);
    const imageBuffer = await WhatsAppClient.downloadMedia(mediaUrl);
    console.log('Step 2.2: Media downloaded, size:', imageBuffer.length);

    // 3. Upload para Supabase Storage (Privado)
    console.log('Step 3: Uploading to Supabase Storage...');
    const fileName = `${userId}/${messageId}.jpg`;
    const { data: storageData, error: storageError } = await supabaseAdmin.storage
      .from('whatsapp-media')
      .upload(fileName, imageBuffer, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (storageError) {
      console.error('Storage Error:', storageError);
      throw storageError;
    }
    console.log('Step 3.1: Upload successful');

    // 4. Inteligência Artificial Vision (OCR + Extração em um só passo)
    await WhatsAppClient.sendTextMessage(phoneNumber, "🤖 *Agente pessoal - AnestEasy*:\n👁️ Analisando imagem da ficha com IA...");
    console.log('Step 4: Starting AI Vision Analysis...');
    const { analyzeAnesthesiaRecordImage } = await import('@/lib/ai/vision-service');
    const extractedData = await analyzeAnesthesiaRecordImage(imageBuffer);
    console.log('Step 4.1: AI Vision finished');

    if (!extractedData) {
      throw new Error('AI Vision failed to extract data');
    }

    const ocrText = JSON.stringify(extractedData);
    const ocrConfidence = 0.95;

    // Importar ferramenta de segurança para LGPD
    const { encrypt } = await import('@/lib/security');

    // 6. Salvar na whatsapp_extractions
    await WhatsAppClient.sendTextMessage(phoneNumber, "🤖 *Agente pessoal - AnestEasy*:\n💾 Finalizando cadastro...");
    console.log('Step 6: Saving extraction to DB...');
    
    // Garantir que não quebre por causa do user_id inexistente
    const insertData: any = {
      message_id: messageId,
      raw_ocr_text: encrypt(ocrText),
      ocr_confidence: ocrConfidence,
      extracted_fields: encrypt(extractedData),
      image_storage_path: fileName,
      status: 'awaiting_confirmation'
    };

    if (userId) {
      insertData.user_id = userId;
    }

    let extraction = null;
    let { data: firstTry, error: extractionError } = await supabaseAdmin
      .from('whatsapp_extractions')
      .insert(insertData)
      .select()
      .single();

    extraction = firstTry;

    if (extractionError) {
      console.error('Extraction DB Error (Initial):', extractionError);
      
      // FALLBACK: Tentar salvar sem IDs de referência
      console.log('Step 6.1: Retrying without foreign keys...');
      const fallbackData = { ...insertData };
      delete fallbackData.message_id;
      delete fallbackData.user_id;
      
      const { data: fallbackExt, error: fallbackError } = await supabaseAdmin
        .from('whatsapp_extractions')
        .insert(fallbackData)
        .select()
        .single();
        
      if (fallbackError) {
        console.error('Fallback Extraction Error:', fallbackError);
        throw fallbackError;
      }
      extraction = fallbackExt;
    }

    // 7. Enviar Confirmação SIMPLES via WhatsApp
    console.log('Step 7: Sending simplified confirmation...');
    await WhatsAppClient.sendTextMessage(phoneNumber, "🤖 *Agente pessoal - AnestEasy*:\n✅ Cadastro Realizado com Sucesso!");
    console.log('Step 7.1: Confirmation sent');

    // 8. Finalizar status da mensagem
    await supabaseAdmin
      .from('whatsapp_messages')
      .update({ status: 'processed' })
      .eq('id', messageId);

    return extraction;
  } catch (error: any) {
    console.error("Pipeline processing failed:", error);
    
    // Notificar erro SIMPLES ao usuário
    try {
      const { WhatsAppClient } = await import('@/lib/whatsapp/client');
      await WhatsAppClient.sendTextMessage(
        phoneNumber,
        `❌ Erro no Cadastro. Por favor, tente novamente.`
      );
    } catch (sendError) {
      console.error('Failed to send error notification:', sendError);
    }
    
    // 8. Atualizar status para falha no banco
    await supabaseAdmin
      .from('whatsapp_messages')
      .update({ status: 'failed', error_message: error.message })
      .eq('id', messageId);
    
    // 9. Notificar administrador em caso de erro crítico
    const adminNumber = process.env.ADMIN_WHATSAPP_NUMBER;
    if (adminNumber) {
      try {
        // Tentar buscar o nome do usuário para um alerta mais amigável
        let userName = phoneNumber;
        if (userId) {
          const { data: userData } = await supabaseAdmin
            .from('users')
            .select('name')
            .eq('id', userId)
            .single();
          if (userData?.name) {
            userName = `${userData.name} (${phoneNumber})`;
          }
        }

        const errorMsg = `🚨 *Alerta de Erro - AnestEasy*\n\n👤 *Usuário:* ${userName}\n❌ *Erro:* ${error.message}\n🕒 *Data:* ${new Date().toLocaleString('pt-BR')}`;
        await WhatsAppClient.sendTextMessage(adminNumber, errorMsg);
      } catch (notifyError) {
        console.error('Falha ao notificar admin:', notifyError);
      }
    }

    throw error;
  }
}

function formatConfirmationMessage(data: any): string {
  return `📋 *Procedimento Identificado*

👤 *Paciente:* ${data.nome || 'Não identificado'}
🏥 *Hospital:* ${data.hospital || 'Não identificado'}
⚕️ *Procedimento:* ${data.procedimento || data.tipoProcedimento || 'Não identificado'}
📅 *Data:* ${data.dataProcedimento || 'Não identificada'}
🩺 *Cirurgião:* ${data.nomeCirurgiao || 'Não identificado'}
💊 *Técnica:* ${data.tecnica || 'Não identificada'}
🏷️ *Convênio:* ${data.convenio || 'Não identificado'}

Responda:
✅ *SIM* - Confirmar e criar
✏️ *EDITAR* - Ajustar no app
❌ *CANCELAR* - Descartar`;
}
