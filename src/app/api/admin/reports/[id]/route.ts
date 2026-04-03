import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as { status?: string };
    const s = (body.status || "").trim().toUpperCase();
    if (s !== "PENDING" && s !== "REVIEWED" && s !== "DISMISSED") {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    await prisma.contentReport.update({
      where: { id },
      data: { status: s },
    });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const code = typeof e === "object" && e && "code" in e ? (e as { code?: string }).code : "";
    if (code === "P2025") {
      return NextResponse.json({ error: "Report not found." }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to update report." }, { status: 500 });
  }
}
