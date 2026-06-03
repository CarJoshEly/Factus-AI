import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth-server";
import { getInvoiceStoragePathFromPublicUrl, removeInvoiceFile, uploadInvoiceFile } from "@/lib/storage";

function serializeInvoice(invoice: Awaited<ReturnType<typeof prisma.factura.findUnique>> & {
  tipoGasto: { id: number; nombre: string };
  tipoFactura: { id: number; nombre: string };
  tipoDocumento: { id: number; nombre: string };
}) {
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

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const { id } = await params;
    const invoiceId = Number(id);
    if (!Number.isInteger(invoiceId)) {
      return NextResponse.json({ error: "ID inválido." }, { status: 400 });
    }

    const existingInvoice = await prisma.factura.findFirst({
      where: {
        id: invoiceId,
        usuarioId: userId,
      },
    });

    if (!existingInvoice) {
      return NextResponse.json({ error: "Factura no encontrada." }, { status: 404 });
    }

    const formData = await request.formData();
    const fecha = formData.get("fecha") as string | null;
    const proveedor = String(formData.get("proveedor") ?? "").trim();
    const monto = formData.get("monto") ? Number(formData.get("monto")) : null;
    const descripcion = String(formData.get("descripcion") ?? "").trim();
    const tipoGastoId = formData.get("tipoGastoId") ? Number(formData.get("tipoGastoId")) : null;
    const tipoFacturaId = formData.get("tipoFacturaId") ? Number(formData.get("tipoFacturaId")) : null;
    const tipoDocumentoId = formData.get("tipoDocumentoId") ? Number(formData.get("tipoDocumentoId")) : null;
    const estado = String(formData.get("estado") ?? existingInvoice.estado).trim();
    const facturaFisico = String(formData.get("facturaFisico") ?? String(existingInvoice.facturaFisico)) === "true";
    const archivo = formData.get("archivo") as File | null;

    let imagen = existingInvoice.imagen;
    if (archivo && archivo.size > 0) {
      if (existingInvoice.imagen) {
        const imagePath = getInvoiceStoragePathFromPublicUrl(existingInvoice.imagen);
        if (imagePath) {
          await removeInvoiceFile(imagePath);
        }
      }

      const result = await uploadInvoiceFile(archivo, userId);
      imagen = result.publicUrl;
    }

    const invoice = await prisma.factura.update({
      where: { id: invoiceId },
      data: {
        ...(fecha ? { fecha: new Date(String(fecha)) } : {}),
        ...(proveedor ? { proveedor } : {}),
        ...(monto !== null && !Number.isNaN(monto) ? { monto: new Prisma.Decimal(monto) } : {}),
        descripcion: descripcion || null,
        ...(tipoGastoId ? { tipoGastoId } : {}),
        ...(tipoFacturaId ? { tipoFacturaId } : {}),
        ...(tipoDocumentoId ? { tipoDocumentoId } : {}),
        estado,
        facturaFisico,
        ...(imagen !== existingInvoice.imagen ? { imagen } : {}),
      },
      include: {
        tipoGasto: true,
        tipoFactura: true,
        tipoDocumento: true,
      },
    });

    return NextResponse.json({ invoice: serializeInvoice(invoice) });
  } catch (error) {
    console.error("Invoice update error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error al actualizar factura." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const { id } = await params;
    const invoiceId = Number(id);
    if (!Number.isInteger(invoiceId)) {
      return NextResponse.json({ error: "ID inválido." }, { status: 400 });
    }

    const existingInvoice = await prisma.factura.findFirst({
      where: {
        id: invoiceId,
        usuarioId: userId,
      },
    });

    if (!existingInvoice) {
      return NextResponse.json({ error: "Factura no encontrada." }, { status: 404 });
    }

    if (existingInvoice.imagen) {
      const imagePath = getInvoiceStoragePathFromPublicUrl(existingInvoice.imagen);
      if (imagePath) {
        await removeInvoiceFile(imagePath);
      }
    }

    await prisma.factura.delete({ where: { id: invoiceId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Invoice delete error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error al eliminar factura." }, { status: 500 });
  }
}
