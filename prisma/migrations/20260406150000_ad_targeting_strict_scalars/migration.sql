-- Strict scalar targeting (country / city / area) + listing area for video context.
ALTER TABLE "Targeting" ADD COLUMN IF NOT EXISTS "country" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Targeting" ADD COLUMN IF NOT EXISTS "city" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Targeting" ADD COLUMN IF NOT EXISTS "area" TEXT NOT NULL DEFAULT '';

UPDATE "Targeting" SET
  "country" = COALESCE(NULLIF(TRIM(BOTH FROM "countries"[1]), ''), ''),
  "city" = COALESCE(NULLIF(TRIM(BOTH FROM "cities"[1]), ''), '');

ALTER TABLE "Targeting" DROP COLUMN IF EXISTS "countries";
ALTER TABLE "Targeting" DROP COLUMN IF EXISTS "cities";

ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "area" TEXT;
