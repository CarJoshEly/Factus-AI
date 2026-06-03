import { AppShell } from "@/components/AppShell";

export default async function ConfiguracionPage() {
  return (
    <AppShell>
      <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:shadow-none">
        <p className="text-xs uppercase tracking-[0.28em] text-slate-500 dark:text-slate-300">Módulo</p>
        <h2 className="mt-3 text-3xl font-semibold text-slate-950 dark:text-white">Configuración</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          En esta sección se configurarán ajustes de cuenta, preferencias y seguridad.
        </p>
      </div>
    </AppShell>
  );
}
