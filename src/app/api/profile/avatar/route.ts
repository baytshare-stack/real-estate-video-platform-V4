import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth-options";
import { assertImageFile } from "@/lib/localMediaUpload";
import { uploadBufferToCloudinaryStream } from "@/lib/cloudinary";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    const userId = session.user.id;

    await prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        avatar: secure_url,
      },
      update: {
        avatar: secure_url,
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { image: secure_url },
    });

    return NextResponse.json({ url: secure_url }, { status: 200 });
  } catch (e) {
    console.error("POST /api/profile/avatar", e);
    const msg = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
