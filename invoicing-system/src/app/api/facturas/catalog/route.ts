import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth-server";



export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const body = await request.json();
    const kind = String(body.kind ?? "").trim();
    const nombre = String(body.nombre ?? "").trim();

    if (!kind || !nombre) {
      return NextResponse.json({ error: "Tipo y nombre son obligatorios." }, { status: 400 });
    }

    let item;

    switch (kind) {
      case "categoria":
        item = await prisma.tipoGasto.upsert({
          where: { nombre },
          update: {},
          create: { nombre },
        });
        break;
      case "tipo":
        item = await prisma.tipoFactura.upsert({
          where: { nombre },
          update: {},
          create: { nombre },
        });
        break;
      case "documento":
        item = await prisma.tipoDocumento.upsert({
          where: { nombre },
          update: {},
          create: { nombre },
        });
        break;
      default:
        return NextResponse.json({ error: "Tipo de catálogo no válido." }, { status: 400 });
    }

    return NextResponse.json({ item: { id: item.id, nombre: item.nombre } });
  } catch (error) {
    console.error("Catalog create error:", error);
    return NextResponse.json({ error: "Error al crear el catálogo." }, { status: 500 });
  }
}
