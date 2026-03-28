import type { Role } from "@prisma/client";

const REGISTRATION_ROLES = ["USER", "AGENT", "AGENCY"] as const;

/**
 * Maps API / form values to Prisma Role enum (always uppercase).
 */
export function normalizeRegistrationRole(input: unknown): Role | null {
  const raw = String(input ?? "").trim();
  if (!raw) return null;
  const upper = raw.toUpperCase();
  if ((REGISTRATION_ROLES as readonly string[]).includes(upper)) {
    return upper as Role;
  }
  const lower = raw.toLowerCase();
  if (lower === "user") return "USER";
  if (lower === "agent") return "AGENT";
  if (lower === "agency") return "AGENCY";
  return null;
}

export function isRegistrationRoleString(input: unknown): input is string {
  return normalizeRegistrationRole(input) !== null;
}
