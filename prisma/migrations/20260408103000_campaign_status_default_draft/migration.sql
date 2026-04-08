-- Runs after enum values are committed (separate migration).
ALTER TABLE "Campaign" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
