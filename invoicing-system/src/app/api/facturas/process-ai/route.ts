import { NextResponse } from "next/server";
import { extractInvoiceData } from "@/lib/ai";
import { getSessionUserId } from "@/lib/auth-server";


export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Configura GEMINI_API_KEY o GEMINI_KEY para activar la lectura automatica." },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "Debes enviar un archivo." }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Formato no permitido para la lectura automatica." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Llamamos a la función que contiene el prompt
    const extractedData = await extractInvoiceData(buffer, file.type);

    return NextResponse.json({ extractedData });
  } catch (error) {
    console.error("AI invoice processing error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo procesar la factura con IA." },
      { status: 500 }
    );
  }
}
