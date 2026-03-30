-- CreateEnum
CREATE TYPE "VideoTemplateType" AS ENUM ('SHORT', 'LONG');

-- CreateTable
CREATE TABLE "VideoTemplate" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "VideoTemplateType" NOT NULL,
    "previewImage" TEXT,
    "config" JSONB NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VideoTemplate_slug_key" ON "VideoTemplate"("slug");

-- CreateIndex
CREATE INDEX "VideoTemplate_type_isActive_sortOrder_idx" ON "VideoTemplate"("type", "isActive", "sortOrder");

-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "isTemplate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "templateId" TEXT,
ADD COLUMN     "templatePayload" JSONB;

-- CreateIndex
CREATE INDEX "Video_isTemplate_idx" ON "Video"("isTemplate");

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "VideoTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
