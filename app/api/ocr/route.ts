import 'server-only'
import { NextRequest, NextResponse } from "next/server";
import { ImageAnnotatorClient } from "@google-cloud/vision";
import sharp from "sharp";
import { logger } from "@/lib/logger";

// Configuração para Vercel (serverless)
export const runtime = 'nodejs';
export const maxDuration = 30; // 30 segundos (máximo permitido no plano Hobby)

// Validar credenciais
const validateCredentials = (credentials: any) => {
  // Validar campos obrigatórios
  if (!credentials.type || credentials.type !== 'service_account') {
    throw new Error("Tipo de credencial inválido. Deve ser 'service_account'");
  }
  
  if (!credentials.private_key) {
    throw new Error("Chave privada não encontrada nas credenciais");
  }
  
  if (!credentials.client_email) {
    throw new Error("Email da service account não encontrado nas credenciais");
  }
  
  // Validar formato básico da chave privada
  const privateKey = credentials.private_key;
  if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
    throw new Error("Formato da chave privada inválido. Deve começar com '-----BEGIN PRIVATE KEY-----'");
  }
  
  if (!privateKey.includes('-----END PRIVATE KEY-----')) {
    throw new Error("Formato da chave privada inválido. Deve terminar com '-----END PRIVATE KEY-----'");
  }
  
  return credentials;
};

// Verificar se as credenciais estão configuradas
const getVisionClient = () => {
  try {
    const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const projectId = process.env.PROJECT_ID;
    
    if (!projectId) {
      throw new Error("PROJECT_ID não configurado");
    }

    if (credentialsJson) {
      try {
        let credentials = JSON.parse(credentialsJson);
        credentials = validateCredentials(credentials);
        
        logger.info("[OCR] Credenciais validadas. Service Account:", credentials.client_email);
        
        return new ImageAnnotatorClient({
          credentials,
          projectId,
        });
      } catch (parseError: any) {
        logger.error("[OCR] Erro ao processar credenciais:", {
          message: parseError.message,
          name: parseError.name,
        });
        
        if (parseError.message?.includes('JSON')) {
          throw new Error("GOOGLE_APPLICATION_CREDENTIALS_JSON contém JSON inválido.");
        }
        
        throw new Error(`Erro ao processar credenciais: ${parseError.message}`);
      }
    }
    
    if (credentialsPath) {
      return new ImageAnnotatorClient({
        keyFilename: credentialsPath,
        projectId,
      });
    }

    throw new Error("Credenciais do Google Vision não configuradas.");
  } catch (error: any) {
    logger.error("[OCR] Erro ao criar cliente do Google Vision:", {
      message: error.message,
    });
    throw error;
  }
};

export async function POST(req: NextRequest) {
  try {
    logger.info("[OCR] Iniciando processamento...");

    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    logger.info("[OCR] Arquivo recebido:", {
      hasFile: !!file,
      fileName: file?.name,
      fileSize: file?.size,
    });

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Tipo de arquivo não suportado" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer as ArrayBuffer);

    logger.info("[OCR] Inicializando cliente...");
    const client = getVisionClient();

    let text = "";
    let confidence = 0;

    let processedBuffer: Buffer = buffer;
    try {
      const metadata = await sharp(buffer).metadata();
      if (metadata.width && metadata.width > 3000) {
        processedBuffer = await sharp(buffer)
          .resize(3000, null, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 90 })
          .toBuffer() as Buffer;
      } else if (metadata.format !== 'jpeg') {
        processedBuffer = await sharp(buffer).jpeg({ quality: 90 }).toBuffer() as Buffer;
      }
    } catch (sharpError) {
      logger.warn("Erro ao processar imagem com Sharp, usando original", sharpError);
      processedBuffer = buffer;
    }

    logger.info("[OCR] Chamando Google Vision API...");
    let result;
    try {
      [result] = await client.annotateImage({
        image: { content: processedBuffer },
        features: [{ type: 'DOCUMENT_TEXT_DETECTION' as const }]
      });
      logger.info("[OCR] Google Vision API respondeu com sucesso");
    } catch (visionError: any) {
      logger.error("[OCR] Erro na chamada do Google Vision API:", visionError.message);
      throw visionError;
    }

    const fullTextAnnotation = result.fullTextAnnotation;
    text = fullTextAnnotation?.text || "";
    confidence = fullTextAnnotation?.pages?.[0]?.confidence || 0;

    logger.info(`OCR processado: ${text.length} caracteres extraídos`);

    return NextResponse.json({ text, confidence });

  } catch (error: any) {
    logger.error("[OCR] Erro no OCR:", error.message);

    try {
      if (error.message?.includes("GOOGLE_APPLICATION_CREDENTIALS") || error.message?.includes("PROJECT_ID")) {
        return NextResponse.json({ error: "Configuração do Google Vision não encontrada" }, { status: 500 });
      }

      const errorInfo = {
        message: error.message,
        code: (error as any).code,
        status: (error as any).status,
      };
      logger.error("[OCR] Detalhes do erro:", errorInfo);

      return NextResponse.json({ 
        error: "Erro ao processar OCR",
        message: error.message || "Erro desconhecido"
      }, { status: 500 });
    } catch (jsonError) {
      logger.error("[OCR] Erro crítico na resposta:", jsonError);
      return new NextResponse(JSON.stringify({ error: "Erro interno" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
  }
}
