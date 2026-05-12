import { ImageAnnotatorClient } from "@google-cloud/vision";

const getVisionClient = () => {
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  const projectId = process.env.PROJECT_ID || 'api-vision-495522';
  
  if (!credentialsJson) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS_JSON not configured in environment");
  }

  try {
    let credentials = JSON.parse(credentialsJson);
    
    // Se o resultado ainda for uma string, faz o parse de novo (Double Parse)
    if (typeof credentials === 'string') {
      credentials = JSON.parse(credentials);
    }
    
    const cleanEmail = credentials?.client_email?.toString().trim();
    const privateKey = credentials?.private_key?.replace(/\\n/g, '\n').trim();
    const fixedProjectId = 'api-vision-495522';
    
    return new ImageAnnotatorClient({ 
      credentials: { client_email: cleanEmail, private_key: privateKey },
      projectId: fixedProjectId
    });
  } catch (error: any) {
    console.error("Failed to parse Google Vision JSON credentials:", error);
    throw new Error(`Auth Config Error: ${error.message}`);
  }
};

export async function extractTextFromImage(imageBuffer: Buffer): Promise<{ text: string; confidence: number }> {
  try {
    const optimizedBuffer = imageBuffer;

    const client = getVisionClient();
    const [result] = await client.documentTextDetection(optimizedBuffer);
    
    const fullTextAnnotation = result.fullTextAnnotation;
    const text = fullTextAnnotation?.text || "";
    
    // Calcular confiança média (opcional)
    const confidence = fullTextAnnotation?.pages?.[0]?.confidence || 0;

    return { text, confidence };
  } catch (error) {
    console.error("OCR extraction failed:", error);
    throw error;
  }
}
