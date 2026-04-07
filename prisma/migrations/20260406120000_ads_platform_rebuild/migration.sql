-- Drop old smart ads tables
DROP TABLE IF EXISTS "AdEvent";
DROP TABLE IF EXISTS "Ad" CASCADE;
DROP TABLE IF EXISTS "VideoAd";
DROP TABLE IF EXISTS "AdPlacement";
DROP TABLE IF EXISTS "AdCreative";
DROP TABLE IF EXISTS "AdCampaign";
DROP TYPE IF EXISTS "AdEventType";
DROP TYPE IF EXISTS "VideoAdPosition";
DROP TYPE IF EXISTS "PlatformAdPosition";
DROP TYPE IF EXISTS "AdCampaignStatus";
DROP TYPE IF EXISTS "AdCreativeType";

-- Create new enums
CREATE TYPE "CampaignStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ENDED');
CREATE TYPE "AdType" AS ENUM ('VIDEO', 'IMAGE');
CREATE TYPE "AdStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ENDED');
CREATE TYPE "AdPlacement" AS ENUM ('PRE_ROLL', 'MID_ROLL');
CREATE TYPE "AdCtaType" AS ENUM ('CALL', 'WHATSAPP', 'BOOK_VISIT');
CREATE TYPE "LeadSource" AS ENUM ('AD', 'VIDEO');

-- Advertiser profile
CREATE TABLE "AdvertiserProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "businessName" TEXT NOT NULL,
  "isVerified" BOOLEAN NOT NULL DEFAULT false,
  "balance" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdvertiserProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AdvertiserProfile_userId_key" ON "AdvertiserProfile"("userId");

-- Campaigns
CREATE TABLE "Campaign" (
  "id" TEXT NOT NULL,
  "advertiserId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "budget" DECIMAL(65,30) NOT NULL,
  "dailyBudget" DECIMAL(65,30) NOT NULL,
  "spent" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "status" "CampaignStatus" NOT NULL DEFAULT 'PAUSED',
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "bidWeight" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Campaign_advertiserId_status_idx" ON "Campaign"("advertiserId", "status");
CREATE INDEX "Campaign_status_startDate_endDate_idx" ON "Campaign"("status", "startDate", "endDate");

-- Ads
CREATE TABLE "Ad" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "type" "AdType" NOT NULL,
  "videoUrl" TEXT,
  "imageUrl" TEXT,
  "thumbnail" TEXT,
  "duration" INTEGER NOT NULL DEFAULT 15,
  "skipAfter" INTEGER NOT NULL DEFAULT 5,
  "ctaType" "AdCtaType" NOT NULL DEFAULT 'WHATSAPP',
  "ctaLabel" TEXT,
  "ctaUrl" TEXT,
  "status" "AdStatus" NOT NULL DEFAULT 'DRAFT',
  "placement" "AdPlacement" NOT NULL DEFAULT 'PRE_ROLL',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Ad_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Ad_campaignId_status_placement_idx" ON "Ad"("campaignId", "status", "placement");

-- Targeting
CREATE TABLE "Targeting" (
  "id" TEXT NOT NULL,
  "adId" TEXT NOT NULL,
  "countries" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "cities" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "propertyTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "priceMin" DECIMAL(65,30),
  "priceMax" DECIMAL(65,30),
  "userIntent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Targeting_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Targeting_adId_key" ON "Targeting"("adId");

-- Performance
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

-- Leads
CREATE TABLE "Lead" (
  "id" TEXT NOT NULL,
  "adId" TEXT NOT NULL,
  "userId" TEXT,
  "videoId" TEXT,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "source" "LeadSource" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Lead_adId_createdAt_idx" ON "Lead"("adId", "createdAt" DESC);
CREATE INDEX "Lead_videoId_idx" ON "Lead"("videoId");

-- Foreign keys
ALTER TABLE "AdvertiserProfile" ADD CONSTRAINT "AdvertiserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "AdvertiserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Ad" ADD CONSTRAINT "Ad_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Targeting" ADD CONSTRAINT "Targeting_adId_fkey" FOREIGN KEY ("adId") REFERENCES "Ad"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdPerformance" ADD CONSTRAINT "AdPerformance_adId_fkey" FOREIGN KEY ("adId") REFERENCES "Ad"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_adId_fkey" FOREIGN KEY ("adId") REFERENCES "Ad"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE SET NULL ON UPDATE CASCADE;
