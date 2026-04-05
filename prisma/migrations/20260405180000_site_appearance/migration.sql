-- CreateTable
CREATE TABLE "SiteAppearance" (
    "id" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "primaryHex" TEXT NOT NULL DEFAULT '#3b82f6',
    "accentHex" TEXT NOT NULL DEFAULT '#6366f1',
    "backgroundHex" TEXT NOT NULL DEFAULT '#0f0f0f',
    "surfaceHex" TEXT NOT NULL DEFAULT '#121212',
    "textHex" TEXT NOT NULL DEFAULT '#f1f1f1',
    "mutedHex" TEXT NOT NULL DEFAULT '#a1a1aa',
    "borderHex" TEXT NOT NULL DEFAULT 'rgba(255,255,255,0.1)',
    "fontBodyKey" TEXT NOT NULL DEFAULT 'inter',
    "fontHeadingKey" TEXT NOT NULL DEFAULT 'inter',
    "baseFontPx" INTEGER NOT NULL DEFAULT 16,
    "headingScale" DOUBLE PRECISION NOT NULL DEFAULT 1.06,
    "logoUrl" TEXT,
    "layoutJson" JSONB,

    CONSTRAINT "SiteAppearance_pkey" PRIMARY KEY ("id")
);
