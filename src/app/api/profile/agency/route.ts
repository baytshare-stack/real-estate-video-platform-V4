import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { ensureUserProfile } from "@/lib/ensureUserProfile";
import { normalizePlusE164 } from "@/lib/countriesData";

export const runtime = "nodejs";

const AGENCY_ROLES = ["AGENCY"] as const;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,32}$/;

type Body = {
  username?: string;
  agencyName?: string;
  description?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  officeLocation?: string | null;
  officeCountry?: string | null;
  websiteUrl?: string | null;
};

function validateHttpUrl(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  if (!s.length) return null;
  try {
    const url = new URL(s.startsWith("http") ? s : `https://${s}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function validateContactPhone(value: string | null | undefined, countryHint: string | null): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  if (!trimmed.length) return null;
  const n = normalizePlusE164(trimmed, countryHint) ?? normalizePlusE164(trimmed);
  if (!n) return null;
  const d = n.slice(1).replace(/\D/g, "");
  if (d.length < 7 || d.length > 15) return null;
  return n;
}

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
    if (!AGENCY_ROLES.includes(me.role as (typeof AGENCY_ROLES)[number])) {
      return NextResponse.json({ error: "Only agencies can use this endpoint" }, { status: 403 });
    }

    const channel = await prisma.channel.findUnique({
      where: { ownerId: me.id },
      select: { id: true },
    });
    if (!channel) {
      return NextResponse.json(
        { error: "No channel found. Create a channel first." },
        { status: 404 }
      );
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

    const agencyName = body.agencyName?.trim();
    if (agencyName !== undefined && !agencyName.length) {
      return NextResponse.json({ error: "Agency name cannot be empty" }, { status: 400 });
    }

    const phone = validateContactPhone(body.contactPhone ?? undefined, me.country);
    if (body.contactPhone !== undefined && body.contactPhone !== null && String(body.contactPhone).trim() && !phone) {
      return NextResponse.json(
        { error: "Contact phone must be international format, e.g. +971501234567" },
        { status: 400 }
      );
    }

    const website = validateHttpUrl(body.websiteUrl ?? undefined);
    if (body.websiteUrl !== undefined && String(body.websiteUrl).trim() && !website) {
      return NextResponse.json({ error: "Invalid website URL" }, { status: 400 });
    }

    const channelData: {
      name?: string;
      description?: string | null;
      phone?: string | null;
      websiteUrl?: string | null;
      country?: string | null;
    } = {};

    if (agencyName) channelData.name = agencyName;
    if ("description" in body) channelData.description = body.description?.trim() || null;
    if (body.contactPhone !== undefined) channelData.phone = phone;
    if ("websiteUrl" in body) channelData.websiteUrl = website;
    if ("officeCountry" in body) channelData.country = body.officeCountry?.trim() || null;

    if (Object.keys(channelData).length > 0) {
      await prisma.channel.update({
        where: { id: channel.id },
        data: channelData,
      });
    }

    const profileData: { contactEmail?: string | null; location?: string | null; bio?: string | null; name?: string } =
      {};
    if ("contactEmail" in body) profileData.contactEmail = body.contactEmail?.trim() || null;
    if ("officeLocation" in body) profileData.location = body.officeLocation?.trim() || null;
    if ("description" in body) profileData.bio = body.description?.trim() || null;
    if (agencyName) profileData.name = agencyName;

    if (Object.keys(profileData).length > 0) {
      await prisma.profile.update({
        where: { userId },
        data: profileData,
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
            whatsapp: true,
          },
        },
      },
    });

    return NextResponse.json({ user });
  } catch (e) {
    console.error("PUT /api/profile/agency", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
