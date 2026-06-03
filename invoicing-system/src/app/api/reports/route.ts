import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth-server";

export async function GET(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period"); // Esperado: YYYY-MM

    if (!period) return NextResponse.json({ error: "Periodo requerido" }, { status: 400 });

    const [year, month] = period.split("-").map(Number);
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));

    const invoices = await prisma.factura.findMany({
      where: {
        usuarioId: userId,
        fecha: { gte: start, lt: end },
      },
      orderBy: { fecha: "asc" },
    });

    return NextResponse.json(invoices);
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener facturas" }, { status: 500 });
  }
}
