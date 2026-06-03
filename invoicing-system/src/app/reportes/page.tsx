import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import ReportForm from "./ReportForm";

const LOCALE = "es-HN";

export default async function ReportesPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  // Obtenemos el historial de envíos directamente desde el servidor
  const history = await prisma.detalleEnvio.findMany({
    where: { usuarioId: userId },
    orderBy: { timestamp: "desc" },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 md:p-8">
      <div>
        <p className="text-xs uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">Entregables</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">Reportes Mensuales</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Selecciona un periodo, revisa tus facturas y envía el resumen PDF.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_1.5fr]">
        {/* Columna Izquierda: Formulario de creación */}
        <section className="space-y-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
            <h2 className="mb-6 text-xl font-semibold text-slate-900 dark:text-white">Nuevo Envío</h2>
            <ReportForm />
          </div>
        </section>

        {/* Columna Derecha: Historial */}
        <section className="space-y-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
            <h2 className="mb-6 text-xl font-semibold text-slate-900 dark:text-white">Historial de Actividad</h2>
            <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-white/10">
                <thead className="bg-slate-50 text-slate-600 dark:bg-slate-900/50 dark:text-slate-300">
                  <tr>
                    <th className="px-4 py-3 font-medium">Fecha Envío</th>
                    <th className="px-4 py-3 font-medium">Periodo</th>
                    <th className="px-4 py-3 font-medium">Destinatario</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white dark:divide-white/10 dark:bg-transparent">
                  {history.length > 0 ? (
                    history.map((item) => (
                      <tr key={item.id} className="text-slate-700 dark:text-slate-300">
                        <td className="px-4 py-3 whitespace-nowrap">
                          {new Date(item.timestamp).toLocaleDateString(LOCALE)}
                        </td>
                        <td className="px-4 py-3 font-medium">{item.periodoMes}</td>
                        <td className="px-4 py-3 truncate max-w-[120px]">{item.destinatario}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                            item.estado?.toLowerCase() === 'enviado' 
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' 
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                          }`}>
                            {item.estado}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {item.pdfUrl ? (
                            <a 
                              href={item.pdfUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-[#0d3a71] font-semibold hover:underline dark:text-blue-400"
                            >
                              Ver PDF
                            </a>
                          ) : (
                            <span className="text-slate-400 text-xs italic">No disponible</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                        No hay reportes enviados recientemente.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}