-- Per-viewer daily impression counts for frequency capping (separate from AdPerformance).

CREATE TABLE "AdViewerDayImpression" (
    "id" TEXT NOT NULL,
    "viewerKey" TEXT NOT NULL,
    "adId" TEXT NOT NULL,
    "dayUtc" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdViewerDayImpression_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdViewerDayImpression_viewerKey_adId_dayUtc_key" ON "AdViewerDayImpression"("viewerKey", "adId", "dayUtc");

CREATE INDEX "AdViewerDayImpression_viewerKey_dayUtc_idx" ON "AdViewerDayImpression"("viewerKey", "dayUtc");

ALTER TABLE "AdViewerDayImpression" ADD CONSTRAINT "AdViewerDayImpression_adId_fkey" FOREIGN KEY ("adId") REFERENCES "Ad"("id") ON DELETE CASCADE ON UPDATE CASCADE;
