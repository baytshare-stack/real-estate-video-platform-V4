-- Ads platform v2: remove text/overlay creatives, add targeting, performance metrics, CTA + image support.

CREATE TYPE "AdMediaType" AS ENUM ('VIDEO', 'IMAGE');
CREATE TYPE "AdCtaType" AS ENUM ('CALL', 'WHATSAPP', 'BOOK_VISIT');
CREATE TYPE "TargetUserIntent" AS ENUM ('BUY', 'RENT', 'INVEST');

UPDATE "Ad" SET "active" = false WHERE "creativeKind" = 'TEXT';

ALTER TABLE "Ad" ADD COLUMN "mediaType" "AdMediaType" NOT NULL DEFAULT 'VIDEO';
ALTER TABLE "Ad" ADD COLUMN "thumbnail" TEXT;
ALTER TABLE "Ad" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "Ad" ADD COLUMN "durationSeconds" INTEGER;
ALTER TABLE "Ad" ADD COLUMN "ctaType" "AdCtaType" NOT NULL DEFAULT 'WHATSAPP';
ALTER TABLE "Ad" ADD COLUMN "ctaLabel" TEXT;
ALTER TABLE "Ad" ADD COLUMN "ctaUrl" TEXT;

ALTER TABLE "Ad" DROP COLUMN IF EXISTS "textBody";
ALTER TABLE "Ad" DROP COLUMN IF EXISTS "textDisplayMode";
ALTER TABLE "Ad" DROP COLUMN "creativeKind";
DROP TYPE "AdCreativeKind";
DROP TYPE "AdTextDisplayMode";

CREATE TABLE "Targeting" (
    "id" TEXT NOT NULL,
    "adId" TEXT NOT NULL,
    "countries" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "cities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "propertyTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "priceMin" DECIMAL(65,30),
    "priceMax" DECIMAL(65,30),
    "userIntent" "TargetUserIntent",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Targeting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Targeting_adId_key" ON "Targeting"("adId");
ALTER TABLE "Targeting" ADD CONSTRAINT "Targeting_adId_fkey" FOREIGN KEY ("adId") REFERENCES "Ad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AdPerformance" (
    "id" TEXT NOT NULL,
    "adId" TEXT NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "leads" INTEGER NOT NULL DEFAULT 0,
    "watchTime" INTEGER NOT NULL DEFAULT 0,
    "spend" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdPerformance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdPerformance_adId_key" ON "AdPerformance"("adId");
ALTER TABLE "AdPerformance" ADD CONSTRAINT "AdPerformance_adId_fkey" FOREIGN KEY ("adId") REFERENCES "Ad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Targeting" ("id", "adId", "countries", "cities", "propertyTypes", "priceMin", "priceMax", "userIntent", "createdAt", "updatedAt")
SELECT 'tgt_' || a."id", a."id", ARRAY[]::TEXT[], ARRAY[]::TEXT[], ARRAY[]::TEXT[], NULL, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Ad" a
WHERE NOT EXISTS (SELECT 1 FROM "Targeting" t WHERE t."adId" = a."id");

INSERT INTO "AdPerformance" ("id", "adId", "impressions", "views", "clicks", "leads", "watchTime", "spend", "updatedAt")
SELECT 'perf_' || a."id", a."id", 0, 0, 0, 0, 0, 0, CURRENT_TIMESTAMP
FROM "Ad" a
WHERE NOT EXISTS (SELECT 1 FROM "AdPerformance" p WHERE p."adId" = a."id");

ALTER TABLE "Lead" DROP CONSTRAINT IF EXISTS "Lead_videoId_fkey";
ALTER TABLE "Lead" DROP CONSTRAINT IF EXISTS "Lead_agentId_fkey";

ALTER TABLE "Lead" ALTER COLUMN "videoId" DROP NOT NULL;
ALTER TABLE "Lead" ALTER COLUMN "agentId" DROP NOT NULL;

ALTER TABLE "Lead" ADD CONSTRAINT "Lead_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
