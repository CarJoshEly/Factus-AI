import { cookies } from "next/headers";
import { parseSessionValue } from "./auth";

export async function getSessionUserId(): Promise<number | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get("factusai_session")?.value;
  if (!session) return null;
  
  return parseSessionValue(session)?.userId ?? null;
}