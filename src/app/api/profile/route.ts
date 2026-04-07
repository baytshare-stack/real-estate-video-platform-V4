import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { safeFindUnique } from "@/lib/safePrisma";
import { authOptions } from "@/lib/auth-options";
import { ensureUserProfile } from "@/lib/ensureUserProfile";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,32}$/;

async function loadProfileUser(userId: string) {
  return safeFindUnique(() =>
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        fullName: true,
        name: true,
        email: true,
        phone: true,
        phoneCode: true,
        phoneNumber: true,
        fullPhoneNumber: true,
        whatsapp: true,
        country: true,
        city: true,
        phoneVerified: true,
        role: true,
        image: true,
        createdAt: true,
        profile: true,
        channel: {
          select: {
            id: true,
            name: true,
            description: true,
            avatar: true,
            profileImage: true,
            phone: true,
            websiteUrl: true,
            country: true,
            whatsapp: true,
          },
        },
      },
    })
  );
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureUserProfile(session.user.id);

    const user = await loadProfileUser(session.user.id);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (e) {
    console.error("GET /api/profile", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

type Body = {
  name?: string;
  username?: string;
  fullName?: string;
  bio?: string;
  location?: string;
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  website?: string;
  contactEmail?: string;
  contactPhone?: string;
  showEmailOnProfile?: boolean;
};

async function applyProfileUpdate(sessionUserId: string, body: Body) {
  if (body.username !== undefined && body.username !== null) {
    const u = String(body.username).trim();
    if (!u.length) {
      return NextResponse.json({ error: "Username cannot be empty" }, { status: 400 });
    }
    if (!USERNAME_RE.test(u)) {
      return NextResponse.json(
        { error: "Username must be 3–32 characters: letters, numbers, underscore only" },
        { status: 400 }
      );
    }
    const taken = await prisma.user.findFirst({
      where: { username: u, NOT: { id: sessionUserId } },
      select: { id: true },
    });
    if (taken) {
      return NextResponse.json({ error: "Username already taken" }, { status: 409 });
    }
    await prisma.user.update({
      where: { id: sessionUserId },
      data: { username: u },
    });
  }

  const displayFromFullName = body.fullName !== undefined ? String(body.fullName).trim() : "";
  const displayFromName = body.name !== undefined ? String(body.name).trim() : "";
  const displayName = displayFromFullName || displayFromName;

  if (displayName) {
    await prisma.user.update({
      where: { id: sessionUserId },
      data: {
        fullName: displayName,
        name: displayName,
      },
    });
  }

  await ensureUserProfile(sessionUserId);

  const data: Prisma.ProfileUpdateInput = {};

  if ("name" in body) {
    data.name = body.name?.trim() || null;
  } else if (displayName) {
    data.name = displayName;
  }

  if ("bio" in body) data.bio = body.bio?.trim() || null;
  if ("location" in body) data.location = body.location?.trim() || null;
  if ("facebook" in body) data.facebook = body.facebook?.trim() || null;
  if ("instagram" in body) data.instagram = body.instagram?.trim() || null;
  if ("linkedin" in body) data.linkedin = body.linkedin?.trim() || null;
  if ("website" in body) data.website = body.website?.trim() || null;
  if ("contactEmail" in body) data.contactEmail = body.contactEmail?.trim() || null;
  if ("contactPhone" in body) data.contactPhone = body.contactPhone?.trim() || null;
  if ("showEmailOnProfile" in body) {
    data.showEmailOnProfile = Boolean(body.showEmailOnProfile);
  }

  if (Object.keys(data).length > 0) {
    await prisma.profile.update({
      where: { userId: sessionUserId },
      data,
    });
  }

  const user = await loadProfileUser(sessionUserId);
  return NextResponse.json({ user });
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    return applyProfileUpdate(session.user.id, body);
  } catch (e) {
    console.error("PATCH /api/profile", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    return applyProfileUpdate(session.user.id, body);
  } catch (e) {
    console.error("PUT /api/profile", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
