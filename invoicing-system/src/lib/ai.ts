import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GEMINI_KEY || "");
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite";

export interface InvoiceData {
  fecha: string;
  proveedor: string;
  monto: number;
  categoria: string;
}

async function generateInvoiceContent(imageBuffer: Buffer, mimeType: string, modelName: string) {
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: { responseMimeType: "application/json" },
  });

  const prompt = `
Analiza la imagen de esta factura o recibo, aunque este arrugada, borrosa o con poco contraste.
Extrae estos datos en formato JSON:
- fecha: formato YYYY-MM-DD. Si la factura usa DD/MM/YY, conviertela correctamente.
- proveedor: nombre comercial o empresa emisora.
- monto: total final a pagar como numero decimal. Usa "Total a Pagar" si aparece.
- categoria: una categoria de gasto entre Alimentacion, Transporte, Servicios, Tecnologia, Materiales u Otros.

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
    const cleanText = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanText) as InvoiceData;
  } catch {
    console.error("Error parsing AI response:", text);
    throw new Error("La IA no devolvio un formato JSON valido.");
  }
}
