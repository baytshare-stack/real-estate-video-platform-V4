-- Safe incremental: creative format enum + column; backfill from legacy `type` + `skippable`

CREATE TYPE "AdType" AS ENUM (
  'PRE_ROLL_SKIPPABLE',
  'PRE_ROLL_NON_SKIPPABLE',
  'MID_ROLL',
  'OVERLAY',
  'COMPANION',
  'CTA'
);

ALTER TABLE "Ad" ADD COLUMN "adType" "AdType" NOT NULL DEFAULT 'PRE_ROLL_SKIPPABLE';

UPDATE "Ad"
SET "adType" = CASE
  WHEN "type" = 'MID_ROLL' THEN 'MID_ROLL'::"AdType"
  WHEN "type" = 'PRE_ROLL' AND "skippable" = false THEN 'PRE_ROLL_NON_SKIPPABLE'::"AdType"
  ELSE 'PRE_ROLL_SKIPPABLE'::"AdType"
END;
