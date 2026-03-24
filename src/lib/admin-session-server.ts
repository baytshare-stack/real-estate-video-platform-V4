import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, verifyAdminToken } from "@/lib/admin-jwt";

/** Server-only: read admin session from cookies (Route Handlers / Server Components). */
export async function getAdminSessionFromCookies() {
  const store = await cookies();
  const token = store.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}
