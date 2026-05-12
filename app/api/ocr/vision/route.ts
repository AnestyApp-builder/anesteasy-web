import 'server-only'
import { NextRequest, NextResponse } from "next/server";
import { parseFichaWithVision } from "@/utils/parseFichaAI";

export const runtime = 'nodejs';
export const maxDuration = 60; // Vision pode demorar um pouco mais

export async function POST(req: NextRequest) {
  try {
    console.log("[AI Vision] Iniciando extração direta da imagem...");

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY não configurada" }, { status: 503 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    // Converter File para Base64
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString('base64');

    // Chamar função de visão
    const parsed = await parseFichaWithVision(base64Image);

    if (!parsed) {
      return NextResponse.json({ error: "Falha ao extrair dados via IA Vision" }, { status: 500 });
    }

    const camposPreenchidos = Object.values(parsed).filter(v => v && v.toString().trim()).length;
    console.log(`[AI Vision] Sucesso: ${camposPreenchidos} campos extraídos`);

    return NextResponse.json({
      parsed,
      camposPreenchidos,
      success: true
    });

  } catch (error: any) {
    console.error("[AI Vision] Erro:", error);
    return NextResponse.json({ 
      error: "Erro no processamento da imagem",
      message: error.message 
    }, { status: 500 });
  }
}
