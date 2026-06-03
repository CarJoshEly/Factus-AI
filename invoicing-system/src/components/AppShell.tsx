import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ReactNode } from "react";
import logotipo from "@/assets/logotipo.png";
import { LogoutButton } from "@/components/LogoutButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getSessionUserId } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

const navItems = [
  {
    href: "/",
    label: "Inicio",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="m3 10.5 9-7 9 7" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 10v9.25A1.75 1.75 0 0 0 6.75 21h10.5A1.75 1.75 0 0 0 19 19.25V10" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 21v-6.5h6V21" />
      </svg>
    ),
  },
  {
    href: "/facturas",
    label: "Facturas",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 3.75h8.5L19 7.25v13A1.75 1.75 0 0 1 17.25 22H6.75A1.75 1.75 0 0 1 5 20.25V5.5A1.75 1.75 0 0 1 6.75 3.75Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 3.75V8h4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h8M8 15.5h8M8 19h5" />
      </svg>
    ),
  },
  {
    href: "/reportes",
    label: "Reportes",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 19.25h16" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V9m5 7V5m5 11v-4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.75 21h12.5A1.75 1.75 0 0 0 20 19.25V4.75A1.75 1.75 0 0 0 18.25 3H5.75A1.75 1.75 0 0 0 4 4.75v14.5A1.75 1.75 0 0 0 5.75 21Z" />
      </svg>
    ),
  },
  {
    href: "/configuracion",
    label: "Configuracion",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15.25A3.25 3.25 0 1 0 12 8.75a3.25 3.25 0 0 0 0 6.5Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.4 13.5a7.8 7.8 0 0 0 .05-1.5l2.05-1.6-2-3.46-2.58 1.04a8.11 8.11 0 0 0-1.3-.75L15.25 4h-4l-.37 3.23c-.46.2-.9.45-1.3.75L7 6.94l-2 3.46L7.05 12a7.8 7.8 0 0 0 .05 1.5L5.05 15.1l2 3.46 2.53-1.02c.41.31.86.57 1.33.77l.34 3.19h4l.34-3.19c.47-.2.92-.46 1.33-.77l2.53 1.02 2-3.46-2.05-1.6Z" />
      </svg>
    ),
  },
];

export async function AppShell({ children }: { children: ReactNode }) {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/login");
  }

  const fallbackUser = {
    id: userId,
    nombre: "Usuario FactusAI",
    correo: "usuario@factusai.local",
  };

  let user = fallbackUser;

  try {
    const dbUser = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { id: true, nombre: true, correo: true },
    });

    if (dbUser) {
      user = dbUser;
    }
  } catch (error) {
    console.error("AppShell fallback profile used:", error);
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="flex min-h-screen">
        <aside className="hidden w-80 flex-col border-r border-slate-200 bg-white/95 px-6 py-6 dark:border-white/10 dark:bg-slate-950/95 lg:flex">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-100/80 px-4 py-3 dark:border-white/10 dark:bg-white/5">
            <Image src={logotipo} alt="FactusAI" width={44} height={44} className="rounded-xl bg-white p-1" />
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500 dark:text-slate-300">FactusAI</p>
              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">Panel principal</p>
            </div>
          </div>

          <nav className="mt-8 flex flex-col gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0d3a71] text-white shadow-sm shadow-[#0d3a71]/20">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-auto rounded-3xl border border-slate-200 bg-slate-100/80 p-4 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center gap-3">
              <Image src={logotipo} alt="FactusAI" width={40} height={40} className="rounded-full bg-white p-1" />
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{user.nombre}</p>
                <p className="text-xs text-slate-600 dark:text-slate-300">{user.correo}</p>
              </div>
            </div>
            <p className="mt-4 rounded-2xl bg-white px-3 py-2 text-xs text-slate-600 dark:bg-white/5 dark:text-slate-200">
              Perfil del usuario con acceso rapido y cierre de sesion.
            </p>
            <div className="mt-4">
              <LogoutButton />
            </div>
          </div>
        </aside>

        <div className="flex-1">
          <header className="border-b border-slate-200 bg-white/90 px-5 py-4 backdrop-blur dark:border-white/10 dark:bg-slate-950/90 lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">Dashboard</p>
                <h1 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white lg:text-2xl">Bienvenido al panel</h1>
              </div>

              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/5">
                  <ThemeToggle />
                </div>

                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                  <Image src={logotipo} alt="FactusAI" width={36} height={36} className="rounded-full bg-white p-1" />
                  <div className="hidden sm:block">
                    <p className="font-medium text-slate-900 dark:text-white">{user.nombre}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300">{user.correo}</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="p-5 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
