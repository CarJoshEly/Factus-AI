import { Resend } from 'resend';

export async function sendMonthlyReport(email: string, userName: string, period: string, pdfUrl: string) { // No se necesita cambio, ya usa "@/lib/mail"
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY no esta configurada.");
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const data = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'FactusAI <reportes@factusai.com>',
      to: [email],
      subject: `Tu Reporte de Facturas - ${period}`,
      html: `
        <div style="font-family: sans-serif; color: #1e293b;">
          <h1 style="color: #0d3a71;">¡Hola, ${userName}!</h1>
          <p>Adjunto encontrarás el resumen de tus gastos del periodo <strong>${period}</strong>.</p>
          <p>Puedes visualizar y descargar tu reporte completo aquí:</p>
          <a href="${pdfUrl}" style="background-color: #0d3a71; color: white; padding: 12px 24px; border-radius: 24px; text-decoration: none; display: inline-block; font-weight: bold;">Ver Reporte PDF</a>
          <br/><br/>
          <p>Saludos,<br/>El equipo de FactusAI</p>
        </div>
      `,
    });

    return { success: true, data };
  } catch (error) {
    console.error('Error enviando email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido al enviar correo.",
    };
  }
}
