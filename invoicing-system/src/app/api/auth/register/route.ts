import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setSessionCookie } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const nombre = String(body.nombre ?? "").trim();
    const correo = String(body.correo ?? "").trim().toLowerCase();
    const contrasena = String(body.contrasena ?? "").trim();

    if (!nombre || !correo || !contrasena) {
      return NextResponse.json(
        { error: "Todos los campos son obligatorios." },
        { status: 400 }
      );
    }

    const existing = await prisma.usuario.findUnique({
      where: { correo },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Ya existe una cuenta con ese correo." },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(contrasena, 10);

    const usuario = await prisma.usuario.create({
      data: {
        nombre,
        correo,
        contrasena: hashedPassword,
      },
    });

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
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Error interno al registrar la cuenta." },
      { status: 500 }
    );
  }
}
