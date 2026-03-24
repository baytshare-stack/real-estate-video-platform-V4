/**
 * @deprecated Admin auth uses httpOnly JWT cookies (`/api/admin/auth/login`).
 * Kept for clearing legacy localStorage on the login page.
 */
export type AdminRole = "admin" | "user";

export type AdminSession = {
  userId: string;
  role: AdminRole;
  isAuthenticated: boolean;
};

const STORAGE_KEY = "bytaktube.admin.session";

function isBrowser() {
  return typeof window !== "undefined";
}

export function getAdminSession(): AdminSession | null {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AdminSession>;
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.userId !== "string") return null;
    if (parsed.role !== "admin" && parsed.role !== "user") return null;
    if (typeof parsed.isAuthenticated !== "boolean") return null;
    return parsed as AdminSession;
  } catch {
    return null;
  }
}

export function setAdminSession(session: AdminSession) {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearAdminSession() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}

