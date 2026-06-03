import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth-server";

export async function GET(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period"); // Formato esperado: "YYYY-MM"

    if (!period) {
      return NextResponse.json({ error: "El periodo es requerido" }, { status: 400 });
    }

    const [year, month] = period.split("-").map(Number);
    
    // Definir el rango de fechas para el mes completo (Consistente con reports/send)
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 1)); // Límite exclusivo (1er día del mes siguiente)

    const invoices = await prisma.factura.findMany({
      where: {
        usuarioId: userId,
        fecha: {
          gte: startDate,
          lt: endDate,
        },
      },
      include: {
        tipoGasto: true,
        tipoFactura: true,
      },
      orderBy: { fecha: "desc" },
    });

    return NextResponse.json(invoices);
  } catch (error) {
    console.error("Error fetching invoices for report:", error);
    return NextResponse.json({ error: "Error al obtener las facturas" }, { status: 500 });
  }
}
