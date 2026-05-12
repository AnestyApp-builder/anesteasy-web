import 'server-only'
import { NextRequest, NextResponse } from "next/server";
import { parseFichaWithAI } from "@/utils/parseFichaAI";
import { logger } from "@/lib/logger";

// Configuração para Vercel (serverless)
export const runtime = 'nodejs';
export const maxDuration = 30; // 30 segundos

export async function POST(req: NextRequest) {
  try {
    logger.info("[AI Parse] Iniciando processamento com IA...");

    if (!process.env.OPENAI_API_KEY) {
      logger.warn("[AI Parse] OPENAI_API_KEY não configurada");
      return NextResponse.json({ error: "API Key não configurada", parsed: null }, { status: 503 });
    }

    const body = await req.json();
    const textoOCR = body.text;

    if (!textoOCR || typeof textoOCR !== 'string' || textoOCR.trim().length === 0) {
      return NextResponse.json({ error: "Texto do OCR vazio", parsed: null }, { status: 400 });
    }

    logger.info(`[AI Parse] Processando texto de ${textoOCR.length} caracteres`);

    const parsed = await parseFichaWithAI(textoOCR);

    if (!parsed) {
      return NextResponse.json({ error: "Falha ao processar com IA", parsed: null }, { status: 500 });
    }

    const camposPreenchidos = Object.values(parsed).filter(v => v && typeof v === 'string' && v.trim()).length;

    logger.info(`[AI Parse] Processamento concluído: ${camposPreenchidos} campos extraídos`);

    return NextResponse.json({ 
      parsed,
      camposPreenchidos,
      success: true
    });

  } catch (error: any) {
    logger.error("[AI Parse] Erro no processamento:", error.message);

    return NextResponse.json({ 
      error: "Erro ao processar com IA",
      message: error.message || "Erro desconhecido",
      parsed: null,
      success: false
    }, { status: 500 });
  }
}
