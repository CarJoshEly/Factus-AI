import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "./database.types"; // Importa los tipos generados de Supabase

const supabaseUrl = process.env.SUPABASE_URL?.trim().replace(/\/$/, ""); // Limpiar espacios y barra final
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

export const storageBucket = process.env.SUPABASE_BUCKET ?? "facturas";

function isValidSupabaseConfig(url: string | undefined, key: string | undefined) {
  if (!url || !key) return false;
  if (url.includes("<") || url.includes(">")) return false;
  if (!url.startsWith("http://") && !url.startsWith("https://")) return false;
  if (key.trim().length === 0) return false;
  return true;
}

let supabaseClient: SupabaseClient<Database> | null = null; // Usa el tipo genérico Database
if (isValidSupabaseConfig(supabaseUrl, supabaseServiceRoleKey)) {
  try {
    // Usar la Service Role Key permite saltar RLS en el servidor
    supabaseClient = createClient<Database>(supabaseUrl!, supabaseServiceRoleKey!, { // Pasa el tipo genérico Database
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        // Configuramos fetch con una mayor tolerancia y aseguramos que no use caché de Next.js
        fetch: (url, options) => fetch(url, { 
          ...options, 
          cache: 'no-store' 
        } as RequestInit),
      },
    });
  } catch (error) {
    console.error("Invalid Supabase configuration:", error);
  }
} else {
  console.error("Missing or invalid Supabase config:", {
    SUPABASE_URL: Boolean(supabaseUrl),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(supabaseServiceRoleKey),
  });
}

export { supabaseClient };

async function ensureStorageBucket() {
  if (!supabaseClient) return;

  const { data: bucket, error: getError } = await supabaseClient.storage.getBucket(storageBucket);

  if (getError && getError.message?.toLowerCase().includes("not found")) {
    const { error: createError } = await supabaseClient.storage.createBucket(storageBucket, {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],
      fileSizeLimit: 50 * 1024 * 1024,
    });

    if (createError) {
      throw new Error(`No se pudo crear el bucket '${storageBucket}': ${createError.message}`);
    }
    return;
  }

  if (getError) {
    throw new Error(`No se pudo verificar el bucket '${storageBucket}': ${getError.message}`);
  }

  if (bucket && !bucket.public) {
    const { error: updateError } = await supabaseClient.storage.updateBucket(storageBucket, {
      public: true,
      allowedMimeTypes: bucket.allowed_mime_types ?? undefined,
      fileSizeLimit: bucket.file_size_limit ?? undefined,
    });

    if (updateError) {
      throw new Error(`No se pudo publicar el bucket '${storageBucket}': ${updateError.message}`);
    }
  }
}

export async function uploadInvoiceFile(
  file: File | Uint8Array, 
  userId: number, 
  fileName?: string, 
  contentType?: string,
  folder: 'invoices' | 'reports' = 'invoices'
) {
  if (!supabaseClient) {
    throw new Error(
      "No está disponible la configuración de Supabase. Verifica que SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY estén definidos en tu entorno."
    );
  }

  // Validar tamaño del archivo (máximo 50MB)
  const size = file instanceof File ? file.size : file.length;
  const maxSize = 50 * 1024 * 1024;
  if (size > maxSize) {
    throw new Error(`El archivo es demasiado grande. Máximo permitido: 50MB.`);
  }

  if (file instanceof File) {
    // Validar tipo de archivo solo si es File (subida desde cliente)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error(`Tipo de archivo no permitido.`);
    }
  }

  const name = file instanceof File ? file.name : (fileName || 'report.pdf');
  const safeName = name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${folder}/${userId}/${Date.now()}-${safeName}`;

  try {
    await ensureStorageBucket();

    let uint8Array: Uint8Array;
    if (file instanceof File) {
      const arrayBuffer = await file.arrayBuffer();
      uint8Array = new Uint8Array(arrayBuffer);
    } else {
      uint8Array = file;
    }

    const { error } = await supabaseClient.storage.from(storageBucket).upload(path, uint8Array, {
      contentType: (file instanceof File ? file.type : contentType) || "application/octet-stream",
      upsert: true,
    });

    if (error) {
      // Proporcionar mensajes de error más específicos
      if (error.message?.includes("Bucket not found")) {
        throw new Error("El bucket de almacenamiento no existe. Contacta al administrador.");
      }
      if (error.message?.includes("Unauthorized")) {
        throw new Error("No tienes permisos para subir archivos. Contacta al administrador.");
      }
      if (error.message?.includes("Payload too large")) {
        throw new Error("El archivo es demasiado grande. Intenta con un archivo más pequeño.");
      }
      // Capturamos el error crudo para depuración si error.message es genérico
      const detail = error.message === "fetch failed" 
        ? "Fallo de conexión (fetch failed). Verifica tu conexión a internet o la URL de Supabase." 
        : error.message;
      throw new Error(`Error al subir el archivo: ${detail}`);
    }

    const { data } = supabaseClient.storage.from(storageBucket).getPublicUrl(path);

    return {
      publicUrl: data.publicUrl,
      path,
    };
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error("Error desconocido al subir el archivo. Intenta nuevamente.");
  }
}

export async function removeInvoiceFile(path: string) {
  if (!supabaseClient) {
    return;
  }

  await supabaseClient.storage.from(storageBucket).remove([path]);
}

/**
 * Elimina todos los archivos dentro de las carpetas 'invoices' y 'reports'.
 * Útil para resetear el entorno de pruebas.
 */
export async function clearAllStorageFiles() {
  if (!supabaseClient) return;

  const folders = ['invoices', 'reports'];
  
  for (const folder of folders) {
    // Listar las carpetas de usuario (IDs)
    const { data: userFolders } = await supabaseClient.storage
      .from(storageBucket)
      .list(folder);

    if (!userFolders) continue;

    for (const userFolder of userFolders) {
      const pathPrefix = `${folder}/${userFolder.name}`;
      const { data: files } = await supabaseClient.storage
        .from(storageBucket)
        .list(pathPrefix);

      if (!files || files.length === 0) continue;

      const filesToRemove = files.map(f => `${pathPrefix}/${f.name}`);
      await supabaseClient.storage.from(storageBucket).remove(filesToRemove);
    }
  }
}

export function getInvoiceStoragePathFromPublicUrl(publicUrl: string) {
  try {
    const marker = "/storage/v1/object/public/";
    const pathname = new URL(publicUrl).pathname;
    const markerIndex = pathname.indexOf(marker);

    if (markerIndex === -1) {
      return null;
    }

    const objectPath = decodeURIComponent(pathname.slice(markerIndex + marker.length));
    const bucketPrefix = `${storageBucket}/`;

    return objectPath.startsWith(bucketPrefix)
      ? objectPath.slice(bucketPrefix.length)
      : objectPath;
  } catch {
    return null;
  }
}
