import { Prisma, type TargetUserIntent } from "@prisma/client";

export function parseStringList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === "string") return v.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
  return [];
}

export function parseOptionalDecimal(v: unknown): Prisma.Decimal | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return new Prisma.Decimal(String(n));
}

export function parseUserIntent(v: unknown): TargetUserIntent | null {
  const s = String(v || "").trim().toUpperCase();
  if (s === "BUY" || s === "RENT" || s === "INVEST") return s;
  return null;
}
