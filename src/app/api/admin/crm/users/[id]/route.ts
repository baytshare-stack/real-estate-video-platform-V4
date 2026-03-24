import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type CrmStatus = "LEAD" | "ACTIVE" | "INACTIVE";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as Partial<{
      crmStatus?: CrmStatus;
      crmNotes?: string | null;
    }>;

    const sets: string[] = [];
    const params: any[] = [];

    if (body.crmStatus === "LEAD" || body.crmStatus === "ACTIVE" || body.crmStatus === "INACTIVE") {
      params.push(body.crmStatus);
      sets.push(`"crmStatus" = $${params.length}::"CrmStatus"`);
    }

    if (typeof body.crmNotes === "string" || body.crmNotes === null) {
      params.push(body.crmNotes);
      sets.push(`"crmNotes" = $${params.length}`);
    }

    if (!sets.length) {
      return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
    }

    params.push(id);
    await prisma.$executeRawUnsafe(
      `UPDATE "User" SET ${sets.join(", ")} WHERE id = $${params.length}`,
      ...params
    );

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("CRM PATCH failed:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to update CRM profile." },
      { status: 500 }
    );
  }
}

