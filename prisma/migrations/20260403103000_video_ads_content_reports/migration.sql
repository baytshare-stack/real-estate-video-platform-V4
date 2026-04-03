-- CreateEnum
CREATE TYPE "VideoAdPosition" AS ENUM ('BEFORE', 'MID', 'AFTER', 'OVERLAY');

-- CreateEnum
CREATE TYPE "ContentReportTarget" AS ENUM ('VIDEO', 'COMMENT');

-- CreateEnum
CREATE TYPE "ContentReportStatus" AS ENUM ('PENDING', 'REVIEWED', 'DISMISSED');

-- CreateTable
CREATE TABLE "VideoAd" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "videoId" TEXT NOT NULL,
    "position" "VideoAdPosition" NOT NULL DEFAULT 'OVERLAY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoAd_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentReport" (
    "id" TEXT NOT NULL,
    "targetType" "ContentReportTarget" NOT NULL,
    "targetId" TEXT NOT NULL,
    "reporterUserId" TEXT,
    "reason" TEXT,
    "status" "ContentReportStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VideoAd_videoId_isActive_idx" ON "VideoAd"("videoId", "isActive");

-- CreateIndex
CREATE INDEX "ContentReport_status_createdAt_idx" ON "ContentReport"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ContentReport_targetType_targetId_idx" ON "ContentReport"("targetType", "targetId");

-- AddForeignKey
ALTER TABLE "VideoAd" ADD CONSTRAINT "VideoAd_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentReport" ADD CONSTRAINT "ContentReport_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
