"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ToastContainer, useToast } from "./Toast";

interface CatalogOption {
  id: number;
  nombre: string;
}

interface InvoiceRecord {
  id: number;
  fecha: string;
  proveedor: string;
  monto: number;
  descripcion: string | null;
  imagen: string | null;
  estado: string;
  facturaFisico: boolean;
  tipoGasto: CatalogOption;
  tipoFactura: CatalogOption;
  tipoDocumento: CatalogOption;
}

interface ExtractedData {
  fecha?: string;
  proveedor?: string;
  monto?: number;
  categoria?: string;
}

const today = new Date().toISOString().slice(0, 10);

const initialForm = {
  fecha: today,
  proveedor: "",
  monto: "",
  descripcion: "",
  tipoGastoId: "",
  tipoFacturaId: "",
  tipoDocumentoId: "",
  estado: "pendiente",
  facturaFisico: false,
};

function formatCurrency(value: number) {
  return `L ${new Intl.NumberFormat("es-HN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;
}

function UploadIcon() {
  return (
    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0 4.5 4.5M12 4 7.5 8.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.5v2.25A2.25 2.25 0 0 0 6.75 20h10.5a2.25 2.25 0 0 0 2.25-2.25V15.5" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="m12 3 1.7 5.1L19 10l-5.3 1.9L12 17l-1.7-5.1L5 10l5.3-1.9L12 3Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" />
    </svg>
  );
}

export function SmartInvoicePage() {
  const router = useRouter();
  const { toasts, removeToast, success, error: showError, warning } = useToast();
  const [catalog, setCatalog] = useState({
    categorias: [] as CatalogOption[],
    tipos: [] as CatalogOption[],
    documentos: [] as CatalogOption[],
  });
  const [recentInvoices, setRecentInvoices] = useState<InvoiceRecord[]>([]);
  const [form, setForm] = useState(initialForm);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [editingInvoice, setEditingInvoice] = useState<InvoiceRecord | null>(null);
  const [deleteInvoice, setDeleteInvoice] = useState<InvoiceRecord | null>(null);

  const selectedCategoryName = useMemo(() => {
    return catalog.categorias.find((item) => String(item.id) === form.tipoGastoId)?.nombre ?? "Sin categoria";
  }, [catalog.categorias, form.tipoGastoId]);

  const monthlyTotal = recentInvoices.reduce((sum, invoice) => sum + Number(invoice.monto), 0);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const loadCatalog = useCallback(async () => {
    setIsLoadingCatalog(true);
    try {
      const month = new Date().toISOString().slice(0, 7);
      const response = await fetch(`/api/facturas?includeCatalog=true&month=${month}`);
      if (!response.ok) {
        throw new Error("No se pudo cargar la informacion de facturas.");
      }

      const data = await response.json();
      const nextCatalog = data.catalog ?? { categorias: [], tipos: [], documentos: [] };
      const invoices = Array.isArray(data.invoices) ? data.invoices : [];

      setCatalog(nextCatalog);
      setRecentInvoices(invoices);
      setForm((current) => ({
        ...current,
        tipoGastoId: current.tipoGastoId || String(nextCatalog.categorias?.[0]?.id ?? ""),
        tipoFacturaId: current.tipoFacturaId || String(nextCatalog.tipos?.[0]?.id ?? ""),
        tipoDocumentoId: current.tipoDocumentoId || String(nextCatalog.documentos?.[0]?.id ?? ""),
      }));
    } catch (err) {
      showError(err instanceof Error ? err.message : "No se pudo cargar la pagina.");
    } finally {
      setIsLoadingCatalog(false);
    }
  }, [showError]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadCatalog();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadCatalog]);

  async function createCategory(nombre: string) {
    const cleanName = nombre.trim();
    if (!cleanName) return null;

    const existing = catalog.categorias.find((item) => item.nombre.toLowerCase() === cleanName.toLowerCase());
    if (existing) return existing;

    const response = await fetch("/api/facturas/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "categoria", nombre: cleanName }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const item = data.item as CatalogOption;
    setCatalog((current) => ({ ...current, categorias: [...current.categorias, item] }));
    return item;
  }

  async function applyExtractedData(data: ExtractedData) {
    let nextCategoryId = form.tipoGastoId;
    if (data.categoria) {
      const category = await createCategory(data.categoria);
      if (category) nextCategoryId = String(category.id);
    }

    setForm((current) => ({
      ...current,
      fecha: data.fecha || current.fecha,
      proveedor: data.proveedor || current.proveedor,
      monto: data.monto ? String(data.monto) : current.monto,
      tipoGastoId: nextCategoryId || current.tipoGastoId,
    }));
  }

  async function processWithAI(fileToProcess: File) {
    setIsProcessing(true);
    const data = new FormData();
    data.append("file", fileToProcess);

    try {
      const response = await fetch("/api/facturas/process-ai", {
        method: "POST",
        body: data,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "La lectura automatica no esta disponible.");
      }

      const payload = await response.json();
      if (payload.extractedData) {
        await applyExtractedData(payload.extractedData);
        success("Datos extraidos. Revisa antes de guardar.");
      }
    } catch (err) {
      warning(err instanceof Error ? err.message : "Completa los datos manualmente.");
    } finally {
      setIsProcessing(false);
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (previewUrl) URL.revokeObjectURL(previewUrl);

    setFile(selectedFile);
    setPreviewUrl(selectedFile.type.startsWith("image/") ? URL.createObjectURL(selectedFile) : null);
    processWithAI(selectedFile);
  }

  function clearFile() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
  }

  function resetForm() {
    clearFile();
    setEditingInvoice(null);
    setForm((current) => ({
      ...initialForm,
      tipoGastoId: current.tipoGastoId,
      tipoFacturaId: current.tipoFacturaId,
      tipoDocumentoId: current.tipoDocumentoId,
    }));
  }

  function handleEdit(invoice: InvoiceRecord) {
    clearFile();
    setEditingInvoice(invoice);
    setForm({
      fecha: invoice.fecha.slice(0, 10),
      proveedor: invoice.proveedor,
      monto: String(invoice.monto),
      descripcion: invoice.descripcion ?? "",
      tipoGastoId: String(invoice.tipoGasto.id),
      tipoFacturaId: String(invoice.tipoFactura.id),
      tipoDocumentoId: String(invoice.tipoDocumento.id),
      estado: invoice.estado,
      facturaFisico: invoice.facturaFisico,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.proveedor.trim() || !form.fecha || !form.monto || !form.tipoGastoId || !form.tipoFacturaId || !form.tipoDocumentoId) {
      showError("Completa los campos obligatorios.");
      return;
    }

    setIsSaving(true);
    try {
      const data = new FormData();
      data.append("fecha", form.fecha);
      data.append("proveedor", form.proveedor.trim());
      data.append("monto", form.monto);
      data.append("descripcion", form.descripcion.trim());
      data.append("tipoGastoId", form.tipoGastoId);
      data.append("tipoFacturaId", form.tipoFacturaId);
      data.append("tipoDocumentoId", form.tipoDocumentoId);
      data.append("estado", form.estado);
      data.append("facturaFisico", String(form.facturaFisico));
      if (file) data.append("archivo", file);

      const response = await fetch(editingInvoice ? `/api/facturas/${editingInvoice.id}` : "/api/facturas", {
        method: editingInvoice ? "PATCH" : "POST",
        body: data,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "No se pudo guardar la factura.");
      }

      const payload = await response.json();
      const savedInvoice = payload.invoice as InvoiceRecord;
      setRecentInvoices((current) =>
        editingInvoice
          ? current.map((invoice) => (invoice.id === savedInvoice.id ? savedInvoice : invoice))
          : [savedInvoice, ...current]
      );
      resetForm();
      success(editingInvoice ? "Factura actualizada correctamente." : "Factura guardada correctamente.");
      router.refresh();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Error al guardar la factura.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(invoice: InvoiceRecord) {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/facturas/${invoice.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "No se pudo eliminar la factura.");
      }

      setRecentInvoices((current) => current.filter((item) => item.id !== invoice.id));
      if (editingInvoice?.id === invoice.id) {
        resetForm();
      }
      setDeleteInvoice(null);
      success("Factura eliminada correctamente.");
      router.refresh();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Error al eliminar la factura.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none">
        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_320px] lg:p-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#18a57c]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#0f6a4f] dark:text-[#9bf4d6]">
              <SparkIcon />
              Factura inteligente
            </div>
            <h2 className="mt-4 text-3xl font-semibold text-slate-950 dark:text-white">
              {editingInvoice ? "Editar factura" : "Registrar factura"}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              {editingInvoice
                ? "Actualiza los datos o reemplaza el archivo adjunto. Los cambios se guardan en la base de datos y Supabase."
                : "Sube una imagen o PDF, confirma los datos extraidos y guarda el registro con sus clasificaciones contables."}
            </p>
            {editingInvoice ? (
              <button
                type="button"
                onClick={resetForm}
                className="mt-4 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
              >
                Cancelar edicion
              </button>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-white/10 dark:bg-slate-950/50">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Este mes</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{recentInvoices.length}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Total</p>
              <p className="mt-2 text-2xl font-semibold text-[#0f6a4f] dark:text-[#9bf4d6]">{formatCurrency(monthlyTotal)}</p>
            </div>
          </div>
        </div>
      </section>

      <form className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]" onSubmit={handleSave}>
        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-300">Archivo</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">Comprobante</h3>
            </div>
            {file ? (
              <button type="button" onClick={clearFile} className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5">
                Quitar
              </button>
            ) : null}
          </div>

          <label className="mt-5 flex min-h-[430px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50 text-center transition hover:border-[#18a57c] hover:bg-[#18a57c]/5 dark:border-white/10 dark:bg-slate-950/60 dark:hover:border-[#18a57c]/70">
            <input className="sr-only" type="file" accept="image/*,application/pdf" onChange={handleFileChange} />
            {previewUrl ? (
              <img src={previewUrl} alt="Vista previa de la factura" className="h-full max-h-[410px] w-full object-contain p-4" />
            ) : file ? (
              <div className="px-6">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0d3a71]/10 text-[#0d3a71] dark:bg-[#0d3a71]/40 dark:text-[#d4e1ff]">
                  <UploadIcon />
                </div>
                <p className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">{file.name}</p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">PDF seleccionado. Puedes guardar o cambiar el archivo.</p>
              </div>
            ) : editingInvoice?.imagen ? (
              <div className="px-6">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0d3a71]/10 text-[#0d3a71] dark:bg-[#0d3a71]/40 dark:text-[#d4e1ff]">
                  <UploadIcon />
                </div>
                <p className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">Archivo actual guardado</p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">Selecciona otro archivo si deseas reemplazarlo en Supabase.</p>
                <a
                  href={editingInvoice.imagen}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex rounded-full bg-[#0d3a71] px-5 py-2.5 text-sm font-semibold text-white shadow-sm"
                  onClick={(event) => event.stopPropagation()}
                >
                  Ver archivo actual
                </a>
              </div>
            ) : (
              <div className="px-6">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0d3a71]/10 text-[#0d3a71] dark:bg-[#0d3a71]/40 dark:text-[#d4e1ff]">
                  <UploadIcon />
                </div>
                <p className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">Arrastra o selecciona una factura</p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">Imagen o PDF, maximo 50MB.</p>
                <span className="mt-5 inline-flex rounded-full bg-[#0d3a71] px-5 py-2.5 text-sm font-semibold text-white shadow-sm">
                  Seleccionar archivo
                </span>
              </div>
            )}
          </label>

          {isProcessing ? (
            <div className="mt-4 rounded-2xl border border-[#18a57c]/30 bg-[#18a57c]/10 px-4 py-3 text-sm font-medium text-[#0f6a4f] dark:text-[#9bf4d6]">
              Analizando factura con IA...
            </div>
          ) : null}
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-300">Datos</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">Verificar y guardar</h3>
          </div>

          <div className="mt-5 grid gap-4">
            <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              Proveedor
              <input
                required
                value={form.proveedor}
                onChange={(event) => setForm((current) => ({ ...current, proveedor: event.target.value }))}
                placeholder="Ej. Supermercado La Colonia"
                className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-[#18a57c] focus:bg-white focus:ring-2 focus:ring-[#18a57c]/20 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                Fecha
                <input
                  type="date"
                  required
                  value={form.fecha}
                  onChange={(event) => setForm((current) => ({ ...current, fecha: event.target.value }))}
                  className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-[#18a57c] focus:bg-white focus:ring-2 focus:ring-[#18a57c]/20 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                Monto total
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={form.monto}
                  onChange={(event) => setForm((current) => ({ ...current, monto: event.target.value }))}
                  placeholder="0.00"
                  className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-[#18a57c] focus:bg-white focus:ring-2 focus:ring-[#18a57c]/20 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                Categoria
                <select
                  required
                  value={form.tipoGastoId}
                  disabled={isLoadingCatalog}
                  onChange={(event) => setForm((current) => ({ ...current, tipoGastoId: event.target.value }))}
                  className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-[#18a57c] focus:bg-white focus:ring-2 focus:ring-[#18a57c]/20 disabled:opacity-60 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100"
                >
                  <option value="">Selecciona</option>
                  {catalog.categorias.map((item) => (
                    <option key={item.id} value={item.id}>{item.nombre}</option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                Tipo
                <select
                  required
                  value={form.tipoFacturaId}
                  disabled={isLoadingCatalog}
                  onChange={(event) => setForm((current) => ({ ...current, tipoFacturaId: event.target.value }))}
                  className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-[#18a57c] focus:bg-white focus:ring-2 focus:ring-[#18a57c]/20 disabled:opacity-60 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100"
                >
                  <option value="">Selecciona</option>
                  {catalog.tipos.map((item) => (
                    <option key={item.id} value={item.id}>{item.nombre}</option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                Documento
                <select
                  required
                  value={form.tipoDocumentoId}
                  disabled={isLoadingCatalog}
                  onChange={(event) => setForm((current) => ({ ...current, tipoDocumentoId: event.target.value }))}
                  className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-[#18a57c] focus:bg-white focus:ring-2 focus:ring-[#18a57c]/20 disabled:opacity-60 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100"
                >
                  <option value="">Selecciona</option>
                  {catalog.documentos.map((item) => (
                    <option key={item.id} value={item.id}>{item.nombre}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              Descripcion
              <textarea
                rows={4}
                value={form.descripcion}
                onChange={(event) => setForm((current) => ({ ...current, descripcion: event.target.value }))}
                placeholder="Notas internas, numero de factura o detalle del gasto"
                className="resize-none rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-[#18a57c] focus:bg-white focus:ring-2 focus:ring-[#18a57c]/20 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>

            <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 dark:bg-slate-950/60 dark:text-slate-200 md:grid-cols-2">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={form.facturaFisico}
                  onChange={(event) => setForm((current) => ({ ...current, facturaFisico: event.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Factura fisica
              </label>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Categoria seleccionada</p>
                <p className="mt-1 font-semibold text-slate-950 dark:text-white">{selectedCategoryName}</p>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving || isProcessing || isLoadingCatalog}
              className="mt-1 inline-flex w-full items-center justify-center rounded-2xl bg-[#18a57c] px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#138c69] disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSaving ? "Guardando factura..." : editingInvoice ? "Actualizar factura" : "Guardar factura"}
            </button>
          </div>
        </section>
      </form>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-300">Actividad</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">Facturas registradas</h3>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200 dark:border-white/10">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-white/10">
            <thead className="bg-slate-100 text-slate-600 dark:bg-slate-900/80 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3 font-medium">Proveedor</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Categoria</th>
                <th className="px-4 py-3 font-medium">Monto</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white text-slate-900 dark:divide-white/10 dark:bg-slate-950/60 dark:text-slate-100">
              {recentInvoices.length > 0 ? (
                recentInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                    <td className="px-4 py-3 font-medium">{invoice.proveedor}</td>
                    <td className="px-4 py-3">{new Date(invoice.fecha).toLocaleDateString("es-HN")}</td>
                    <td className="px-4 py-3">{invoice.tipoGasto?.nombre ?? "Sin categoria"}</td>
                    <td className="px-4 py-3">{formatCurrency(Number(invoice.monto))}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-[#18a57c]/20 px-2.5 py-1 text-xs font-medium text-[#0f6a4f] dark:text-[#9bf4d6]">
                        {invoice.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(invoice)}
                          className="rounded-full bg-[#0d3a71] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#0b315f]"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteInvoice(invoice)}
                          className="rounded-full bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500 dark:text-slate-300">
                    No hay facturas registradas este mes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {deleteInvoice ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-500/20">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.35 9m-4.78 0L9.26 9m9.97-3.21c.34.05.68.1 1.02.16m-1.02-.16L18.16 19.67A2.25 2.25 0 0 1 15.92 21H8.08a2.25 2.25 0 0 1-2.24-1.33L4.77 5.79m14.46 0A48.1 48.1 0 0 0 15.75 5m-12 .56c.34-.06.68-.11 1.02-.16m0 0A48.1 48.1 0 0 1 8.25 5m7.5 0v-.92A2.25 2.25 0 0 0 13.5 1.83h-3A2.25 2.25 0 0 0 8.25 4.08V5m7.5 0a48.67 48.67 0 0 0-7.5 0" />
              </svg>
            </div>
            <div className="mt-4 text-center">
              <h3 className="text-xl font-bold text-slate-950 dark:text-white">Eliminar factura</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Vas a eliminar la factura de <span className="font-semibold">{deleteInvoice.proveedor}</span>. Esta accion no se puede deshacer y tambien eliminara su archivo adjunto de Supabase si existe.
              </p>
            </div>
            <div className="mt-6 grid gap-3">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleDelete(deleteInvoice)}
                className="rounded-2xl bg-rose-600 py-3 text-sm font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSaving ? "Eliminando..." : "Si, eliminar factura"}
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setDeleteInvoice(null)}
                className="rounded-2xl bg-slate-100 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white/5 dark:text-white"
              >
                No, cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
