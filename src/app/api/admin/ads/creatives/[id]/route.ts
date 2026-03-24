import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const deleted = await prisma.$executeRawUnsafe(`DELETE FROM "AdCreative" WHERE id = $1`, id);
    if (!deleted) return NextResponse.json({ error: "Creative not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete creative." }, { status: 500 });
  }
}

