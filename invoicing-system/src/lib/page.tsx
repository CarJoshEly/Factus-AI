"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function NewInvoicePage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<{ text: string; type: "success" | "error" } | null>(null);
  
  // Datos extraídos por la IA
  const [invoiceData, setInvoiceData] = useState({
    fecha: "",
    proveedor: "",
    monto: 0,
    categoria: "Otros",
    descripcion: "",
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      handleUpload(selectedFile);
    }
  };

  const handleUpload = async (fileToProcess: File) => {
    setIsProcessing(true);
    setStatus(null);
    const formData = new FormData();
    formData.append("file", fileToProcess);

    try {
      // Asumimos que el endpoint de procesamiento está en esta ruta
      const res = await fetch("/api/facturas/process-ai", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Error al procesar la factura");

      const data = await res.json();
      
      if (data.extractedData) {
        // La IA llena el formulario automáticamente
        setInvoiceData(data.extractedData);
      }

      if (data.fileUrl) {
        setFileUrl(data.fileUrl);
      }
    } catch (error) {
      console.error("Error procesando imagen", error);
      setStatus({ text: "La IA no pudo leer los datos. Por favor, ingrésalos manualmente.", type: "error" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!invoiceData.proveedor || !invoiceData.fecha || !invoiceData.monto) {
      setStatus({ text: "Completa proveedor, fecha y monto antes de continuar.", type: "error" });
      return;
    }

    setIsSaving(true);
    try {
      // Forzamos la creación de la fecha al mediodía UTC para evitar saltos de día
      // independientemente de la zona horaria del navegador o del servidor.
      const [year, month, day] = invoiceData.fecha.split("-").map(Number);
      const normalizedDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).toISOString();

      const res = await fetch("/api/facturas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...invoiceData,
          fecha: normalizedDate,
          fileUrl: fileUrl || previewUrl, // URL final de la imagen
        }),
      });

      if (res.ok) {
        router.push("/facturas");
        router.refresh();
      } else {
        const err = await res.json();
        throw new Error(err.error || "Error al guardar la factura");
      }
    } catch (error: any) {
      setStatus({ text: error.message || "Error al guardar la factura", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">Nueva Factura Inteligente</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Zona de Carga (Paso 1) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="border-2 border-dashed border-slate-300 bg-slate-50 rounded-3xl p-6 min-h-[400px] flex flex-col items-center justify-center relative overflow-hidden transition-all hover:border-blue-400">
            {previewUrl ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <Image 
                  src={previewUrl} 
                  alt="Preview" 
                  fill 
                  className="rounded-xl shadow-lg object-contain" 
                />
                <button 
                  onClick={() => { setFile(null); setPreviewUrl(null); }}
                  className="absolute top-0 right-0 bg-white/90 p-2 rounded-full text-rose-500 shadow-md hover:bg-white transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
            ) : (
              <div className="text-center">
                <div className="mb-4 text-slate-400 flex justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                </div>
                <p className="text-slate-600 font-medium">Sube tu factura para comenzar</p>
                <p className="text-xs text-slate-400 mt-1 mb-4">La IA se encargará del resto</p>
                <input 
                  type="file" 
                  id="file-input"
                  className="hidden"
                  onChange={handleFileChange} 
                  accept="image/*,application/pdf" 
                />
                <label 
                  htmlFor="file-input"
                  className="bg-slate-900 text-white px-6 py-2.5 rounded-xl text-sm font-semibold cursor-pointer hover:bg-slate-800 transition shadow-lg"
                >
                  Seleccionar archivo
                </label>
              </div>
            )}
            
            {isProcessing && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center z-10 animate-in fade-in duration-500">
                <div className="relative">
                  <div className="h-20 w-20 animate-spin rounded-full border-[3px] border-slate-100 border-t-blue-600"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-10 w-10 animate-pulse rounded-full bg-blue-600/10 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-blue-600" />
                    </div>
                  </div>
                </div>
                <p className="mt-6 text-blue-700 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Lectura Inteligente</p>
              </div>
            )}
          </div>
        </div>

        {/* Formulario de Confirmación (Paso 2) */}
        <div className="lg:col-span-7">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <h2 className="text-xl font-bold mb-6 text-slate-800">Verificar Datos</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Proveedor</label>
                <input
                  type="text"
                  placeholder={isProcessing ? "Analizando..." : "Ej: Supermercado La Colonia"}
                  className="w-full border border-slate-200 bg-slate-50 p-3 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                  value={invoiceData.proveedor}
                  onChange={(e) => setInvoiceData({ ...invoiceData, proveedor: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Fecha</label>
                  <input
                    type="date"
                    className="w-full border border-slate-200 bg-slate-50 p-3 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                    value={invoiceData.fecha}
                    onChange={(e) => setInvoiceData({ ...invoiceData, fecha: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Monto Total</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    className="w-full border border-slate-200 bg-slate-50 p-3 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                    value={invoiceData.monto}
                    onChange={(e) => setInvoiceData({ ...invoiceData, monto: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Categoría</label>
                <select 
                  className="w-full border border-slate-200 bg-slate-50 p-3 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                  value={invoiceData.categoria}
                  onChange={(e) => setInvoiceData({ ...invoiceData, categoria: e.target.value })}
                >
                  <option value="Alimentación">Alimentación</option>
                  <option value="Transporte">Transporte</option>
                  <option value="Servicios">Servicios</option>
                  <option value="Tecnología">Tecnología</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>
              
              {status && (
                <div className={`flex items-center gap-3 rounded-2xl p-4 text-xs font-semibold animate-in fade-in slide-in-from-top-1 duration-300 ${
                  status.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                    : 'bg-rose-50 text-rose-700 border border-rose-100'
                }`}>
                  <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${status.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <p className="flex-1">{status.text}</p>
                  <button type="button" onClick={() => setStatus(null)} className="opacity-40 hover:opacity-100 transition">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                </div>
              )}

              <div className="pt-4">
                <button 
                  disabled={!file || isProcessing || isSaving}
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-[0.99] disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-3"
                  onClick={handleSave}
                >
                  {isSaving ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white"></div>
                      <span className="animate-pulse tracking-wide">Finalizando...</span>
                    </>
                  ) : (
                    "Guardar Factura"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}