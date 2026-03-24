-- AlterTable
ALTER TABLE "User" ADD COLUMN "fullPhoneNumber" TEXT;
ALTER TABLE "User" ADD COLUMN "phoneVerified" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "otpCode" TEXT;
ALTER TABLE "User" ADD COLUMN "otpExpiresAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "phoneLoginToken" TEXT;
ALTER TABLE "User" ADD COLUMN "phoneLoginTokenExpiresAt" TIMESTAMP(3);
