import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth-server";
import { AppShell } from "@/components/AppShell";
import SettingsForm from "./SettingsForm";

export default async function SettingsPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  // Cargamos los datos iniciales directamente en el servidor
  const user = await prisma.usuario.findUnique({
    where: { id: userId },
    select: { nombre: true, correo: true },
  });

  if (!user) redirect("/login");

  return (
    <AppShell>
      <SettingsForm initialData={{ nombre: user.nombre || "", correo: user.correo || "" }} />
    </AppShell>
  );
}