import { unstable_cache } from "next/cache";
import type { SiteAppearance } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  SITE_APPEARANCE_ID,
  DEFAULT_SITE_APPEARANCE,
  parseLayoutJson,
  parseUiConfig,
  type SiteAppearanceDTO,
} from "@/lib/site-appearance-shared";

/** Re-export shared helpers for server routes / RSC that import from this module. */
export * from "@/lib/site-appearance-shared";

export function rowToDTO(row: SiteAppearance): SiteAppearanceDTO {
  return {
    primaryHex: row.primaryHex,
    accentHex: row.accentHex,
    backgroundHex: row.backgroundHex,
    surfaceHex: row.surfaceHex,
    textHex: row.textHex,
    mutedHex: row.mutedHex,
    borderHex: row.borderHex,
    fontBodyKey: row.fontBodyKey,
    fontHeadingKey: row.fontHeadingKey,
    baseFontPx: row.baseFontPx,
    headingScale: row.headingScale,
    logoUrl: row.logoUrl,
    layout: parseLayoutJson(row.layoutJson),
    ui: parseUiConfig((row as { uiConfigJson?: unknown }).uiConfigJson),
  };
}

async function loadSiteAppearanceRow(): Promise<SiteAppearance | null> {
  try {
    return await prisma.siteAppearance.findUnique({ where: { id: SITE_APPEARANCE_ID } });
  } catch {
    return null;
  }
}

export async function getSiteAppearanceUncached(): Promise<SiteAppearanceDTO> {
  const row = await loadSiteAppearanceRow();
  if (!row) return DEFAULT_SITE_APPEARANCE;
  return rowToDTO(row);
}

export const getSiteAppearance = unstable_cache(
  async () => getSiteAppearanceUncached(),
  ["site-appearance-v1"],
  { tags: ["site-appearance"], revalidate: 120 }
);
