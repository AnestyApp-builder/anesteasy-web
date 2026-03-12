import { NextRequest, NextResponse } from "next/server";
import { ImageAnnotatorClient } from "@google-cloud/vision";
import sharp from "sharp";

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
    // Na Vercel, usar credenciais via variável de ambiente (JSON string)
    // Em desenvolvimento local, pode usar arquivo ou variável de ambiente
    const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const projectId = process.env.PROJECT_ID;
    
    if (!projectId) {
      throw new Error("PROJECT_ID não configurado");
    }

    // Priorizar JSON string (produção/Vercel)
    if (credentialsJson) {
      try {
        // Fazer parse do JSON
        let credentials = JSON.parse(credentialsJson);
        
        // Validar as credenciais
        credentials = validateCredentials(credentials);
        
        console.log("[OCR] Credenciais validadas. Service Account:", credentials.client_email);
        
        return new ImageAnnotatorClient({
          credentials,
          projectId,
        });
      } catch (parseError: any) {
        console.error("[OCR] Erro ao processar credenciais:", {
          message: parseError.message,
          name: parseError.name,
        });
        
        if (parseError.message?.includes('JSON')) {
          throw new Error("GOOGLE_APPLICATION_CREDENTIALS_JSON contém JSON inválido. Verifique se o JSON está completo e bem formatado.");
        }
        
        throw new Error(`Erro ao processar credenciais: ${parseError.message}`);
      }
    }
    
    // Fallback para arquivo (desenvolvimento local)
    if (credentialsPath) {
      return new ImageAnnotatorClient({
        keyFilename: credentialsPath,
        projectId,
      });
    }

    throw new Error("Credenciais do Google Vision não configuradas. Configure GOOGLE_APPLICATION_CREDENTIALS_JSON (produção) ou GOOGLE_APPLICATION_CREDENTIALS (desenvolvimento)");
  } catch (error: any) {
    console.error("[OCR] Erro ao criar cliente do Google Vision:", {
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

export async function POST(req: NextRequest) {
  try {
    // Log para debug em produção
    console.log("[OCR] Iniciando processamento...");
    console.log("[OCR] Variáveis de ambiente:", {
      hasCredentialsJson: !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
      hasCredentialsPath: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
      hasProjectId: !!process.env.PROJECT_ID,
      projectId: process.env.PROJECT_ID,
    });

    // Obter o arquivo do FormData
    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    console.log("[OCR] Arquivo recebido:", {
      hasFile: !!file,
      fileName: file?.name,
      fileType: file?.type,
      fileSize: file?.size,
    });

    if (!file) {
      return NextResponse.json(
        { error: "Nenhum arquivo enviado" },
        { status: 400 }
      );
    }

    // Validar tipo de arquivo
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo de arquivo não suportado. Use JPEG, PNG ou WebP" },
        { status: 400 }
      );
    }

    // Converter File para Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer as ArrayBuffer);

    // Inicializar cliente do Google Vision
    console.log("[OCR] Inicializando cliente do Google Vision...");
    const client = getVisionClient();
    console.log("[OCR] Cliente do Google Vision inicializado com sucesso");

    let text = "";
    let confidence = 0;

    // Processar imagem inteira
    console.log("[OCR] Processando imagem inteira...");
    
    let processedBuffer: Buffer = buffer;
    try {
      const metadata = await sharp(buffer).metadata();
      
      // Redimensionar se a imagem for muito grande (melhora performance e precisão)
      if (metadata.width && metadata.width > 3000) {
        processedBuffer = await sharp(buffer)
          .resize(3000, null, { 
            fit: 'inside',
            withoutEnlargement: true 
          })
          .jpeg({ quality: 90 })
          .toBuffer() as Buffer;
      } else if (metadata.format !== 'jpeg') {
        // Converter para JPEG se não for (melhor para OCR)
        processedBuffer = await sharp(buffer)
          .jpeg({ quality: 90 })
          .toBuffer() as Buffer;
      }
    } catch (sharpError) {
      console.warn("Erro ao processar imagem com Sharp, usando imagem original:", sharpError);
      processedBuffer = buffer;
    }

    // Usar DOCUMENT_TEXT_DETECTION para melhor precisão em documentos estruturados
    console.log("[OCR] Chamando Google Vision API...");
    let result;
    try {
      [result] = await client.annotateImage({
        image: {
          content: processedBuffer
        },
        features: [
          {
            type: 'DOCUMENT_TEXT_DETECTION' as const
          }
        ]
      });
      console.log("[OCR] Google Vision API respondeu com sucesso");
    } catch (visionError: any) {
      console.error("[OCR] Erro na chamada do Google Vision API:", {
        message: visionError.message,
        code: visionError.code,
        status: visionError.status,
        details: visionError.details,
      });
      throw visionError;
    }

    // Extrair texto completo
    const fullTextAnnotation = result.fullTextAnnotation;
    text = fullTextAnnotation?.text || "";
    confidence = fullTextAnnotation?.pages?.[0]?.confidence || 0;

    // Log de OCR
    console.log(`OCR processado: ${text.length} caracteres extraídos`);

    return NextResponse.json({ 
      text,
      confidence,
    });

  } catch (error: any) {
    console.error("[OCR] Erro no OCR:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });

    // Garantir que sempre retornamos JSON, mesmo em caso de erro
    try {
      // Mensagens de erro mais específicas
      if (error.message?.includes("GOOGLE_APPLICATION_CREDENTIALS") || error.message?.includes("Credenciais do Google Vision") || error.message?.includes("PROJECT_ID")) {
        return NextResponse.json(
          { 
            error: "Configuração do Google Vision não encontrada. Em produção, configure GOOGLE_APPLICATION_CREDENTIALS_JSON e PROJECT_ID na Vercel. Em desenvolvimento, configure GOOGLE_APPLICATION_CREDENTIALS e PROJECT_ID no .env.local",
            debug: process.env.NODE_ENV === "development" ? {
              hasCredentialsJson: !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
              hasCredentialsPath: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
              hasProjectId: !!process.env.PROJECT_ID,
            } : undefined
          },
          { status: 500 }
        );
      }

      // Erro específico de decodificação da chave privada
      if (error.code === 2 && (error.details?.includes("DECODER routines") || error.message?.includes("DECODER routines"))) {
        return NextResponse.json(
          { 
            error: "Erro ao decodificar a chave privada. A chave privada no JSON de credenciais está mal formatada. Verifique se o JSON foi copiado corretamente para GOOGLE_APPLICATION_CREDENTIALS_JSON na Vercel, especialmente a chave privada que deve manter as quebras de linha como \\n.",
            hint: "Copie o conteúdo do arquivo keys/google-vision-oneline.txt e cole na variável GOOGLE_APPLICATION_CREDENTIALS_JSON na Vercel."
          },
          { status: 500 }
        );
      }

      // Erros específicos do Google Cloud Vision
      if (error.code === 7 || error.message?.includes("PERMISSION_DENIED")) {
        return NextResponse.json(
          { 
            error: "Erro de permissão com Google Vision. Verifique se a Service Account tem a role 'Cloud Vision API User' e se a API está habilitada." 
          },
          { status: 403 }
        );
      }

      if (error.code === 16 || error.message?.includes("UNAUTHENTICATED") || error.message?.includes("401")) {
        return NextResponse.json(
          { 
            error: "Erro de autenticação com Google Vision. Verifique se as credenciais estão corretas na Vercel." 
          },
          { status: 401 }
        );
      }

      if (error.code === 8 || error.message?.includes("RESOURCE_EXHAUSTED") || error.message?.includes("quota")) {
        return NextResponse.json(
          { 
            error: "Cota do Google Vision API excedida. Verifique o uso no Google Cloud Console." 
          },
          { status: 429 }
        );
      }

      if (error.message?.includes("billing") || error.message?.includes("BILLING")) {
        return NextResponse.json(
          { 
            error: "Faturamento não habilitado no Google Cloud. Habilite o faturamento no projeto para usar a API." 
          },
          { status: 402 }
        );
      }

      // Log detalhado do erro para debug
      const errorInfo = {
        message: error.message,
        code: (error as any).code,
        status: (error as any).status,
        name: error.name,
      };
      console.error("[OCR] Detalhes completos do erro:", errorInfo);

      return NextResponse.json(
        { 
          error: "Erro ao processar OCR",
          message: error.message || "Erro desconhecido",
          code: (error as any).code,
          // Em produção, não expor stack trace, mas incluir código do erro se disponível
          details: process.env.NODE_ENV === "development" ? error.stack : ((error as any).code ? `Código do erro: ${(error as any).code}` : undefined)
        },
        { status: 500 }
      );
    } catch (jsonError) {
      // Se até o retorno de erro falhar, retornar erro simples
      console.error("[OCR] Erro ao criar resposta JSON:", jsonError);
      return new NextResponse(
        JSON.stringify({ error: "Erro interno do servidor" }),
        { 
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  }
}

