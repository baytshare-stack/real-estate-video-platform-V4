import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { recordWatchIntentFromVideo } from "@/lib/ads-platform/intent-profile-service";

export const runtime = "nodejs";

/** Records organic listing watch for signed-in users (feeds UserIntent profile). */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id as string | undefined;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as { videoId?: string };
    const videoId = (body.videoId || "").trim();
    if (!videoId) {
      return NextResponse.json({ error: "videoId is required." }, { status: 400 });
    }

    await recordWatchIntentFromVideo(userId, videoId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("intent-signal error", e);
    return NextResponse.json({ error: "Failed to record intent." }, { status: 500 });
  }
}
