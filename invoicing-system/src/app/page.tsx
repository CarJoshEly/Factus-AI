import { AppShell } from "@/components/AppShell"
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth-server";
import { redirect } from "next/navigation";

const LOCALE = "es-HN"; // Centralizamos la localización

function formatCurrency(value: number | string) {
  const formatted = new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));

  return `L ${formatted}`;
}

export default async function Home() {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/login");
  }

  const fallbackUser = {
    id: userId,
    nombre: "Usuario FactusAI",
    correo: "usuario@factusai.local",
  };

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  let user = fallbackUser;
  let totalFacturas = 0;
  let totalMontoValue = 0;
  let montoMesValue = 0;
  let recentInvoices: Array<{
    id: number;
    proveedor: string;
    monto: number;
    fecha: Date;
    estado: string;
  }> = [];

  try {
    const results = await Promise.allSettled([
      prisma.usuario.findUnique({
        where: { id: userId },
        select: { id: true, nombre: true, correo: true },
      }),
      prisma.factura.count({
        where: { usuarioId: userId },
      }),
      prisma.factura.aggregate({
        where: { usuarioId: userId },
        _sum: { monto: true },
      }),
      prisma.factura.aggregate({
        where: {
          usuarioId: userId,
          fecha: {
            gte: startOfMonth,
            lt: endOfMonth,
          },
        },
        _sum: { monto: true },
      }),
      prisma.factura.findMany({
        where: { usuarioId: userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          proveedor: true,
          monto: true,
          fecha: true,
          estado: true,
          createdAt: true,
        },
      }),
    ]);

    const [userResult, totalCountResult, totalMontoResult, montoMesResult, invoicesResult] = results;

    if (userResult.status === "fulfilled" && userResult.value) {
      user = userResult.value;
    }

    if (totalCountResult.status === "fulfilled") {
      totalFacturas = totalCountResult.value;
    }

    if (totalMontoResult.status === "fulfilled") {
      totalMontoValue = Number(totalMontoResult.value._sum.monto?.toString() ?? 0);
    }

    if (montoMesResult.status === "fulfilled") {
      montoMesValue = Number(montoMesResult.value._sum.monto?.toString() ?? 0);
    }

    if (invoicesResult.status === "fulfilled") {
      recentInvoices = invoicesResult.value.map((invoice) => ({
        ...invoice,
        monto: Number(invoice.monto.toString()),
      }));
    }
  } catch (error) {
    console.error("Dashboard fallback used:", error);
  }

  return (
    <AppShell>
      <div className="space-y-8">
        <section className="rounded-[2rem] border border-slate-200 bg-white/85 p-6 shadow-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500 dark:text-slate-300">Resumen ejecutivo</p>
              <h2 className="mt-3 text-3xl font-semibold text-slate-950 dark:text-white">Dashboard</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                Revisa tu actividad de facturación, el monto acumulado y las últimas operaciones del mes.
              </p>
            </div>
            <div className="rounded-2xl border border-[#18a57c]/30 bg-[#18a57c]/10 px-4 py-3 text-sm text-[#0f6a4f] dark:text-[#9bf4d6]">
              Mes actual: {now.toLocaleDateString(LOCALE, { month: "long", year: "numeric" })}
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-300">Total facturas</p>
              <p className="mt-4 text-4xl font-semibold text-slate-950 dark:text-white">{totalFacturas}</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Facturas registradas en tu cuenta</p>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-300">Monto total</p>
              <p className="mt-4 text-4xl font-semibold text-slate-950 dark:text-white">{formatCurrency(totalMontoValue)}</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Acumulado de todas las facturas</p>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-300">Monto del mes</p>
              <p className="mt-4 text-4xl font-semibold text-slate-950 dark:text-white">{formatCurrency(montoMesValue)}</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Total del mes en curso</p>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-300">Estado</p>
              <p className="mt-4 text-4xl font-semibold text-[#0f6a4f] dark:text-[#9bf4d6]">Activo</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Tu sesión está operativa</p>
            </article>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500 dark:text-slate-300">Últimas facturas</p>
                <h3 className="mt-3 text-2xl font-semibold text-slate-950 dark:text-white">Actividad reciente</h3>
              </div>
              <span className="rounded-full bg-[#0d3a71]/10 px-3 py-1 text-xs font-medium text-[#0d3a71] dark:bg-[#0d3a71]/60 dark:text-[#d4e1ff]">
                {recentInvoices.length} registros
              </span>
            </div>

            <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 dark:border-white/10">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-white/10">
                <thead className="bg-slate-100 text-slate-600 dark:bg-slate-900/80 dark:text-slate-300">
                  <tr>
                    <th className="px-4 py-3 font-medium">Proveedor</th>
                    <th className="px-4 py-3 font-medium">Monto</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white text-slate-900 dark:divide-white/10 dark:bg-slate-950/60 dark:text-slate-100">
                  {recentInvoices.length > 0 ? (
                    recentInvoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                        <td className="px-4 py-3 font-medium">{invoice.proveedor}</td>
                        <td className="px-4 py-3">{formatCurrency(Number(invoice.monto.toString()))}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-[#18a57c]/20 px-2.5 py-1 text-xs font-medium text-[#0f6a4f] dark:text-[#9bf4d6]">
                            {invoice.estado}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-300">
                          {new Date(invoice.fecha).toLocaleDateString(LOCALE)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-slate-500 dark:text-slate-300">
                        No hay facturas registradas todavía.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>

          <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500 dark:text-slate-300">Perfil</p>
            <div className="mt-5 rounded-3xl border border-[#18a57c]/20 bg-[#18a57c]/10 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#18a57c] text-base font-bold text-white">
                  {user.nombre
                    .split(" ")
                    .map((part) => part.charAt(0))
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>
                <div>
                  <p className="text-lg font-semibold text-slate-950 dark:text-white">{user.nombre}</p>
                  <p className="text-sm text-slate-700 dark:text-slate-200">{user.correo}</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-700 dark:text-slate-200">
                Accede rápidamente a tu información, ajustes y opciones de cierre de sesión desde el menú lateral.
              </p>
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700 dark:bg-slate-900/80 dark:text-slate-200">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Cuenta</p>
                <p className="mt-2 font-medium text-slate-950 dark:text-white">Usuario activo</p>
              </div>
              <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700 dark:bg-slate-900/80 dark:text-slate-200">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Última actualización</p>
                <p className="mt-2 font-medium text-slate-950 dark:text-white">{now.toLocaleDateString(LOCALE)}</p>
              </div>
            </div>
          </article>
        </section>
      </div>
    </AppShell>
  );
}
