-- CreateEnum
CREATE TYPE "AdAdminReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Ad" ADD COLUMN "adminReviewStatus" "AdAdminReviewStatus" NOT NULL DEFAULT 'APPROVED';
