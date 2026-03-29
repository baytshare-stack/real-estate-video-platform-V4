-- CreateEnum
CREATE TYPE "SubscriptionNotifyPreference" AS ENUM ('ALL', 'PERSONALIZED', 'NONE');

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN "notificationPreference" "SubscriptionNotifyPreference" NOT NULL DEFAULT 'ALL';
