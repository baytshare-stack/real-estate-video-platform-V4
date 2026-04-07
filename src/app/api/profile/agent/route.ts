import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth-options";
import { ensureUserProfile } from "@/lib/ensureUserProfile";
import { inferPhoneCodeFromE164, normalizePlusE164 } from "@/lib/countriesData";
import { canonicalPhoneDigitsFromE164 } from "@/lib/userPhone";

export const runtime = "nodejs";

function digitsToPlus(d: string | null | undefined) {
  if (!d) return null;
  const x = d.replace(/\D/g, "");
  return x ? `+${x}` : null;
}

async function syncOwnerChannelContact(ownerId: string) {
  const u = await prisma.user.findUnique({
    where: { id: ownerId },
    select: { fullPhoneNumber: true, phone: true, whatsapp: true },
  });
  const phoneLine = u?.fullPhoneNumber?.trim() || digitsToPlus(u?.phone);
  const waLine = digitsToPlus(u?.whatsapp);
  await prisma.channel.updateMany({
    where: { ownerId },
    data: {
      phone: phoneLine ?? null,
      whatsapp: (waLine ?? phoneLine) ?? null,
    },
  });
}

const AGENT_ROLES = ["AGENT"] as const;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,32}$/;

type Body = {
  fullName?: string;
  username?: string;
  email?: string;
  phone?: string | null;
  bio?: string | null;
  location?: string | null;
  city?: string | null;
  country?: string | null;
};

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, country: true },
    });
    if (!me) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (!AGENT_ROLES.includes(me.role as (typeof AGENT_ROLES)[number])) {
      return NextResponse.json({ error: "Only agents can use this endpoint" }, { status: 403 });
    }

    const body = (await req.json().catch(() => null)) as Body | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    await ensureUserProfile(session.user.id);
    const userId = session.user.id;

    if (body.username !== undefined && body.username !== null) {
      const u = String(body.username).trim();
      if (u.length && !USERNAME_RE.test(u)) {
        return NextResponse.json(
          { error: "Username must be 3–32 characters: letters, numbers, underscore only" },
          { status: 400 }
        );
      }
      if (u.length) {
        const taken = await prisma.user.findFirst({
          where: { username: u, NOT: { id: userId } },
          select: { id: true },
        });
        if (taken) {
          return NextResponse.json({ error: "Username already taken" }, { status: 409 });
        }
        await prisma.user.update({ where: { id: userId }, data: { username: u } });
      }
    }

    if (body.email !== undefined && body.email !== null) {
      const email = String(body.email).trim().toLowerCase();
      if (!email.includes("@")) {
        return NextResponse.json({ error: "Invalid email" }, { status: 400 });
      }
      const taken = await prisma.user.findFirst({
        where: { email, NOT: { id: userId } },
        select: { id: true },
      });
      if (taken) {
        return NextResponse.json({ error: "Email already in use" }, { status: 409 });
      }
      await prisma.user.update({
        where: { id: userId },
        data: { email },
      });
    }

    if (body.phone !== undefined) {
      const raw = body.phone === null ? "" : String(body.phone).trim();
      if (raw.length === 0) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            fullPhoneNumber: null,
            phone: null,
            phoneNumber: null,
            phoneCode: null,
            whatsapp: null,
          },
        });
        await prisma.profile.update({
          where: { userId },
          data: { contactPhone: null },
        });
        await syncOwnerChannelContact(userId);
      } else {
        const normalized = normalizePlusE164(raw, me.country) ?? normalizePlusE164(raw);
        if (!normalized) {
          return NextResponse.json(
            { error: "Phone must be in international format, e.g. +971501234567" },
            { status: 400 }
          );
        }
        const digits = canonicalPhoneDigitsFromE164(normalized);
        const inferredCode = inferPhoneCodeFromE164(normalized);
        await prisma.user.update({
          where: { id: userId },
          data: {
            fullPhoneNumber: normalized,
            phone: digits,
            phoneNumber: digits,
            whatsapp: digits,
            ...(inferredCode ? { phoneCode: inferredCode } : {}),
          },
        });
        await prisma.profile.update({
          where: { userId },
          data: { contactPhone: normalized },
        });
        await syncOwnerChannelContact(userId);
      }
    }

    const fullName = body.fullName?.trim();
    if (fullName) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          fullName,
          name: fullName,
        },
      });
    }

    if (body.city !== undefined || body.country !== undefined) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          ...(body.city !== undefined ? { city: body.city?.trim() || null } : {}),
          ...(body.country !== undefined ? { country: body.country?.trim() || null } : {}),
        },
      });
    }

    const profilePatch: { name?: string | null; bio?: string | null; location?: string | null } = {};
    if (fullName) profilePatch.name = fullName;
    if ("bio" in body) profilePatch.bio = body.bio?.trim() || null;
    if ("location" in body) profilePatch.location = body.location?.trim() || null;

    if (Object.keys(profilePatch).length > 0) {
      await prisma.profile.update({
        where: { userId },
        data: profilePatch,
      });
    }

    const user = await prisma.user.findUnique({
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
          },
        },
      },
    });

    return NextResponse.json({ user });
  } catch (e) {
    console.error("PUT /api/profile/agent", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
