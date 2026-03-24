import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { safeFindUnique } from "@/lib/safePrisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await safeFindUnique(() =>
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          username: true,
          fullName: true,
          email: true,
          phone: true,
          phoneCode: true,
          phoneNumber: true,
          fullPhoneNumber: true,
          whatsapp: true,
          country: true,
          phoneVerified: true,
          role: true,
          image: true,
          profile: true,
        },
      })
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (e) {
    console.error("GET /api/profile", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      bio,
      location,
      facebook,
      instagram,
      linkedin,
      website,
      contactEmail,
      contactPhone,
    } = body as Record<string, string | undefined>;

    const userId = session.user.id;

    await prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        name: name ?? null,
        bio: bio ?? null,
        location: location ?? null,
        facebook: facebook ?? null,
        instagram: instagram ?? null,
        linkedin: linkedin ?? null,
        website: website ?? null,
        contactEmail: contactEmail ?? null,
        contactPhone: contactPhone ?? null,
      },
      update: {
        name: name ?? undefined,
        bio: bio ?? undefined,
        location: location ?? undefined,
        facebook: facebook ?? undefined,
        instagram: instagram ?? undefined,
        linkedin: linkedin ?? undefined,
        website: website ?? undefined,
        contactEmail: contactEmail ?? undefined,
        contactPhone: contactPhone ?? undefined,
      },
    });

    if (name?.trim()) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          fullName: name.trim(),
          name: name.trim(),
        },
      });
    }

    const user = await safeFindUnique(() =>
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          fullName: true,
          email: true,
          phone: true,
          phoneCode: true,
          phoneNumber: true,
          fullPhoneNumber: true,
          whatsapp: true,
          country: true,
          phoneVerified: true,
          role: true,
          image: true,
          profile: true,
        },
      })
    );

    return NextResponse.json({ user });
  } catch (e) {
    console.error("PATCH /api/profile", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
