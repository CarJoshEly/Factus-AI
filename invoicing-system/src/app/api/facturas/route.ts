import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth-server";
import { uploadInvoiceFile } from "@/lib/storage";

const catalogDefaults = {
  categorias: ["Servicios", "Materiales", "Alquiler", "Transporte", "Otros"],
  tipos: ["Factura", "Recibo", "Nota de débito"],
  documentos: ["Factura", "Recibo", "Otro"],
};

async function ensureCatalogDefaults() {
  for (const nombre of catalogDefaults.categorias) {
    await prisma.tipoGasto.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    });
  }

  for (const nombre of catalogDefaults.tipos) {
    await prisma.tipoFactura.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    });
  }

  for (const nombre of catalogDefaults.documentos) {
    await prisma.tipoDocumento.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    });
  }
}

type InvoiceWithRelations = Prisma.FacturaGetPayload<{
  include: {
    tipoGasto: true;
    tipoFactura: true;
    tipoDocumento: true;
  };
}>;

function serializeInvoice(invoice: InvoiceWithRelations) {
  return {
    id: invoice.id,
    fecha: invoice.fecha.toISOString(),
    proveedor: invoice.proveedor,
    monto: Number(invoice.monto.toString()),
    descripcion: invoice.descripcion,
    imagen: invoice.imagen,
    estado: invoice.estado,
    facturaFisico: invoice.facturaFisico,
    tipoGasto: {
      id: invoice.tipoGasto.id,
      nombre: invoice.tipoGasto.nombre,
    },
    tipoFactura: {
      id: invoice.tipoFactura.id,
      nombre: invoice.tipoFactura.nombre,
    },
    tipoDocumento: {
      id: invoice.tipoDocumento.id,
      nombre: invoice.tipoDocumento.nombre,
    },
  };
}

export async function GET(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeCatalog = searchParams.get("includeCatalog") === "true";
    const requestedMonth = searchParams.get("month") ?? null;

    await ensureCatalogDefaults();

    const monthStart = requestedMonth ? new Date(`${requestedMonth}-01T00:00:00.000Z`) : null;
    let monthEnd = null;
    if (monthStart) {
      monthEnd = new Date(monthStart);
      monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);
    }

    const where: Prisma.FacturaWhereInput = {
      usuarioId: userId,
      ...(monthStart && monthEnd ? {
        fecha: {
          gte: monthStart,
          lt: monthEnd,
        },
      } : {}),
    };

    const invoices = await prisma.factura.findMany({
      where,
      orderBy: [{ fecha: "desc" }],
      include: {
        tipoGasto: true,
        tipoFactura: true,
        tipoDocumento: true,
      },
    });

    const payload = {
      invoices: invoices.map(serializeInvoice),
      ...(includeCatalog ? {
        catalog: {
          categorias: await prisma.tipoGasto.findMany({ orderBy: { nombre: "asc" } }),
          tipos: await prisma.tipoFactura.findMany({ orderBy: { nombre: "asc" } }),
          documentos: await prisma.tipoDocumento.findMany({ orderBy: { nombre: "asc" } }),
        },
      } : {}),
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Invoice list error:", error);
    return NextResponse.json({ error: "Error al cargar las facturas." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    await ensureCatalogDefaults();

    const formData = await request.formData();
    const fecha = formData.get("fecha");
    const proveedor = String(formData.get("proveedor") ?? "").trim();
    const monto = Number(formData.get("monto"));
    const descripcion = String(formData.get("descripcion") ?? "").trim();
    const tipoGastoId = Number(formData.get("tipoGastoId"));
    const tipoFacturaId = Number(formData.get("tipoFacturaId"));
    const tipoDocumentoId = Number(formData.get("tipoDocumentoId"));
    const estado = String(formData.get("estado") ?? "pendiente").trim();
    const facturaFisico = String(formData.get("facturaFisico") ?? "false") === "true";
    const archivo = formData.get("archivo") as File | null;

    if (!fecha || !proveedor || Number.isNaN(monto) || !tipoGastoId || !tipoFacturaId || !tipoDocumentoId) {
      return NextResponse.json({ error: "Faltan campos obligatorios." }, { status: 400 });
    }

    let imagenUrl: string | null = null;
    if (archivo && archivo.size > 0) {
      const result = await uploadInvoiceFile(archivo, userId);
      imagenUrl = result.publicUrl;
    }

    const invoice = await prisma.factura.create({
      data: {
        usuarioId: userId,
        fecha: new Date(String(fecha)),
        proveedor,
        monto: new Prisma.Decimal(monto),
        descripcion: descripcion || null,
        imagen: imagenUrl,
        tipoGastoId,
        tipoFacturaId,
        tipoDocumentoId,
        estado,
        facturaFisico,
      },
      include: {
        tipoGasto: true,
        tipoFactura: true,
        tipoDocumento: true,
      },
    });

    return NextResponse.json({ invoice: serializeInvoice(invoice) }, { status: 201 });
  } catch (error) {
    console.error("Invoice create error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error al crear factura." }, { status: 500 });
  }
}
