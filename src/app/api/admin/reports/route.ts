import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = (searchParams.get("status") || "").trim().toUpperCase();
    const where =
      status === "PENDING" || status === "REVIEWED" || status === "DISMISSED" ? { status: status as "PENDING" | "REVIEWED" | "DISMISSED" } : {};

    const reports = await prisma.contentReport.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        reporter: { select: { id: true, email: true, fullName: true } },
      },
    });

    return NextResponse.json({
      reports: reports.map((r) => ({
        id: r.id,
        targetType: r.targetType,
        targetId: r.targetId,
        reason: r.reason,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        reporter: r.reporter
          ? { id: r.reporter.id, email: r.reporter.email, fullName: r.reporter.fullName }
          : null,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Failed to load reports." }, { status: 500 });
  }
}
