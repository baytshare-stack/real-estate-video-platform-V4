import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { assertImageFile } from "@/lib/localMediaUpload";
import { uploadBufferToCloudinaryStream } from "@/lib/cloudinary";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true },
    });
    if (!me || me.role !== "AGENCY") {
      return NextResponse.json({ error: "Only agency accounts can upload a channel logo" }, { status: 403 });
    }

    const channel = await prisma.channel.findUnique({
      where: { ownerId: me.id },
      select: { id: true },
    });
    if (!channel) {
      return NextResponse.json({ error: "No channel found" }, { status: 404 });
    }

    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }

    assertImageFile(file);
    const buffer = Buffer.from(await file.arrayBuffer());
    const { secure_url } = await uploadBufferToCloudinaryStream(buffer, "image");

    await prisma.channel.update({
      where: { id: channel.id },
      data: {
        avatar: secure_url,
        profileImage: secure_url,
      },
    });

    return NextResponse.json({ url: secure_url }, { status: 200 });
  } catch (e) {
    console.error("POST /api/profile/agency-logo", e);
    const msg = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
