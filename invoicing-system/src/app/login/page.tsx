"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import logotipo from "@/assets/logotipo.png";

export default function LoginPage() {
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ correo, contrasena }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || "No se pudo iniciar sesión.");
        return;
      }

      router.replace("/");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error) || "Error desconocido";
      setError(`No se pudo conectar con el servidor. ${message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_100px_rgba(13,58,113,0.08)] sm:px-10">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="relative hidden overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#0d3a71] via-[#1762a3] to-[#18a57c] p-10 text-white shadow-inner lg:block">
            <div className="absolute inset-0 opacity-20 blur-3xl">
              <div className="absolute left-[-20%] top-12 h-52 w-52 rounded-full bg-cyan-400/40" />
              <div className="absolute right-[-12%] top-32 h-44 w-44 rounded-full bg-emerald-400/30" />
            </div>
            <div className="relative z-10 flex h-full flex-col justify-between">
              <div>
                <Image
                  src={logotipo}
                  alt="FactusAI"
                  width={92}
                  height={92}
                  className="mb-8 rounded-3xl border border-white/20 bg-white/10 p-3"
                />
                <h1 className="text-4xl font-semibold tracking-tight">
                  Bienvenido a FactusAI
                </h1>
                <p className="mt-5 max-w-md text-base leading-7 text-slate-100/90">
                  Controla tus facturas con inteligencia y lleva tu gestión contable al siguiente nivel.
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/10 p-6 text-sm leading-6 text-slate-200 shadow-lg shadow-slate-900/10">
                <p className="font-medium">Nuevo usuario?</p>
                <p className="mt-2 text-slate-200/90">
                  Crea tu cuenta para comenzar a administrar tus facturas de forma segura.
                </p>
                <Link
                  href="/register"
                  className="mt-5 inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#0d3a71] transition hover:bg-slate-100"
                >
                  Registrar cuenta
                </Link>
              </div>
            </div>
          </div>

          <div className="px-6 py-10 sm:px-12">
            <div className="mx-auto max-w-md">
              <div className="mb-8 flex items-center gap-3">
                <Image src={logotipo} alt="FactusAI" width={48} height={48} className="rounded-2xl" />
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-slate-500">FactusAI</p>
                  <h2 className="text-3xl font-semibold text-slate-900">Iniciar sesión</h2>
                </div>
              </div>

              <form className="space-y-6" onSubmit={handleSubmit}>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Correo electrónico
                  </label>
                  <input
                    value={correo}
                    onChange={(event) => setCorreo(event.target.value)}
                    type="email"
                    autoComplete="email"
                    placeholder="tu@correo.com"
                    className="w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#0d3a71] focus:ring-2 focus:ring-[#18a57c]/20"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      value={contrasena}
                      onChange={(event) => setContrasena(event.target.value)}
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      minLength={8}
                      className="w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 pr-28 text-sm text-slate-900 outline-none transition focus:border-[#0d3a71] focus:ring-2 focus:ring-[#18a57c]/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-300"
                    >
                      {showPassword ? "Ocultar" : "Mostrar"}
                    </button>
                  </div>
                </div>

                {error ? (
                  <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full justify-center rounded-3xl bg-[#0d3a71] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0b315f] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? "Validando..." : "Ingresar"}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-500">
                ¿No tienes cuenta?{
                " "}
                <Link href="/register" className="font-semibold text-[#0d3a71] hover:text-[#165b8c]">
                  Regístrate aquí
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
