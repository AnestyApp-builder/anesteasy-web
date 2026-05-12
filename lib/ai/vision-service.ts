import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Analisa uma imagem de ficha anestésica usando GPT-4o Vision
 */
export async function analyzeAnesthesiaRecordImage(imageBuffer: Buffer) {
  try {
    const base64Image = imageBuffer.toString('base64');

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Modelo robusto, rápido e com visão
      messages: [
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: "Extraia os dados desta ficha de anestesia e retorne APENAS um JSON puro com os campos: paciente_nome, data, hospital, cirurgiao, procedimento, tipo_anestesia." 
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    return content ? JSON.parse(content) : null;
  } catch (error) {
    console.error("AI Vision Error:", error);
    throw error;
  }
}

/**
 * Analisa o texto extraído por OCR
 */
export async function analyzeAnesthesiaRecordText(text: string) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Você é o Agente pessoal - AnestEasy, um assistente médico especializado em anestesiologia. Sua missão é extrair dados estruturados de textos de fichas anestésicas com precisão absoluta."
        },
        {
          role: "user",
          content: `Extraia os dados deste texto de OCR de uma ficha de anestesia e retorne um JSON com: paciente_nome, data, hospital, cirurgiao, procedimento, tipo_anestesia.\n\nTexto:\n${text}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    return content ? JSON.parse(content) : null;
  } catch (error) {
    console.error("AI Text Analysis Error:", error);
    return null;
  }
}
