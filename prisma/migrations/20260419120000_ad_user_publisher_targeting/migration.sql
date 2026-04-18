-- CreateEnum
CREATE TYPE "AdPublisher" AS ENUM ('ADMIN', 'USER');

-- AlterTable
ALTER TABLE "Ad" ADD COLUMN     "publisher" "AdPublisher" NOT NULL DEFAULT 'ADMIN',
ADD COLUMN     "ownerId" TEXT,
ADD COLUMN     "targetVideoId" TEXT,
ADD COLUMN     "campaignId" TEXT;

-- CreateIndex
CREATE INDEX "Ad_active_type_publisher_idx" ON "Ad"("active", "type", "publisher");

-- CreateIndex
CREATE INDEX "Ad_ownerId_active_type_idx" ON "Ad"("ownerId", "active", "type");

-- CreateIndex
CREATE INDEX "Ad_targetVideoId_active_type_idx" ON "Ad"("targetVideoId", "active", "type");

-- CreateIndex
CREATE INDEX "Ad_campaignId_idx" ON "Ad"("campaignId");

-- AddForeignKey
ALTER TABLE "Ad" ADD CONSTRAINT "Ad_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ad" ADD CONSTRAINT "Ad_targetVideoId_fkey" FOREIGN KEY ("targetVideoId") REFERENCES "Video"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ad" ADD CONSTRAINT "Ad_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
