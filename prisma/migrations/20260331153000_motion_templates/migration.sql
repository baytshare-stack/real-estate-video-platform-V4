-- Motion template engine: Template table, Video.images / Video.audio, drop legacy VideoTemplate.

CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "previewImage" TEXT NOT NULL,
    "previewVideo" TEXT,
    "config" JSONB NOT NULL,
    "defaultAudio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Template_type_idx" ON "Template"("type");

INSERT INTO "Template" ("id", "name", "type", "previewImage", "previewVideo", "config", "defaultAudio", "createdAt")
SELECT
    "id",
    "name",
    "type"::text,
    COALESCE("previewImage", ''),
    NULL,
    "config",
    NULL,
    "createdAt"
FROM "VideoTemplate";

ALTER TABLE "Video" DROP CONSTRAINT IF EXISTS "Video_templateId_fkey";

DROP TABLE "VideoTemplate";

DROP TYPE IF EXISTS "VideoTemplateType";

ALTER TABLE "Video" ADD COLUMN "images" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Video" ADD COLUMN "audio" TEXT;

UPDATE "Video" v
SET
    "images" = sub.imgs,
    "audio" = sub.aud
FROM (
    SELECT
        "id",
        CASE
            WHEN "templatePayload" IS NOT NULL
                AND jsonb_typeof("templatePayload" -> 'images') = 'array'
            THEN ARRAY(SELECT jsonb_array_elements_text("templatePayload" -> 'images'))
            ELSE ARRAY[]::text[]
        END AS imgs,
        NULLIF(trim("templatePayload" ->> 'audioUrl'), '') AS aud
    FROM "Video"
) AS sub
WHERE v."id" = sub."id";

ALTER TABLE "Video" DROP COLUMN "templatePayload";

ALTER TABLE "Video" ADD CONSTRAINT "Video_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE SET NULL ON UPDATE CASCADE;
