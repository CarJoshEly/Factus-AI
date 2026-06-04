import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setSessionCookie } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const correo = String(body.correo ?? "").trim().toLowerCase();
    const contrasena = String(body.contrasena ?? "").trim();

    if (!correo || !contrasena) {
      return NextResponse.json(
        { error: "Debes enviar correo y contraseña." },
        { status: 400 }
      );
    }

    const usuario = await prisma.usuario.findUnique({
      where: { correo },
    });

    if (!usuario || !(await bcrypt.compare(contrasena, usuario.contrasena))) {
      return NextResponse.json(
        { error: "Correo o contraseña incorrectos." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      ok: true,
      user: {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
      },
    });

    setSessionCookie(response, usuario.id);
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Error interno al iniciar sesión." },
      { status: 500 }
    );
  }
}
