-- CreateEnum
CREATE TYPE "VisitBookingStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "VisitBooking" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "propertyId" TEXT,
    "visitorUserId" TEXT NOT NULL,
    "agentUserId" TEXT NOT NULL,
    "visitorName" TEXT NOT NULL,
    "visitorPhone" TEXT NOT NULL,
    "visitorEmail" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "message" TEXT,
    "status" "VisitBookingStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisitBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VisitBooking_agentUserId_status_scheduledAt_idx" ON "VisitBooking"("agentUserId", "status", "scheduledAt");

-- CreateIndex
CREATE INDEX "VisitBooking_visitorUserId_updatedAt_idx" ON "VisitBooking"("visitorUserId", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "VisitBooking_videoId_idx" ON "VisitBooking"("videoId");

-- CreateIndex
CREATE INDEX "VisitBooking_agentUserId_updatedAt_idx" ON "VisitBooking"("agentUserId", "updatedAt" DESC);

-- AddForeignKey
ALTER TABLE "VisitBooking" ADD CONSTRAINT "VisitBooking_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitBooking" ADD CONSTRAINT "VisitBooking_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitBooking" ADD CONSTRAINT "VisitBooking_visitorUserId_fkey" FOREIGN KEY ("visitorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitBooking" ADD CONSTRAINT "VisitBooking_agentUserId_fkey" FOREIGN KEY ("agentUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
