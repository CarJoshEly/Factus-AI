"use client";

import { useState } from "react";

interface SettingsFormProps {
  initialData: { nombre: string; correo: string };
}

export default function SettingsForm({ initialData }: SettingsFormProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ text: string; type: "success" | "error" } | null>(null);
  
  const [profile, setProfile] = useState(initialData);
  const [security, setSecurity] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch("/api/usuario/config", {
        method: "PATCH",
        body: JSON.stringify({ type: "profile", ...profile }),
      });
      
      if (!res.ok) throw new Error("Error al actualizar el perfil");
      setStatus({ text: "Perfil actualizado correctamente.", type: "success" });
    } catch (err: any) {
      setStatus({ text: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (security.newPassword !== security.confirmPassword) {
      setStatus({ text: "Las contraseñas no coinciden.", type: "error" });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch("/api/usuario/config", {
        method: "PATCH",
        body: JSON.stringify({ type: "password", ...security }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al cambiar contraseña");

      setStatus({ text: "Contraseña actualizada con éxito.", type: "success" });
      setSecurity({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      setStatus({ text: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-4 md:p-8">
      <div>
        <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Mi Cuenta</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Configuración</h1>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm transition-all hover:shadow-md">
          <h2 className="mb-6 text-xl font-bold text-slate-800">Información General</h2>
          <form onSubmit={handleUpdateProfile} className="space-y-5">
            <div>
              <label className="ml-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Nombre Completo</label>
              <input
                type="text"
                className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5"
                value={profile.nombre}
                onChange={(e) => setProfile({ ...profile, nombre: e.target.value })}
              />
            </div>
            <div>
              <label className="ml-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Email</label>
              <input
                type="email"
                className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5"
                value={profile.correo}
                onChange={(e) => setProfile({ ...profile, correo: e.target.value })}
              />
            </div>
            <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 py-3 text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50">
              {loading && <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/20 border-t-white" />}
              Guardar Cambios
            </button>
          </form>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm transition-all hover:shadow-md">
          <h2 className="mb-6 text-xl font-bold text-slate-800">Seguridad</h2>
          <form onSubmit={handleUpdatePassword} className="space-y-5">
            <div>
              <label className="ml-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Contraseña Actual</label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  required
                  className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 pr-20 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5"
                  value={security.currentPassword}
                  onChange={(e) => setSecurity({ ...security, currentPassword: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600 hover:bg-slate-300"
                >
                  {showCurrent ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-4">
              <label className="ml-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Nueva Contraseña</label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  required
                  className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 pr-20 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5"
                  value={security.newPassword}
                  onChange={(e) => setSecurity({ ...security, newPassword: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600 hover:bg-slate-300"
                >
                  {showNew ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </div>
            <div>
              <label className="ml-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Confirmar Nueva Contraseña</label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  required
                  className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 pr-20 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5"
                  value={security.confirmPassword}
                  onChange={(e) => setSecurity({ ...security, confirmPassword: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600 hover:bg-slate-300"
                >
                  {showConfirm ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </div>
            <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 py-3 text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50">
              {loading && <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/20 border-t-white" />}
              Actualizar Contraseña
            </button>
          </form>
        </section>
      </div>

      {status && (
        <div className={`flex items-center gap-3 rounded-2xl p-4 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 duration-300 ${status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
          <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${status.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          <p className="flex-1">{status.text}</p>
          <button type="button" onClick={() => setStatus(null)} className="opacity-40 hover:opacity-100"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
        </div>
      )}
    </div>
  );
}
