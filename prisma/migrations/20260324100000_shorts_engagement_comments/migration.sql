-- CreateEnum
CREATE TYPE "ReactionType" AS ENUM ('LIKE', 'DISLIKE');

-- AlterTable Video
ALTER TABLE "Video" ADD COLUMN "dislikesCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Video" ADD COLUMN "sharesCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Video" ADD COLUMN "commentsCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable Like -> video reactions (keep table name "Like")
ALTER TABLE "Like" ADD COLUMN "type" "ReactionType" NOT NULL DEFAULT 'LIKE';

-- CrmEvent
CREATE TABLE "CrmEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "userId" TEXT,
    "videoId" TEXT,
    "channelId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CrmEvent_type_idx" ON "CrmEvent"("type");
CREATE INDEX "CrmEvent_videoId_idx" ON "CrmEvent"("videoId");

-- VideoShare
CREATE TABLE "VideoShare" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "videoId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoShare_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VideoShare_videoId_idx" ON "VideoShare"("videoId");

ALTER TABLE "VideoShare" ADD CONSTRAINT "VideoShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VideoShare" ADD CONSTRAINT "VideoShare_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Comment: nested + counts
ALTER TABLE "Comment" ADD COLUMN "parentCommentId" TEXT;
ALTER TABLE "Comment" ADD COLUMN "likesCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Comment" ADD COLUMN "dislikesCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CommentReaction
CREATE TABLE "CommentReaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "type" "ReactionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentReaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommentReaction_userId_commentId_key" ON "CommentReaction"("userId", "commentId");

ALTER TABLE "CommentReaction" ADD CONSTRAINT "CommentReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommentReaction" ADD CONSTRAINT "CommentReaction_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
