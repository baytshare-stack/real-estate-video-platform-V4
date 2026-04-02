-- AlterEnum
ALTER TYPE "VisitBookingStatus" ADD VALUE 'RESCHEDULED';

-- AlterTable
ALTER TABLE "VisitBooking" ADD COLUMN "responseMessage" TEXT;
