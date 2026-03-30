import {
  PrismaClient,
  PropertyStatus,
  PropertyType,
  ModerationStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { VIDEO_TEMPLATE_CATALOG } from "../src/lib/video-templates/catalog";

const prisma = new PrismaClient();

async function main() {
  const bytEmail = "admin@bytak1tube.com";
  const bytPassword = "123456";
  const bytHash = await bcrypt.hash(bytPassword, 12);

  await prisma.user.upsert({
    where: { email: bytEmail },
    create: {
      email: bytEmail,
      fullName: "BytakTube Admin",
      name: "Admin",
      username: "bytak1tube-admin",
      role: "ADMIN" as const,
      passwordHash: bytHash,
      country: "US",
      phoneVerified: true,
    },
    update: {
      role: "ADMIN" as const,
      passwordHash: bytHash,
      phoneVerified: true,
    },
  });

  const email = "superadmin@realestatetv.local";
  const password = "SuperAdmin123!";

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      fullName: "Platform Super Admin",
      name: "Super Admin",
      username: "super-admin",
      role: "SUPER_ADMIN" as const,
      passwordHash,
      country: "US",
      phoneVerified: true,
    },
    update: {
      role: "SUPER_ADMIN" as const,
      passwordHash,
      phoneVerified: true,
    },
  });

  const channel = await prisma.channel.upsert({
    where: { ownerId: admin.id },
    create: {
      ownerId: admin.id,
      name: "Luxury Estates Official",
      description: "Curated luxury property walkthroughs and market insights.",
      avatar: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=200&h=200",
      profileImage: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=200&h=200",
      bannerImage: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=1600&h=400",
      country: "US",
      subscribersCount: 1280,
    },
    update: {
      name: "Luxury Estates Official",
    },
  });

  const thumbBase = "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=1280&h=720";
  const sampleVideo =
    "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4";

  const listings = [
    {
      title: "Skyline Penthouse — 360° Tour",
      description: "Corner unit with panoramic glass walls and private terrace.",
      isShort: false,
      thumbnail: thumbBase,
      videoUrl: sampleVideo,
      likesCount: 420,
      viewsCount: 12800,
      property: {
        propertyType: PropertyType.APARTMENT,
        status: PropertyStatus.FOR_SALE,
        price: 4_250_000,
        currency: "USD",
        bedrooms: 4,
        bathrooms: 3.5,
        sizeSqm: 280,
        country: "USA",
        city: "New York",
        address: "Hudson Yards, NY",
        latitude: 40.7549,
        longitude: -74.0018,
      },
    },
    {
      title: "Waterfront Villa Walkthrough",
      description: "Private dock, infinity pool, and smart-home automation.",
      isShort: false,
      thumbnail:
        "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&q=80&w=1280&h=720",
      videoUrl: sampleVideo,
      likesCount: 890,
      viewsCount: 45200,
      property: {
        propertyType: PropertyType.VILLA,
        status: PropertyStatus.FOR_SALE,
        price: 12_900_000,
        currency: "USD",
        bedrooms: 6,
        bathrooms: 5,
        sizeSqm: 620,
        country: "USA",
        city: "Miami",
        address: "Brickell Bay Dr",
        latitude: 25.7617,
        longitude: -80.1918,
      },
    },
    {
      title: "60s Teaser — Marina Loft #Shorts",
      description: "Quick peek at a duplex loft near the marina.",
      isShort: true,
      thumbnail:
        "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&q=80&w=720&h=1280",
      videoUrl: sampleVideo,
      likesCount: 2100,
      viewsCount: 98000,
      property: {
        propertyType: PropertyType.APARTMENT,
        status: PropertyStatus.FOR_RENT,
        price: 4_500,
        currency: "USD",
        bedrooms: 2,
        bathrooms: 2,
        sizeSqm: 95,
        country: "UAE",
        city: "Dubai",
        address: "Dubai Marina",
        latitude: 25.0772,
        longitude: 55.1398,
      },
    },
  ];

  for (const item of listings) {
    const existing = await prisma.video.findFirst({
      where: { channelId: channel.id, title: item.title },
    });
    if (existing) continue;

    await prisma.video.create({
      data: {
        title: item.title,
        description: item.description,
        isShort: item.isShort,
        thumbnail: item.thumbnail,
        videoUrl: item.videoUrl,
        likesCount: item.likesCount,
        viewsCount: item.viewsCount,
        channelId: channel.id,
        moderationStatus: ModerationStatus.APPROVED,
        property: {
          create: {
            propertyType: item.property.propertyType,
            status: item.property.status,
            price: item.property.price,
            currency: item.property.currency,
            bedrooms: item.property.bedrooms,
            bathrooms: item.property.bathrooms,
            sizeSqm: item.property.sizeSqm,
            country: item.property.country,
            city: item.property.city,
            address: item.property.address,
            latitude: item.property.latitude,
            longitude: item.property.longitude,
          },
        },
      },
    });
  }

  /* Demo discovery: AGENCY + AGENT (visible on /agencies and /agents after migration) */
  const agencyDemo = await prisma.user.upsert({
    where: { email: "demo-agency@bytaktube.local" },
    create: {
      email: "demo-agency@bytaktube.local",
      fullName: "Gulf Horizons Realty",
      name: "Gulf Horizons Realty",
      username: "demo-agency",
      role: "AGENCY",
      country: "UAE",
      city: "Dubai",
      isFeatured: true,
      isVerified: true,
      rating: 4.8,
      phone: "+971500000001",
      whatsapp: "+971500000001",
      phoneVerified: true,
      profile: {
        create: {
          name: "Gulf Horizons Realty",
          bio: "Premium listings across Dubai Marina & Downtown.",
          location: "Dubai, UAE",
          avatar:
            "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=400&h=400",
        },
      },
    },
    update: {
      country: "UAE",
      city: "Dubai",
      isFeatured: true,
      isVerified: true,
      rating: 4.8,
    },
  });

  await prisma.channel.upsert({
    where: { ownerId: agencyDemo.id },
    create: {
      ownerId: agencyDemo.id,
      name: "Gulf Horizons Realty",
      description: "Your Dubai property partner",
      avatar:
        "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=400&h=400",
      profileImage:
        "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=400&h=400",
      country: "UAE",
    },
    update: { name: "Gulf Horizons Realty" },
  });

  const agentDemo = await prisma.user.upsert({
    where: { email: "demo-agent@bytaktube.local" },
    create: {
      email: "demo-agent@bytaktube.local",
      fullName: "Sara Al-Mansoori",
      name: "Sara Al-Mansoori",
      username: "demo-agent",
      role: "AGENT",
      country: "UAE",
      city: "Dubai",
      employerId: agencyDemo.id,
      isFeatured: true,
      isVerified: true,
      rating: 4.9,
      phoneVerified: true,
      profile: {
        create: {
          name: "Sara Al-Mansoori",
          bio: "Licensed broker focused on waterfront homes.",
          location: "Dubai Marina, UAE",
          avatar:
            "https://images.unsplash.com/photo-1573496359142-b8d87734a7a8?auto=format&fit=crop&q=80&w=400&h=400",
        },
      },
    },
    update: {
      employerId: agencyDemo.id,
      country: "UAE",
      city: "Dubai",
      isFeatured: true,
      isVerified: true,
      rating: 4.9,
    },
  });

  await prisma.channel.upsert({
    where: { ownerId: agentDemo.id },
    create: {
      ownerId: agentDemo.id,
      name: "Sara — Dubai Listings",
      avatar:
        "https://images.unsplash.com/photo-1573496359142-b8d87734a7a8?auto=format&fit=crop&q=80&w=400&h=400",
      profileImage:
        "https://images.unsplash.com/photo-1573496359142-b8d87734a7a8?auto=format&fit=crop&q=80&w=400&h=400",
      country: "UAE",
    },
    update: { name: "Sara — Dubai Listings" },
  });

  for (const t of VIDEO_TEMPLATE_CATALOG) {
    await prisma.videoTemplate.upsert({
      where: { slug: t.slug },
      create: {
        slug: t.slug,
        name: t.name,
        type: t.type,
        previewImage: t.previewImage,
        config: t.config as object,
        sortOrder: t.sortOrder,
        isActive: true,
      },
      update: {
        name: t.name,
        type: t.type,
        previewImage: t.previewImage,
        config: t.config as object,
        sortOrder: t.sortOrder,
      },
    });
  }
  console.log(`Video templates: ${VIDEO_TEMPLATE_CATALOG.length} upserted.`);

  console.log("Seed complete.");
  console.log(`ADMIN: ${bytEmail} / ${bytPassword}`);
  console.log(`SUPER_ADMIN: ${email} / ${password}`);
  console.log(`Channel: ${channel.name} (${channel.id})`);
  console.log(`Discovery demo: agency ${agencyDemo.id}, agent ${agentDemo.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
