"use client";

import { useEffect, useMemo, useState } from "react";
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

const todayDate = new Date().toISOString().slice(0, 10);

const emptyForm = {
  fecha: todayDate,
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
  const formatted = new Intl.NumberFormat("es-HN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

  return `L ${formatted}`;
}

export function InvoiceManager() {
  const { toasts, removeToast, success, error: showError } = useToast();
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [catalog, setCatalog] = useState({
    categorias: [] as CatalogOption[],
    tipos: [] as CatalogOption[],
    documentos: [] as CatalogOption[],
  });
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newTipoName, setNewTipoName] = useState("");
  const [newDocumentoName, setNewDocumentoName] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const matchesCategory = selectedCategory === "all" || String(invoice.tipoGasto.id) === selectedCategory;
      const matchesSearch = `${invoice.proveedor} ${invoice.descripcion ?? ""}`.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [invoices, selectedCategory, search]);

  const totalFiltered = filteredInvoices.reduce((sum, invoice) => sum + Number(invoice.monto), 0);

  async function loadData() {
    setLoading(true);
    try {
      const response = await fetch(`/api/facturas?includeCatalog=true&month=${encodeURIComponent(month)}`);
      if (!response.ok) {
        throw new Error("No se pudieron cargar las facturas.");
      }

      const result = await response.json();
      const invoiceList = Array.isArray(result.invoices) ? result.invoices : [];
      const nextCatalog = result.catalog ?? { categorias: [], tipos: [], documentos: [] };

      setInvoices(invoiceList);
      setCatalog(nextCatalog);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [month]);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setNewCategoryName("");
    setNewTipoName("");
    setNewDocumentoName("");
  }

  async function createCatalogOption(kind: "categoria" | "tipo" | "documento", nombre: string) {
    if (!nombre.trim()) {
      showError("Ingresa un nombre válido.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/facturas/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, nombre: nombre.trim() }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "No se pudo crear el elemento.");
      }

      const payload = await response.json();
      const item = payload.item as CatalogOption;

      await loadData();
      const mensaje =
        kind === "categoria"
          ? `Categoría '${item.nombre}' creada.`
          : kind === "tipo"
            ? `Tipo de factura '${item.nombre}' creado.`
            : `Tipo de documento '${item.nombre}' creado.`;
      success(mensaje);

      setForm((current) => {
        if (kind === "categoria") {
          return { ...current, tipoGastoId: String(item.id) };
        }
        if (kind === "tipo") {
          return { ...current, tipoFacturaId: String(item.id) };
        }
        return { ...current, tipoDocumentoId: String(item.id) };
      });

      if (kind === "categoria") setNewCategoryName("");
      if (kind === "tipo") setNewTipoName("");
      if (kind === "documento") setNewDocumentoName("");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Error al crear el elemento.");
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(invoice: InvoiceRecord) {
    setEditingId(invoice.id);
    setSelectedInvoice(invoice);
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
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);

    try {
      const formData = new FormData();
      
      // Normalización UTC para evitar el error del día anterior
      const [year, month, day] = form.fecha.split("-").map(Number);
      const normalizedDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).toISOString();
      
      formData.append("fecha", normalizedDate);
      formData.append("proveedor", form.proveedor.trim());
      formData.append("monto", form.monto);
      formData.append("descripcion", form.descripcion);
      formData.append("tipoGastoId", form.tipoGastoId);
      formData.append("tipoFacturaId", form.tipoFacturaId);
      formData.append("tipoDocumentoId", form.tipoDocumentoId);
      formData.append("estado", form.estado);
      formData.append("facturaFisico", String(form.facturaFisico));

      const fileInput = (event.currentTarget.elements.namedItem("archivo") as HTMLInputElement | null);
      if (fileInput?.files?.[0]) {
        formData.append("archivo", fileInput.files[0]);
      }

      const url = editingId ? `/api/facturas/${editingId}` : "/api/facturas";
      const method = editingId ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "No se pudo guardar la factura.");
      }

      const payload = await response.json();
      const savedInvoice = payload.invoice as InvoiceRecord;

      setInvoices((current) =>
        editingId
          ? current.map((invoice) => (invoice.id === savedInvoice.id ? savedInvoice : invoice))
          : [savedInvoice, ...current]
      );
      setSelectedInvoice(savedInvoice);
      const mensaje = editingId ? "Factura actualizada correctamente." : "Factura registrada correctamente.";
      success(mensaje);
      resetForm();
      await loadData();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Error al guardar la factura.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(invoiceId: number) {

    setDeleteId(null);
    setLoading(true);

    try {
      const response = await fetch(`/api/facturas/${invoiceId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "No se pudo eliminar la factura.");
      }

      setInvoices((current) => current.filter((invoice) => invoice.id !== invoiceId));
      if (selectedInvoice?.id === invoiceId) {
        setSelectedInvoice(null);
      }
      success("Factura eliminada correctamente.");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Error al eliminar la factura.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white/85 p-6 shadow-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500 dark:text-slate-300">Gestión</p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-950 dark:text-white">Facturas</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Suba archivos, registre facturas manualmente, filtre por mes o categoría y gestione sus documentos desde un solo lugar.
            </p>
          </div>

          <div className="grid gap-2 rounded-2xl border border-[#18a57c]/30 bg-[#18a57c]/10 px-4 py-3 text-sm text-[#0f6a4f] dark:text-[#9bf4d6] md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[#0f6a4f]/80 dark:text-[#9bf4d6]/80">Registros</p>
              <p className="mt-1 text-xl font-semibold">{invoices.length}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[#0f6a4f]/80 dark:text-[#9bf4d6]/80">Monto filtrado</p>
              <p className="mt-1 text-xl font-semibold">{formatCurrency(totalFiltered)}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500 dark:text-slate-300">Formulario</p>
              <h3 className="mt-3 text-2xl font-semibold text-slate-950 dark:text-white">{editingId ? "Editar factura" : "Nueva factura"}</h3>
            </div>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
              >
                Cancelar
              </button>
            )}
          </div>

          <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                Fecha
                <input
                  type="date"
                  required
                  value={form.fecha}
                  onChange={(event) => setForm((current) => ({ ...current, fecha: event.target.value }))}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none ring-0 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                Proveedor
                <input
                  type="text"
                  required
                  value={form.proveedor}
                  onChange={(event) => setForm((current) => ({ ...current, proveedor: event.target.value }))}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none ring-0 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                Monto (L)
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={form.monto}
                  onChange={(event) => setForm((current) => ({ ...current, monto: event.target.value }))}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none ring-0 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                Estado
                <select
                  value={form.estado}
                  onChange={(event) => setForm((current) => ({ ...current, estado: event.target.value }))}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none ring-0 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100"
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="procesada">Procesada</option>
                  <option value="archivada">Archivada</option>
                </select>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                Categoría
                <select
                  required
                  value={form.tipoGastoId}
                  onChange={(event) => setForm((current) => ({ ...current, tipoGastoId: event.target.value }))}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none ring-0 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100"
                >
                  <option value="">Selecciona</option>
                  {catalog.categorias.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                Tipo de factura
                <select
                  required
                  value={form.tipoFacturaId}
                  onChange={(event) => setForm((current) => ({ ...current, tipoFacturaId: event.target.value }))}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none ring-0 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100"
                >
                  <option value="">Selecciona</option>
                  {catalog.tipos.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                Tipo de documento
                <select
                  required
                  value={form.tipoDocumentoId}
                  onChange={(event) => setForm((current) => ({ ...current, tipoDocumentoId: event.target.value }))}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none ring-0 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100"
                >
                  <option value="">Selecciona</option>
                  {catalog.documentos.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nombre}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5 space-y-4">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Gestionar Opciones</p>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Nueva Categoría</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(event) => setNewCategoryName(event.target.value)}
                      placeholder="Ej. Salud"
                      className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none dark:border-white/10 dark:bg-slate-950"
                    />
                    <button
                      type="button"
                      onClick={() => createCatalogOption("categoria", newCategoryName)}
                      className="rounded-xl bg-[#0d3a71] px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-90"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Nuevo Tipo Factura</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTipoName}
                      onChange={(event) => setNewTipoName(event.target.value)}
                      placeholder="Ej. Crédito"
                      className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none dark:border-white/10 dark:bg-slate-950"
                    />
                    <button
                      type="button"
                      onClick={() => createCatalogOption("tipo", newTipoName)}
                      className="rounded-xl bg-[#0d3a71] px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-90"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Nuevo Doc.</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newDocumentoName}
                      onChange={(event) => setNewDocumentoName(event.target.value)}
                      placeholder="Ej. Ticket"
                      className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none dark:border-white/10 dark:bg-slate-950"
                    />
                    <button
                      type="button"
                      onClick={() => createCatalogOption("documento", newDocumentoName)}
                      className="rounded-xl bg-[#0d3a71] px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-90"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              Descripción
              <textarea
                rows={4}
                value={form.descripcion}
                onChange={(event) => setForm((current) => ({ ...current, descripcion: event.target.value }))}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none ring-0 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              Archivo (imagen o PDF)
              <input
                name="archivo"
                type="file"
                accept="image/*,.pdf"
                className="rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>

            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={form.facturaFisico}
                onChange={(event) => setForm((current) => ({ ...current, facturaFisico: event.target.checked }))}
                className="h-4 w-4 rounded border-slate-300"
              />
              Es factura física
            </label>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={loading}
                className="rounded-full bg-[#18a57c] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Guardando..." : editingId ? "Actualizar factura" : "Guardar factura"}
              </button>
            </div>
          </form>
        </article>

        <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500 dark:text-slate-300">Detalle</p>
              <h3 className="mt-3 text-2xl font-semibold text-slate-950 dark:text-white">Vista rápida</h3>
            </div>
          </div>

          {selectedInvoice ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-900/70">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-300">Proveedor</p>
                    <p className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">{selectedInvoice.proveedor}</p>
                  </div>
                  <span className="rounded-full bg-[#18a57c]/20 px-2.5 py-1 text-xs font-medium text-[#0f6a4f] dark:text-[#9bf4d6]">
                    {selectedInvoice.estado}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 text-sm text-slate-700 dark:text-slate-200 md:grid-cols-2">
                  <div className="rounded-2xl bg-white px-3 py-2 dark:bg-slate-950/80">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Monto</p>
                    <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">{formatCurrency(Number(selectedInvoice.monto))}</p>
                  </div>
                  <div className="rounded-2xl bg-white px-3 py-2 dark:bg-slate-950/80">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Fecha</p>
                    <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">
                      {new Date(selectedInvoice.fecha).toLocaleDateString("es-VE", {
                        timeZone: "UTC"
                      })}
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                  <div className="rounded-2xl bg-white px-3 py-2 dark:bg-slate-950/80">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Categoría</p>
                    <p className="mt-2 font-medium text-slate-950 dark:text-white">{selectedInvoice.tipoGasto.nombre}</p>
                  </div>
                  <div className="rounded-2xl bg-white px-3 py-2 dark:bg-slate-950/80">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Tipo</p>
                    <p className="mt-2 font-medium text-slate-950 dark:text-white">{selectedInvoice.tipoFactura.nombre}</p>
                  </div>
                </div>
                <div className="mt-3 rounded-2xl bg-white px-3 py-2 text-sm text-slate-700 dark:bg-slate-950/80 dark:text-slate-200">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Descripción</p>
                  <p className="mt-2">{selectedInvoice.descripcion || "Sin descripción adicional."}</p>
                </div>
                {selectedInvoice.imagen && (
                  <div className="mt-3 rounded-2xl bg-white px-3 py-2 dark:bg-slate-950/80">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Archivo adjunto</p>
                    <a
                      href={selectedInvoice.imagen}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex rounded-full bg-[#0d3a71] px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Ver archivo
                    </a>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-3xl border border-dashed border-slate-300 p-6 text-sm text-slate-600 dark:border-white/10 dark:text-slate-300">
              Selecciona una factura de la tabla para ver su detalle.
            </div>
          )}
        </article>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500 dark:text-slate-300">Listado</p>
            <h3 className="mt-3 text-2xl font-semibold text-slate-950 dark:text-white">Facturas registradas</h3>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="grid gap-1 text-xs font-medium uppercase tracking-[0.22em] text-slate-500 dark:text-slate-300">
              Mes
              <input
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>

            <label className="grid gap-1 text-xs font-medium uppercase tracking-[0.22em] text-slate-500 dark:text-slate-300">
              Categoría
              <select
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="all">Todas</option>
                {catalog.categorias.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-xs font-medium uppercase tracking-[0.22em] text-slate-500 dark:text-slate-300">
              Buscar
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Proveedor"
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 dark:border-white/10">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-white/10">
            <thead className="bg-slate-100 text-slate-600 dark:bg-slate-900/80 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Proveedor</th>
                <th className="px-4 py-3 font-medium">Monto</th>
                <th className="px-4 py-3 font-medium">Categoría</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white text-slate-900 dark:divide-white/10 dark:bg-slate-950/60 dark:text-slate-100">
              {filteredInvoices.length > 0 ? (
                filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                    <td className="px-4 py-3">
                      {new Date(invoice.fecha).toLocaleDateString("es-VE", {
                        timeZone: "UTC"
                      })}
                    </td>
                    <td className="px-4 py-3 font-medium">{invoice.proveedor}</td>
                    <td className="px-4 py-3">{formatCurrency(Number(invoice.monto))}</td>
                    <td className="px-4 py-3">{invoice.tipoGasto.nombre}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-[#18a57c]/20 px-2.5 py-1 text-xs font-medium text-[#0f6a4f] dark:text-[#9bf4d6]">
                        {invoice.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedInvoice(invoice)}
                          className="rounded-full bg-[#0d3a71] px-3 py-1 text-xs font-semibold text-white"
                        >
                          Ver
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEdit(invoice)}
                          className="rounded-full bg-[#18a57c] px-3 py-1 text-xs font-semibold text-white"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteId(invoice.id)}
                          className="rounded-full bg-rose-600 px-3 py-1 text-xs font-semibold text-white"
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
                    {loading ? "Cargando..." : "No hay facturas para este filtro."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal de confirmación moderno */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="w-full max-w-sm rounded-[2rem] border border-slate-200 bg-white p-8 shadow-2xl dark:border-white/10 dark:bg-slate-900">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-500/20">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-8 w-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-950 dark:text-white">¿Eliminar factura?</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Esta acción no se puede deshacer y el archivo adjunto será borrado permanentemente.
              </p>
            </div>
            <div className="mt-8 flex flex-col gap-3">
              <button
                onClick={() => handleDelete(deleteId)}
                className="w-full rounded-2xl bg-rose-600 py-3 text-sm font-bold text-white transition hover:bg-rose-700"
              >
                Sí, eliminar factura
              </button>
              <button
                onClick={() => setDeleteId(null)}
                className="w-full rounded-2xl bg-slate-100 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-200 dark:bg-white/5 dark:text-white"
              >
                No, cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
