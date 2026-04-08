-- AlterEnum only (PG: new enum values cannot be used in the same transaction as ADD VALUE).
ALTER TYPE "CampaignStatus" ADD VALUE 'DRAFT';
ALTER TYPE "CampaignStatus" ADD VALUE 'DELETED';
ALTER TYPE "AdStatus" ADD VALUE 'DELETED';
