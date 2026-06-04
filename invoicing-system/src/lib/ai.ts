import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GEMINI_KEY || "");
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite";

export interface InvoiceData {
  fecha: string;
  proveedor: string;
  monto: number;
  categoria: string;
  descripcion: string;
}

async function generateInvoiceContent(imageBuffer: Buffer, mimeType: string, modelName: string) {
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: { responseMimeType: "application/json" },
  });

  const prompt = `
Analiza la imagen de esta factura o recibo, aunque este arrugada, borrosa o con poco contraste.
Extrae estos datos en formato JSON puro:
- fecha: formato YYYY-MM-DD. 
  IMPORTANTE: Las facturas están en español (formato latino DD/MM/YYYY). 
  REGLA DE ORO: El primer número es el DÍA y el segundo es el MES. 
  Ejemplo: "01/06/2026" DEBE ser "2026-06-01" (Junio), NUNCA "2026-01-06" (Enero).
- proveedor: nombre comercial o empresa emisora.
- monto: total final a pagar como numero decimal. Usa "Total a Pagar" si aparece.
- categoria: una categoria de gasto entre Alimentacion, Transporte, Servicios, Tecnologia, Materiales u Otros.
- descripcion: una descripción muy breve (máximo 10 palabras) de lo que se compró basándote en los conceptos de la factura.

No inventes datos. Si un campo no se puede leer, usa una cadena vacia para texto o 0 para monto.
Responde exclusivamente con el objeto JSON puro, sin bloques de codigo markdown.
`;

  return model.generateContent([
    prompt,
    {
      inlineData: {
        data: imageBuffer.toString("base64"),
        mimeType,
      },
    },
  ]);
}

export async function extractInvoiceData(imageBuffer: Buffer, mimeType: string): Promise<InvoiceData> {
  const configuredModel = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;

  let result;
  try {
    result = await generateInvoiceContent(imageBuffer, mimeType, configuredModel);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Too Many Requests") || message.includes("quota") || message.includes("Quota")) {
      throw new Error(
        "La cuota de Gemini no esta disponible para este proyecto o se agoto temporalmente. Revisa el medidor de uso en AI Studio o activa billing."
      );
    }

    if (
      configuredModel !== DEFAULT_GEMINI_MODEL &&
      (message.includes("not found") || message.includes("not supported") || message.includes("deprecated"))
    ) {
      result = await generateInvoiceContent(imageBuffer, mimeType, DEFAULT_GEMINI_MODEL);
    } else {
      throw error;
    }
  }

  const response = await result.response;
  const text = response.text();

  try {
    // Buscamos el inicio y fin del objeto JSON para ignorar caracteres basura (como esa "N" extra)
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    
    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error("No se encontró un objeto JSON válido en la respuesta.");
    }

    const cleanJson = text.substring(firstBrace, lastBrace + 1);
    return JSON.parse(cleanJson) as InvoiceData;
  } catch (e) {
    console.error("Error parsing AI response:", text);
    throw new Error("La IA no devolvio un formato JSON valido.");
  }
}
