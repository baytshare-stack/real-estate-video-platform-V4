-- Rename video reaction table to VideoReaction (Prisma model VideoReaction)
ALTER TABLE "Like" RENAME TO "VideoReaction";

-- Align constraint / index names with Prisma defaults for VideoReaction
ALTER INDEX "Like_userId_videoId_key" RENAME TO "VideoReaction_userId_videoId_key";
ALTER TABLE "VideoReaction" RENAME CONSTRAINT "Like_pkey" TO "VideoReaction_pkey";
ALTER TABLE "VideoReaction" RENAME CONSTRAINT "Like_userId_fkey" TO "VideoReaction_userId_fkey";
ALTER TABLE "VideoReaction" RENAME CONSTRAINT "Like_videoId_fkey" TO "VideoReaction_videoId_fkey";
