import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { safeFindMany } from "@/lib/safePrisma";

function buildDemoVideoWhere(): Prisma.VideoWhereInput {
  // Hard safety rule: bulk demo cleanup can ONLY target explicit isDemo rows.
  return { isDemo: true };
}

function assertSafeDemoDeleteWhere(where: Prisma.VideoWhereInput) {
  const maybe = where as { isDemo?: unknown };
  if (maybe.isDemo !== true) {
    throw new Error("Unsafe delete blocked: missing strict isDemo=true filter.");
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const sessionRole = session?.user?.role as string | undefined;
    if (!session?.user?.id || (sessionRole !== "ADMIN" && sessionRole !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      execute?: boolean;
    };

    const execute = Boolean(body.execute);
    const where = buildDemoVideoWhere();
    assertSafeDemoDeleteWhere(where);

    const candidates = await safeFindMany(() =>
      prisma.video.findMany({
        where,
        select: {
          id: true,
          title: true,
          isDemo: true,
          isShort: true,
          videoUrl: true,
          thumbnail: true,
          createdAt: true,
          channel: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      })
    );

    // Safety-first: always log what would be deleted.
    console.log(
      `[clear-demo] mode=${execute ? "delete" : "dry-run"} candidates=${candidates.length}`
    );
    console.table(
      candidates.map((v) => ({
        id: v.id,
        title: v.title,
        isDemo: v.isDemo,
        isShort: v.isShort,
        channel: v.channel.name,
        hasVideoUrl: Boolean(v.videoUrl),
        hasThumbnail: Boolean(v.thumbnail),
        createdAt: v.createdAt.toISOString(),
      }))
    );

    if (!execute) {
      return NextResponse.json({
        success: true,
        mode: "dry-run",
        count: candidates.length,
        candidates,
      });
    }

    if (candidates.length === 0) {
      return NextResponse.json({
        success: true,
        mode: "delete",
        deletedCount: 0,
        deletedIds: [],
      });
    }

    const candidateIds = candidates.map((v) => v.id);
    assertSafeDemoDeleteWhere(where);
    const deleted = await prisma.video.deleteMany({
      where: { isDemo: true, id: { in: candidateIds } },
    });

    return NextResponse.json({
      success: true,
      mode: "delete",
      deletedCount: deleted.count,
      deletedIds: candidateIds,
    });
  } catch (error) {
    console.error("clear-demo route error:", error);
    return NextResponse.json({ error: "Failed to clear demo content" }, { status: 500 });
  }
}

