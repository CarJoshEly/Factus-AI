import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth-server";
import bcrypt from "bcryptjs";

const hashPassword = async (password: string) => {
  return await bcrypt.hash(password, 10);
};

const verifyPassword = async (password: string, storedHash: string) => {
  if (!storedHash.startsWith("$2a$") && !storedHash.startsWith("$2b$")) {
    console.error("ERROR: La contraseña en la DB no tiene formato bcrypt (formato antiguo detectado).");
    return false;
  }
  return await bcrypt.compare(password, storedHash);
};

export async function GET() {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { nombre: true, correo: true }
    });

    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ error: "Error al cargar perfil" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await request.json();
    const { type } = body;

    if (type === "profile") {
      const { nombre, correo } = body;
      await prisma.usuario.update({
        where: { id: userId },
        data: { nombre, correo },
      });
      return NextResponse.json({ message: "Perfil actualizado" });
    }

    if (type === "password") {
      const { currentPassword, newPassword } = body;
      const user = await prisma.usuario.findUnique({ where: { id: userId } });
      
      if (!user || !user.contrasena) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

      const isValid = await verifyPassword(currentPassword, user.contrasena);
      
      if (!isValid) return NextResponse.json({ error: "La contraseña actual es incorrecta" }, { status: 400 });

      const hashedPassword = await hashPassword(newPassword);
      await prisma.usuario.update({
        where: { id: userId },
        data: { contrasena: hashedPassword },
      });

      return NextResponse.json({ message: "Contraseña actualizada" });
    }
    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (error) {
    console.error("Error en update-user:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}