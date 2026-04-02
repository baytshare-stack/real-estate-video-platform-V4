-- AlterTable
ALTER TABLE "VisitBooking" ADD COLUMN "reschedulePendingFrom" TIMESTAMP(3),
ADD COLUMN "statusBeforePendingReschedule" "VisitBookingStatus",
ADD COLUMN "visitorCounterProposalAt" TIMESTAMP(3);
