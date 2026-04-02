-- CreateIndex
CREATE INDEX "Comment_videoId_idx" ON "Comment"("videoId");

-- CreateIndex
CREATE INDEX "Comment_parentCommentId_idx" ON "Comment"("parentCommentId");

-- CreateIndex
CREATE INDEX "Video_channelId_moderationStatus_idx" ON "Video"("channelId", "moderationStatus");

-- CreateIndex
CREATE INDEX "Video_channelId_isShort_idx" ON "Video"("channelId", "isShort");

-- CreateIndex
CREATE INDEX "Video_channelId_propertyType_idx" ON "Video"("channelId", "propertyType");

-- AddForeignKey
ALTER TABLE "CrmEvent" ADD CONSTRAINT "CrmEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
