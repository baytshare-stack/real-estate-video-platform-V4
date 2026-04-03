import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as { isBlocked?: boolean };

    if (typeof body.isBlocked !== "boolean") {
      return NextResponse.json({ error: "isBlocked must be boolean." }, { status: 400 });
    }

    const result = await prisma.user.updateMany({
      where: { id },
      data: { isBlocked: body.isBlocked },
    });

    if (!result.count) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to update user." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
      return NextResponse.json({ error: "Cannot delete admin accounts." }, { status: 403 });
    }
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete user." }, { status: 500 });
  }
}

