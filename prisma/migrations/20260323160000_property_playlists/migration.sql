-- Property Playlists (auto-generated) + denormalized Video.propertyType

-- 1) New enum for playlist categorization
DO $$
BEGIN
  CREATE TYPE "VideoPropertyType" AS ENUM (
    'APARTMENT',
    'VILLA',
    'TOWNHOUSE',
    'STUDIO',
    'DUPLEX',
    'LAND',
    'OTHER'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2) Denormalized field on Video (optional for backwards compatibility)
ALTER TABLE "Video"
ADD COLUMN IF NOT EXISTS "propertyType" "VideoPropertyType";

-- 3) Playlist table (auto-generated UI uses Video.propertyType, not stored playlistId)
CREATE TABLE IF NOT EXISTS "Playlist" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "channelId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Playlist_pkey" PRIMARY KEY ("id")
);

-- Foreign key + index
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Playlist_channelId_fkey'
  ) THEN
    ALTER TABLE "Playlist"
    ADD CONSTRAINT "Playlist_channelId_fkey"
    FOREIGN KEY ("channelId") REFERENCES "Channel"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Playlist_channelId_idx" ON "Playlist"("channelId");

