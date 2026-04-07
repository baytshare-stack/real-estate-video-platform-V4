-- Ensure Lead rows are always linked to video and agent
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "agentId" TEXT;

UPDATE "Lead" l
SET "agentId" = c."ownerId"
FROM "Video" v
JOIN "Channel" c ON c."id" = v."channelId"
WHERE l."videoId" = v."id" AND l."agentId" IS NULL;

DELETE FROM "Lead" WHERE "videoId" IS NULL;

ALTER TABLE "Lead" ALTER COLUMN "videoId" SET NOT NULL;
ALTER TABLE "Lead" ALTER COLUMN "agentId" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "Lead_agentId_createdAt_idx" ON "Lead"("agentId", "createdAt" DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Lead_agentId_fkey'
  ) THEN
    ALTER TABLE "Lead"
    ADD CONSTRAINT "Lead_agentId_fkey"
    FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
