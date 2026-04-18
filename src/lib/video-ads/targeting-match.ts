import type { TargetUserIntent } from "@prisma/client";
import { Prisma } from "@prisma/client";
import type { WatchVideoContext } from "@/lib/video-ads/watch-context";

export type TargetingSlice = {
  countries: string[];
  cities: string[];
  propertyTypes: string[];
  priceMin: Prisma.Decimal | null;
  priceMax: Prisma.Decimal | null;
  userIntent: TargetUserIntent | null;
};

function norm(s: string) {
  return s.trim().toUpperCase();
}

function arrHasOrEmpty(arr: string[], value: string | null | undefined): boolean {
  if (!arr.length) return true;
  if (!value) return false;
  const v = norm(value);
  return arr.some((x) => norm(x) === v);
}

function priceInRange(price: Prisma.Decimal | null | undefined, min: Prisma.Decimal | null, max: Prisma.Decimal | null) {
  if (min == null && max == null) return true;
  if (price == null) return false;
  if (min != null && price.lt(min)) return false;
  if (max != null && price.gt(max)) return false;
  return true;
}

/**
 * Returns 0–100 relevance score: country, city, property type, price band, intent.
 */
export function targetingRelevanceScore(ctx: WatchVideoContext, t: TargetingSlice | null | undefined): number {
  if (!t) return 100;
  let score = 0;
  if (arrHasOrEmpty(t.countries, ctx.country)) score += 22;
  if (arrHasOrEmpty(t.cities, ctx.city)) score += 22;
  if (!t.propertyTypes.length || (ctx.propertyTypeKey && t.propertyTypes.some((p) => norm(p) === norm(ctx.propertyTypeKey!)))) {
    score += 22;
  } else if (ctx.propertyTypeKey) {
    score += 0;
  } else {
    score += 11;
  }
  if (priceInRange(ctx.price, t.priceMin, t.priceMax)) score += 22;
  else score += 0;

  if (!t.userIntent || !ctx.intent) {
    score += 12;
  } else if (t.userIntent === ctx.intent) {
    score += 12;
  }
  return Math.min(100, score);
}

export function targetingMatches(ctx: WatchVideoContext, t: TargetingSlice | null | undefined): boolean {
  if (!t) return true;
  if (!arrHasOrEmpty(t.countries, ctx.country)) return false;
  if (!arrHasOrEmpty(t.cities, ctx.city)) return false;
  if (t.propertyTypes.length) {
    const pk = ctx.propertyTypeKey;
    if (!pk) return false;
    if (!t.propertyTypes.some((p) => norm(p) === norm(pk))) return false;
  }
  if (!priceInRange(ctx.price, t.priceMin, t.priceMax)) return false;
  if (t.userIntent && ctx.intent && t.userIntent !== ctx.intent) return false;
  return true;
}
