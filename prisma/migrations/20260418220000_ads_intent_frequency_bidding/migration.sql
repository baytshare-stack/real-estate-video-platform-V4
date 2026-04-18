-- User intent profile (signed-in viewers), ad frequency caps, optional campaign bid modes.

CREATE TYPE "CampaignBidMode" AS ENUM ('WEIGHTED', 'CPM', 'CPC', 'CPL');

CREATE TABLE "UserIntentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "preferredLocation" TEXT,
    "preferredPropertyType" TEXT,
    "budgetMin" DECIMAL(65,30),
    "budgetMax" DECIMAL(65,30),
    "engagementScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "videosWatchedCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserIntentProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserIntentProfile_userId_key" ON "UserIntentProfile"("userId");
ALTER TABLE "UserIntentProfile" ADD CONSTRAINT "UserIntentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AdViewerFrequency" (
    "id" TEXT NOT NULL,
    "viewerKey" TEXT NOT NULL,
    "adId" TEXT NOT NULL,
    "dayBucket" TEXT NOT NULL DEFAULT '',
    "showsToday" INTEGER NOT NULL DEFAULT 0,
    "lastShownAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdViewerFrequency_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdViewerFrequency_viewerKey_adId_key" ON "AdViewerFrequency"("viewerKey", "adId");
CREATE INDEX "AdViewerFrequency_viewerKey_idx" ON "AdViewerFrequency"("viewerKey");

ALTER TABLE "AdViewerFrequency" ADD CONSTRAINT "AdViewerFrequency_adId_fkey" FOREIGN KEY ("adId") REFERENCES "Ad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Campaign" ADD COLUMN "bidMode" "CampaignBidMode" NOT NULL DEFAULT 'WEIGHTED';
ALTER TABLE "Campaign" ADD COLUMN "cpmBid" DECIMAL(65,30);
ALTER TABLE "Campaign" ADD COLUMN "cpcBid" DECIMAL(65,30);
ALTER TABLE "Campaign" ADD COLUMN "cplBid" DECIMAL(65,30);
