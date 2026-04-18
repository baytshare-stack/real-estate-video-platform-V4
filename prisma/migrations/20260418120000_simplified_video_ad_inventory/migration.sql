-- Video ad inventory rebuild: single `Ad` table for HTML5 pre/mid-roll only.
-- Clears legacy ad-linked leads because `adId` foreign keys must be recreated.
DELETE FROM "Lead";

DROP TABLE IF EXISTS "Targeting" CASCADE;
DROP TABLE IF EXISTS "AdPerformance" CASCADE;
DROP TABLE IF EXISTS "AdViewerDayImpression" CASCADE;
DROP TABLE IF EXISTS "Ad" CASCADE;

DROP TYPE IF EXISTS "VideoAdSlot";
CREATE TYPE "VideoAdSlot" AS ENUM ('PRE_ROLL', 'MID_ROLL');

CREATE TABLE "Ad" (
    "id" TEXT NOT NULL,
    "videoUrl" TEXT NOT NULL,
    "type" "VideoAdSlot" NOT NULL,
    "skippable" BOOLEAN NOT NULL DEFAULT true,
    "skipAfterSeconds" INTEGER NOT NULL DEFAULT 5,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Ad_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Ad_active_type_idx" ON "Ad"("active", "type");

ALTER TABLE "Lead" ADD CONSTRAINT "Lead_adId_fkey" FOREIGN KEY ("adId") REFERENCES "Ad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP TYPE IF EXISTS "AdCtaType";
DROP TYPE IF EXISTS "AdPlacement";
DROP TYPE IF EXISTS "AdStatus";
DROP TYPE IF EXISTS "AdType";
