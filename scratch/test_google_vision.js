const { ImageAnnotatorClient } = require('@google-cloud/vision');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

async function test() {
  try {
    const creds = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    const projectId = process.env.PROJECT_ID;
    
    console.log('--- TESTE GOOGLE VISION ---');
    console.log('Project ID:', projectId);
    console.log('Client Email:', creds.client_email);
    
    const client = new ImageAnnotatorClient({ 
      credentials: creds, 
      projectId: projectId 
    });

    // Imagem 1x1 preta em base64
    const content = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    
    console.log('Enviando requisição para Google...');
    const [result] = await client.textDetection({
      image: { content: Buffer.from(content, 'base64') }
    });
    
    console.log('✅ SUCESSO! A API respondeu.');
    console.log('Texto encontrado (deve ser vazio para imagem preta):', result.fullTextAnnotation?.text || 'Nenhum texto');
  } catch (e) {
    console.log('❌ ERRO NA API:', e.message);
    if (e.code === 7) {
      console.log('⚠️ Erro de Permissão. Verifique se a API está ativa E se o Faturamento (Billing) está configurado.');
    }
  }
}

test();
