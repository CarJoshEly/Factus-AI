import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth-server";
import { supabaseClient } from "@/lib/storage";

export async function GET() {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    if (!supabaseClient) {
      throw new Error("Supabase no esta configurado.");
    }

    const { data, error } = await supabaseClient
      .from("detalle_envio")
      .select("*")
      .eq("user_id", userId.toString())
      .order("fecha_envio", { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({ success: true, history: data ?? [] });
  } catch (error) {
    console.error("Report history error:", error);
    return NextResponse.json({ error: "Error al obtener historial." }, { status: 500 });
  }
}
