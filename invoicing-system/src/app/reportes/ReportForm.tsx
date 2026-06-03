"use client";

import { useState, useEffect } from "react";

export default function ReportForm() {
  const [period, setPeriod] = useState("");
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [method, setMethod] = useState<"email" | "whatsapp">("email");
  const [recipient, setRecipient] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [status, setStatus] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Cargar facturas cuando cambia el periodo (YYYY-MM)
  useEffect(() => {
    if (period) {
      fetchInvoices();
    }
  }, [period]);

  async function fetchInvoices() {
    setFetching(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/reports/summary?period=${period}`);
      
      if (!res.ok) {
        console.error("Error al obtener facturas:", res.statusText);
        return;
      }

      const data = await res.json();
      setInvoices(data);
      setSelectedIds(data.map((inv: any) => inv.id)); // Por defecto seleccionamos todas
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedIds.length === 0) {
      setStatus({ text: "Selecciona al menos una factura para incluir en el reporte.", type: "error" });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const response = await fetch("/api/reports/send", {
        method: "POST",
        body: JSON.stringify({
          period,
          method,
          destinatario: recipient,
          invoiceIds: selectedIds,
        }),
      });

      const data = await response.json();
      
      if (data.whatsappUrl) {
        window.open(data.whatsappUrl, "_blank");
      }

      if (response.ok) {
        setStatus({ text: data.message || "¡Reporte enviado con éxito!", type: "success" });
        // Esperamos un momento para que el usuario lea el mensaje antes de recargar
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setStatus({ text: data.error || "Error al procesar el reporte.", type: "error" });
      }
    } catch (error) {
      setStatus({ text: "Error de conexión. Inténtalo de nuevo.", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  const toggleInvoice = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Mes del Reporte</label>
        <input
          type="month"
          required
          className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm dark:border-white/10 dark:bg-white/5"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        />
      </div>

      {period && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Facturas encontradas ({invoices.length})</p>
          <div className="max-h-40 overflow-y-auto rounded-2xl border border-slate-200 p-2 dark:border-white/10">
            {fetching ? (
              <p className="p-4 text-center text-xs text-slate-500">Buscando...</p>
            ) : invoices.length > 0 ? (
              invoices.map((inv) => (
                <label key={inv.id} className="flex cursor-pointer items-center gap-3 rounded-xl p-2 hover:bg-slate-50 dark:hover:bg-white/5">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(inv.id)}
                    onChange={() => toggleInvoice(inv.id)}
                    className="h-4 w-4 rounded border-slate-300 text-[#18a57c]"
                  />
                  <div className="flex-1 text-xs">
                    <p className="font-medium">{inv.proveedor}</p>
                    <p className="text-slate-500">L {Number(inv.monto).toFixed(2)}</p>
                  </div>
                </label>
              ))
            ) : (
              <p className="p-4 text-center text-xs text-slate-500">No hay facturas en este mes.</p>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => setMethod("email")}
          className={`rounded-2xl py-2 text-xs font-semibold transition ${
            method === "email" ? "bg-[#0d3a71] text-white" : "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400"
          }`}
        >
          Email
        </button>
        <button
          type="button"
          onClick={() => setMethod("whatsapp")}
          className={`rounded-2xl py-2 text-xs font-semibold transition ${
            method === "whatsapp" ? "bg-[#18a57c] text-white" : "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400"
          }`}
        >
          WhatsApp
        </button>
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {method === "email" ? "Correo electrónico" : "Número de teléfono"}
        </label>
        <input
          type={method === "email" ? "email" : "tel"}
          required
          placeholder={method === "email" ? "ejemplo@correo.com" : "50499887766"}
          className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm dark:border-white/10 dark:bg-white/5"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
        />
      </div>

      {status && (
        <div className={`flex items-center gap-3 rounded-2xl p-4 text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-300 ${
          status.type === 'success' 
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20' 
            : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20'
        }`}>
          <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${status.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          <p className="flex-1">{status.text}</p>
          <button type="button" onClick={() => setStatus(null)} className="opacity-40 hover:opacity-100 transition">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      )}

      <button
        disabled={loading || (period !== "" && invoices.length === 0)}
        className="w-full rounded-full bg-[#0d3a71] py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Procesando..." : "Generar y Enviar"}
      </button>
    </form>
  );
}