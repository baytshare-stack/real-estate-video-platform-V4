CREATE TABLE "FinalPriceLead" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "agentUserId" TEXT NOT NULL,
    "visitorName" TEXT NOT NULL,
    "visitorPhone" TEXT NOT NULL,
    "specifications" TEXT NOT NULL,
    "listedPriceLabel" TEXT NOT NULL,
    "visitorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinalPriceLead_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FinalPriceLead_agentUserId_createdAt_idx" ON "FinalPriceLead"("agentUserId", "createdAt" DESC);
CREATE INDEX "FinalPriceLead_videoId_idx" ON "FinalPriceLead"("videoId");

ALTER TABLE "FinalPriceLead" ADD CONSTRAINT "FinalPriceLead_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinalPriceLead" ADD CONSTRAINT "FinalPriceLead_agentUserId_fkey" FOREIGN KEY ("agentUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinalPriceLead" ADD CONSTRAINT "FinalPriceLead_visitorUserId_fkey" FOREIGN KEY ("visitorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
