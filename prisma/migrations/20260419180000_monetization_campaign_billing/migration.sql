-- Monetization: campaign billing type + bid + daily spend bucket; lead -> campaign link

CREATE TYPE "CampaignBillingType" AS ENUM ('CPM', 'CPC', 'CPL');

ALTER TABLE "Campaign" ADD COLUMN "billingType" "CampaignBillingType" NOT NULL DEFAULT 'CPM';
ALTER TABLE "Campaign" ADD COLUMN "bidAmount" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "Campaign" ADD COLUMN "spentToday" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "Campaign" ADD COLUMN "spendDayUtc" TEXT NOT NULL DEFAULT '';

UPDATE "Campaign"
SET "billingType" = CASE "bidMode"::text
  WHEN 'CPC' THEN 'CPC'::"CampaignBillingType"
  WHEN 'CPL' THEN 'CPL'::"CampaignBillingType"
  ELSE 'CPM'::"CampaignBillingType"
END;

UPDATE "Campaign"
SET "bidAmount" = COALESCE(
  CASE "bidMode"::text
    WHEN 'CPM' THEN "cpmBid"
    WHEN 'CPC' THEN "cpcBid"
    WHEN 'CPL' THEN "cplBid"
    ELSE NULL
  END,
  0
);

ALTER TABLE "Lead" ADD COLUMN "campaignId" TEXT;

ALTER TABLE "Lead" ADD CONSTRAINT "Lead_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Lead_campaignId_createdAt_idx" ON "Lead"("campaignId", "createdAt" DESC);

UPDATE "Lead" AS l
SET "campaignId" = a."campaignId"
FROM "Ad" AS a
WHERE l."adId" = a."id" AND l."campaignId" IS NULL AND a."campaignId" IS NOT NULL;
