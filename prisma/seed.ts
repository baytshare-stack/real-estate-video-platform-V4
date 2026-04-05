import { PrismaClient, PropertyType, VideoPropertyType } from '@prisma/client';

const prisma = new PrismaClient();

async function seedListingCatalog() {
  const types: Array<{
    slug: string;
    labelEn: string;
    labelAr: string;
    mapProperty: PropertyType;
    mapVideo: VideoPropertyType;
    sortOrder: number;
  }> = [
    { slug: 'APARTMENT', labelEn: 'Apartment', labelAr: 'شقة', mapProperty: 'APARTMENT', mapVideo: 'APARTMENT', sortOrder: 10 },
    { slug: 'VILLA', labelEn: 'Villa', labelAr: 'فيلا', mapProperty: 'VILLA', mapVideo: 'VILLA', sortOrder: 20 },
    { slug: 'HOUSE', labelEn: 'House', labelAr: 'منزل', mapProperty: 'HOUSE', mapVideo: 'TOWNHOUSE', sortOrder: 30 },
    { slug: 'OFFICE', labelEn: 'Office', labelAr: 'مكتب', mapProperty: 'OFFICE', mapVideo: 'OTHER', sortOrder: 40 },
    { slug: 'SHOP', labelEn: 'Shop', labelAr: 'محل', mapProperty: 'SHOP', mapVideo: 'OTHER', sortOrder: 50 },
    { slug: 'COMMERCIAL', labelEn: 'Commercial', labelAr: 'تجاري', mapProperty: 'COMMERCIAL', mapVideo: 'OTHER', sortOrder: 60 },
    { slug: 'LAND', labelEn: 'Land', labelAr: 'أرض', mapProperty: 'LAND', mapVideo: 'LAND', sortOrder: 70 },
    { slug: 'TOWNHOUSE', labelEn: 'Townhouse', labelAr: 'منزل متلاصق', mapProperty: 'HOUSE', mapVideo: 'TOWNHOUSE', sortOrder: 80 },
    { slug: 'STUDIO', labelEn: 'Studio', labelAr: 'استوديو', mapProperty: 'APARTMENT', mapVideo: 'STUDIO', sortOrder: 90 },
    { slug: 'DUPLEX', labelEn: 'Duplex', labelAr: 'دوبلكس', mapProperty: 'HOUSE', mapVideo: 'DUPLEX', sortOrder: 100 },
    { slug: 'OTHER', labelEn: 'Other', labelAr: 'أخرى', mapProperty: 'COMMERCIAL', mapVideo: 'OTHER', sortOrder: 110 },
  ];

  for (const t of types) {
    await prisma.listingPropertyType.upsert({
      where: { slug: t.slug },
      create: { ...t, active: true },
      update: {
        labelEn: t.labelEn,
        labelAr: t.labelAr,
        mapProperty: t.mapProperty,
        mapVideo: t.mapVideo,
        sortOrder: t.sortOrder,
        active: true,
      },
    });
  }

  const countryData: Array<{
    key: string;
    labelEn: string;
    labelAr: string;
    currency: string;
    areaUnit: string;
    sortOrder: number;
    cities: string[];
  }> = [
    {
      key: 'Egypt',
      labelEn: 'Egypt',
      labelAr: 'مصر',
      currency: 'EGP',
      areaUnit: 'sqm',
      sortOrder: 10,
      cities: ['Cairo', 'Giza', 'Alexandria', 'Mansoura'],
    },
    {
      key: 'USA',
      labelEn: 'United States',
      labelAr: 'الولايات المتحدة',
      currency: 'USD',
      areaUnit: 'sqft',
      sortOrder: 20,
      cities: ['New York', 'Los Angeles', 'Miami', 'Houston'],
    },
    {
      key: 'UK',
      labelEn: 'United Kingdom',
      labelAr: 'المملكة المتحدة',
      currency: 'GBP',
      areaUnit: 'sqm',
      sortOrder: 30,
      cities: ['London', 'Manchester', 'Birmingham', 'Liverpool'],
    },
    {
      key: 'UAE',
      labelEn: 'United Arab Emirates',
      labelAr: 'الإمارات',
      currency: 'AED',
      areaUnit: 'sqm',
      sortOrder: 40,
      cities: ['Dubai', 'Abu Dhabi', 'Sharjah'],
    },
    {
      key: 'SaudiArabia',
      labelEn: 'Saudi Arabia',
      labelAr: 'السعودية',
      currency: 'SAR',
      areaUnit: 'sqm',
      sortOrder: 50,
      cities: ['Riyadh', 'Jeddah', 'Dammam'],
    },
  ];

  for (const c of countryData) {
    const country = await prisma.listingCountry.upsert({
      where: { key: c.key },
      create: {
        key: c.key,
        labelEn: c.labelEn,
        labelAr: c.labelAr,
        currency: c.currency,
        areaUnit: c.areaUnit,
        sortOrder: c.sortOrder,
        active: true,
      },
      update: {
        labelEn: c.labelEn,
        labelAr: c.labelAr,
        currency: c.currency,
        areaUnit: c.areaUnit,
        sortOrder: c.sortOrder,
        active: true,
      },
    });
    for (let i = 0; i < c.cities.length; i++) {
      const city = c.cities[i]!;
      await prisma.listingGovernorate.upsert({
        where: { countryId_key: { countryId: country.id, key: city } },
        create: {
          countryId: country.id,
          key: city,
          labelEn: city,
          labelAr: city,
          sortOrder: i * 10,
          active: true,
        },
        update: {
          labelEn: city,
          labelAr: city,
          sortOrder: i * 10,
          active: true,
        },
      });
    }
  }

  console.log('✅ Listing catalog (property types, countries, governorates) seeded.');
}

async function main() {
  await seedListingCatalog();

  const templates = [
    {
      name: "Cinematic Short 1",
      type: "short",
      previewImage: "https://placekitten.com/400/300",
      previewVideo: "https://sample-videos.com/video123/mp4/240/big_buck_bunny_240p.mp4",
      config: {},
      defaultAudio: "https://sample-videos.com/audio/mp3/wave.mp3",
    },
    {
      name: "Cinematic Short 2",
      type: "short",
      previewImage: "https://placekitten.com/401/300",
      previewVideo: "https://sample-videos.com/video123/mp4/240/big_buck_bunny_240p.mp4",
      config: {},
      defaultAudio: "https://sample-videos.com/audio/mp3/wave.mp3",
    },
    {
      name: "Cinematic Short 3",
      type: "short",
      previewImage: "https://placekitten.com/402/300",
      previewVideo: "https://sample-videos.com/video123/mp4/240/big_buck_bunny_240p.mp4",
      config: {},
      defaultAudio: "https://sample-videos.com/audio/mp3/wave.mp3",
    },
    {
      name: "Cinematic Short 4",
      type: "short",
      previewImage: "https://placekitten.com/403/300",
      previewVideo: "https://sample-videos.com/video123/mp4/240/big_buck_bunny_240p.mp4",
      config: {},
      defaultAudio: "https://sample-videos.com/audio/mp3/wave.mp3",
    },
    {
      name: "Cinematic Short 5",
      type: "short",
      previewImage: "https://placekitten.com/404/300",
      previewVideo: "https://sample-videos.com/video123/mp4/240/big_buck_bunny_240p.mp4",
      config: {},
      defaultAudio: "https://sample-videos.com/audio/mp3/wave.mp3",
    },
    // Long templates
    {
      name: "Cinematic Long 1",
      type: "long",
      previewImage: "https://placekitten.com/405/300",
      previewVideo: "https://sample-videos.com/video123/mp4/480/big_buck_bunny_480p.mp4",
      config: {},
      defaultAudio: "https://sample-videos.com/audio/mp3/wave.mp3",
    },
    {
      name: "Cinematic Long 2",
      type: "long",
      previewImage: "https://placekitten.com/406/300",
      previewVideo: "https://sample-videos.com/video123/mp4/480/big_buck_bunny_480p.mp4",
      config: {},
      defaultAudio: "https://sample-videos.com/audio/mp3/wave.mp3",
    },
    {
      name: "Cinematic Long 3",
      type: "long",
      previewImage: "https://placekitten.com/407/300",
      previewVideo: "https://sample-videos.com/video123/mp4/480/big_buck_bunny_480p.mp4",
      config: {},
      defaultAudio: "https://sample-videos.com/audio/mp3/wave.mp3",
    },
    {
      name: "Cinematic Long 4",
      type: "long",
      previewImage: "https://placekitten.com/408/300",
      previewVideo: "https://sample-videos.com/video123/mp4/480/big_buck_bunny_480p.mp4",
      config: {},
      defaultAudio: "https://sample-videos.com/audio/mp3/wave.mp3",
    },
    {
      name: "Cinematic Long 5",
      type: "long",
      previewImage: "https://placekitten.com/409/300",
      previewVideo: "https://sample-videos.com/video123/mp4/480/big_buck_bunny_480p.mp4",
      config: {},
      defaultAudio: "https://sample-videos.com/audio/mp3/wave.mp3",
    },
  ];

  for (const t of templates) {
    await prisma.template.create({ data: t });
  }

  console.log("✅ Templates seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });