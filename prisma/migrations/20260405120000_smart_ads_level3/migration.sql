-- Smart Ads Engine (Level 3): global `Ad` inventory, `AdEvent` analytics, Video targeting fields.

CREATE TYPE "PlatformAdPosition" AS ENUM ('PRE_ROLL', 'MID_ROLL', 'OVERLAY');
CREATE TYPE "AdEventType" AS ENUM ('IMPRESSION', 'CLICK');

ALTER TABLE "Video" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "Video" ADD COLUMN IF NOT EXISTS "location" TEXT;

CREATE TABLE "Ad" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "mediaUrl" TEXT NOT NULL,
    "clickUrl" TEXT,
    "targetCategory" TEXT NOT NULL DEFAULT '',
    "targetLocation" TEXT NOT NULL DEFAULT '',
    "position" "PlatformAdPosition" NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ad_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdEvent" (
    "id" TEXT NOT NULL,
    "adId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "userId" TEXT,
    "type" "AdEventType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Ad_isActive_position_idx" ON "Ad"("isActive", "position");
CREATE INDEX "Ad_createdAt_idx" ON "Ad"("createdAt" DESC);

CREATE INDEX "AdEvent_adId_createdAt_idx" ON "AdEvent"("adId", "createdAt" DESC);
CREATE INDEX "AdEvent_videoId_createdAt_idx" ON "AdEvent"("videoId", "createdAt" DESC);
CREATE INDEX "AdEvent_type_createdAt_idx" ON "AdEvent"("type", "createdAt" DESC);

ALTER TABLE "AdEvent" ADD CONSTRAINT "AdEvent_adId_fkey" FOREIGN KEY ("adId") REFERENCES "Ad"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdEvent" ADD CONSTRAINT "AdEvent_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdEvent" ADD CONSTRAINT "AdEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
