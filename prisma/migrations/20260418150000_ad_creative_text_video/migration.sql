-- Video + text creatives on platform ads (single `Ad` table; logical Admin vs User via `publisher`).
CREATE TYPE "AdCreativeKind" AS ENUM ('VIDEO', 'TEXT');

CREATE TYPE "AdTextDisplayMode" AS ENUM ('OVERLAY', 'CARD');

ALTER TABLE "Ad" ADD COLUMN "creativeKind" "AdCreativeKind" NOT NULL DEFAULT 'VIDEO',
ADD COLUMN "textBody" TEXT,
ADD COLUMN "textDisplayMode" "AdTextDisplayMode";

ALTER TABLE "Ad" ALTER COLUMN "videoUrl" DROP NOT NULL;
