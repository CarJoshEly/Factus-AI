import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth-server";
import { supabaseClient, uploadInvoiceFile } from "@/lib/storage";
import { sendMonthlyReport } from "@/lib/mail";

type ReportMethod = "email" | "whatsapp";

function isReportMethod(value: unknown): value is ReportMethod {
  return value === "email" || value === "whatsapp";
}

function parsePeriod(value: unknown) {
  const period = String(value ?? "").trim();
  const match = /^(\d{4})-(\d{2})$/.exec(period);

  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }

  return {
    period,
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1)),
  };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-HN", {
    style: "currency",
    currency: "HNL",
    minimumFractionDigits: 2,
  }).format(value);
}

function createReportPdf(
  invoices: Array<{
    fecha: Date;
    proveedor: string;
    monto: Prisma.Decimal;
    tipoGasto: { nombre: string };
  }>,
  period: string
) {
  const doc = new jsPDF();
  const total = invoices.reduce((sum, invoice) => sum + Number(invoice.monto.toString()), 0);

  doc.setFontSize(20);
  doc.setTextColor(13, 58, 113);
  doc.text("Reporte mensual de gastos", 14, 20);

  doc.setFontSize(11);
  doc.setTextColor(80);
  doc.text(`Periodo: ${period}`, 14, 30);
  doc.text(`Facturas incluidas: ${invoices.length}`, 14, 37);
  doc.text(`Total: ${formatCurrency(total)}`, 14, 44);

  autoTable(doc, {
    startY: 54,
    head: [["Fecha", "Proveedor", "Categoria", "Monto"]],
    body: invoices.map((invoice) => [
      invoice.fecha.toLocaleDateString("es-HN"),
      invoice.proveedor,
      invoice.tipoGasto.nombre,
      formatCurrency(Number(invoice.monto.toString())),
    ]),
    headStyles: { fillColor: [13, 58, 113] },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });

  return {
    total,
    bytes: new Uint8Array(doc.output("arraybuffer")),
  };
}

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const body = await request.json() as Record<string, unknown>;
    const method = body.method;
    const destinatario = String(body.destinatario ?? "").trim();
    const period = parsePeriod(body.period);
    const rawInvoiceIds = Array.isArray(body.invoiceIds) ? body.invoiceIds : [];
    const invoiceIds = rawInvoiceIds
      .map(Number)
      .filter((id): id is number => Number.isInteger(id) && id > 0);

    if (!isReportMethod(method)) {
      return NextResponse.json({ error: "Metodo de envio invalido." }, { status: 400 });
    }

    if (!destinatario) {
      return NextResponse.json({ error: "Debes indicar el destinatario." }, { status: 400 });
    }

    if (!period) {
      return NextResponse.json({ error: "Periodo invalido." }, { status: 400 });
    }

    if (invoiceIds.length === 0) {
      return NextResponse.json({ error: "Selecciona al menos una factura." }, { status: 400 });
    }

    const uniqueInvoiceIds = Array.from(new Set(invoiceIds));
    const invoices = await prisma.factura.findMany({
      where: {
        id: { in: uniqueInvoiceIds },
        usuarioId: userId,
        fecha: {
          gte: period.start,
          lt: period.end,
        },
      },
      orderBy: [{ fecha: "asc" }, { id: "asc" }],
      include: {
        tipoGasto: true,
      },
    });

    if (invoices.length !== uniqueInvoiceIds.length) {
      return NextResponse.json({ error: "Una o mas facturas no pertenecen al periodo seleccionado." }, { status: 400 });
    }

    const report = createReportPdf(invoices, period.period);
    const upload = await uploadInvoiceFile(report.bytes, userId, `reporte_${period.period}.pdf`, "application/pdf");

    let estado = method === "whatsapp" ? "pendiente" : "enviado";
    let mailError: string | null = null;

    if (method === "email") {
      const user = await prisma.usuario.findUnique({
        where: { id: userId },
        select: { nombre: true },
      });
      const mailResult = await sendMonthlyReport(destinatario, user?.nombre ?? "Usuario", period.period, upload.publicUrl);
      estado = mailResult.success ? "enviado" : "fallido";
      mailError = mailResult.success ? null : mailResult.error ?? "No se pudo enviar el correo.";
    }

    const envio = await prisma.detalleEnvio.create({
      data: {
        usuarioId: userId,
        destinatario,
        medioEnvio: method,
        estado,
        periodoMes: period.period,
        pdfUrl: upload.publicUrl,
        total: new Prisma.Decimal(report.total),
        cantidadFacturas: invoices.length,
        facturas: {
          create: invoices.map((invoice) => ({
            facturaId: invoice.id,
          })),
        },
      },
    });

    if (supabaseClient) {
      const { error: historyError } = await supabaseClient
        .from("detalle_envio")
        .insert([{
          user_id: userId.toString(), // Convierte a string si user_id en Supabase es UUID
          periodo_mes: period.period,
          metodo: method,
          destinatario,
          pdf_url: upload.publicUrl,
        }] as any);

      if (historyError) {
        console.error("Report history insert error:", historyError);
      }
    }

    const whatsappUrl = method === "whatsapp"
      ? `https://wa.me/${destinatario.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola. Te comparto mi reporte de facturas de FactusAI (${period.period}): ${upload.publicUrl}`)}`
      : null;

    return NextResponse.json({
      success: estado === "enviado",
      envioId: envio.id,
      estado,
      message: method === "whatsapp"
        ? "Se genero el PDF y se abrio WhatsApp. Debes presionar Enviar dentro de WhatsApp para que llegue al numero."
        : mailError ?? "Reporte enviado por correo.",
      error: mailError,
      pdfUrl: upload.publicUrl,
      whatsappUrl,
    });
  } catch (error) {
    console.error("Report send error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al generar o enviar el reporte." },
      { status: 500 }
    );
  }
}
