import { NextRequest, NextResponse } from "next/server";
import { parseFichaWithAI } from "@/utils/parseFichaAI";

// Configuração para Vercel (serverless)
export const runtime = 'nodejs';
export const maxDuration = 30; // 30 segundos

export async function POST(req: NextRequest) {
  try {
    console.log("[AI Parse] Iniciando processamento com IA...");

    // Verificar se API key está configurada
    if (!process.env.OPENAI_API_KEY) {
      console.warn("[AI Parse] OPENAI_API_KEY não configurada");
      return NextResponse.json(
        { 
          error: "OPENAI_API_KEY não configurada",
          parsed: null 
        },
        { status: 503 } // Service Unavailable
      );
    }

    // Obter texto do OCR do body
    const body = await req.json();
    const textoOCR = body.text;

    if (!textoOCR || typeof textoOCR !== 'string' || textoOCR.trim().length === 0) {
      return NextResponse.json(
        { 
          error: "Texto do OCR não fornecido ou vazio",
          parsed: null 
        },
        { status: 400 }
      );
    }

    console.log(`[AI Parse] Processando texto de ${textoOCR.length} caracteres`);

    // Processar com IA
    const parsed = await parseFichaWithAI(textoOCR);

    if (!parsed) {
      return NextResponse.json(
        { 
          error: "Falha ao processar com IA",
          parsed: null 
        },
        { status: 500 }
      );
    }

    // Contar campos preenchidos
    const camposPreenchidos = Object.values(parsed).filter(v => v && v.trim()).length;

    console.log(`[AI Parse] Processamento concluído: ${camposPreenchidos} campos extraídos`);

    return NextResponse.json({ 
      parsed,
      camposPreenchidos,
      success: true
    });

  } catch (error: any) {
    console.error("[AI Parse] Erro no processamento:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });

    // Retornar erro mas permitir que o cliente use fallback
    return NextResponse.json(
      { 
        error: "Erro ao processar com IA",
        message: error.message || "Erro desconhecido",
        parsed: null,
        success: false
      },
      { status: 500 }
    );
  }
}

