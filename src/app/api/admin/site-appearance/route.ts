import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { cookies } from "next/headers";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  SITE_APPEARANCE_ID,
  dtoToLayoutJson,
  dtoUiToJson,
  getSiteAppearanceUncached,
  parseLayoutJson,
  parseUiConfig,
  rowToDTO,
} from "@/lib/site-appearance";
import { ADMIN_SESSION_COOKIE, verifyAdminToken } from "@/lib/admin-jwt";

async function requireAdmin() {
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  const session = token ? await verifyAdminToken(token) : null;
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const appearance = await getSiteAppearanceUncached();
    return NextResponse.json(appearance);
  } catch {
    return NextResponse.json({ error: "Failed to load." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const str = (k: string, max = 500) => {
    const v = body[k];
    return typeof v === "string" ? v.slice(0, max).trim() : undefined;
  };
  const num = (k: string, min: number, max: number, fallback: number) => {
    const v = body[k];
    if (typeof v !== "number" || Number.isNaN(v)) return fallback;
    return Math.min(max, Math.max(min, Math.round(v)));
  };
  const float = (k: string, min: number, max: number, fallback: number) => {
    const v = body[k];
    if (typeof v !== "number" || Number.isNaN(v)) return fallback;
    return Math.min(max, Math.max(min, v));
  };

  try {
    const current = await getSiteAppearanceUncached();
    const layoutIn = body.layout;
    const layout =
      layoutIn && typeof layoutIn === "object" && !Array.isArray(layoutIn)
        ? parseLayoutJson(layoutIn)
        : current.layout;

    const uiIn = body.ui;
    const ui =
      uiIn && typeof uiIn === "object" && !Array.isArray(uiIn)
        ? parseUiConfig(uiIn)
        : current.ui;

    const logoUrlRaw = str("logoUrl", 2000);
    const logoCandidate = logoUrlRaw === "" ? null : logoUrlRaw ?? current.logoUrl;
    const logoUrl =
      logoCandidate &&
      (logoCandidate.startsWith("https://") || logoCandidate.startsWith("http://localhost"))
        ? logoCandidate
        : logoCandidate === null
          ? null
          : current.logoUrl;

    const data = {
      primaryHex: str("primaryHex", 32) ?? current.primaryHex,
      accentHex: str("accentHex", 32) ?? current.accentHex,
      backgroundHex: str("backgroundHex", 32) ?? current.backgroundHex,
      surfaceHex: str("surfaceHex", 32) ?? current.surfaceHex,
      textHex: str("textHex", 32) ?? current.textHex,
      mutedHex: str("mutedHex", 32) ?? current.mutedHex,
      borderHex: str("borderHex", 80) ?? current.borderHex,
      fontBodyKey: str("fontBodyKey", 40) ?? current.fontBodyKey,
      fontHeadingKey: str("fontHeadingKey", 40) ?? current.fontHeadingKey,
      baseFontPx: num("baseFontPx", 12, 22, current.baseFontPx),
      headingScale: float("headingScale", 0.95, 1.35, current.headingScale),
      logoUrl,
      layoutJson: dtoToLayoutJson(layout),
      uiConfigJson: dtoUiToJson(ui) as Prisma.InputJsonValue,
    };

    const row = await prisma.siteAppearance.upsert({
      where: { id: SITE_APPEARANCE_ID },
      create: { id: SITE_APPEARANCE_ID, ...data },
      update: data,
    });

    revalidateTag("site-appearance", "max");
    return NextResponse.json(rowToDTO(row));
  } catch (e) {
    console.error("admin site-appearance PATCH", e);
    return NextResponse.json({ error: "Save failed." }, { status: 500 });
  }
}
