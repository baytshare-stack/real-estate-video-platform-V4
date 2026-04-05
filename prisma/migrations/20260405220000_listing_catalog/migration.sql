-- Listing catalog for upload forms (property types, countries, governorates)

CREATE TABLE "ListingPropertyType" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "labelAr" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "mapProperty" "PropertyType" NOT NULL,
    "mapVideo" "VideoPropertyType" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingPropertyType_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ListingPropertyType_slug_key" ON "ListingPropertyType"("slug");

CREATE TABLE "ListingCountry" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "labelAr" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "areaUnit" TEXT NOT NULL DEFAULT 'sqm',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingCountry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ListingCountry_key_key" ON "ListingCountry"("key");

CREATE TABLE "ListingGovernorate" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "labelAr" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingGovernorate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ListingGovernorate_countryId_key_key" ON "ListingGovernorate"("countryId", "key");

ALTER TABLE "ListingGovernorate" ADD CONSTRAINT "ListingGovernorate_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "ListingCountry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
