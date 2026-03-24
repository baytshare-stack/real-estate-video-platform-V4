import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { saveImageFile } from "@/lib/localMediaUpload";

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

    const { publicPath } = await saveImageFile(file);
    const userId = session.user.id;

    await prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        avatar: publicPath,
      },
      update: {
        avatar: publicPath,
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { image: publicPath },
    });

    return NextResponse.json({ url: publicPath }, { status: 200 });
  } catch (e) {
    console.error("POST /api/profile/avatar", e);
    const msg = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
