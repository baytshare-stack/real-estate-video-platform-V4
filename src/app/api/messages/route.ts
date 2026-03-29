import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const runtime = "nodejs";

const MAX_LEN = 8000;

const userMini = {
  id: true,
  username: true,
  fullName: true,
  name: true,
  image: true,
  profile: { select: { avatar: true, name: true } },
} as const;

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const me = session.user.id;
    const { searchParams } = new URL(req.url);
    const withId = searchParams.get("with")?.trim();

    if (withId) {
      const messages = await prisma.message.findMany({
        where: {
          OR: [
            { senderId: me, receiverId: withId },
            { senderId: withId, receiverId: me },
          ],
        },
        orderBy: { createdAt: "asc" },
        take: 300,
        include: {
          sender: { select: userMini },
          receiver: { select: userMini },
        },
      });

      return NextResponse.json({
        messages: messages.map((m) => ({
          id: m.id,
          content: m.content,
          createdAt: m.createdAt.toISOString(),
          senderId: m.senderId,
          receiverId: m.receiverId,
          sender: m.sender,
          receiver: m.receiver,
        })),
      });
    }

    const all = await prisma.message.findMany({
      where: {
        OR: [{ senderId: me }, { receiverId: me }],
      },
      orderBy: { createdAt: "desc" },
      take: 500,
      include: {
        sender: { select: userMini },
        receiver: { select: userMini },
      },
    });

    const peerLast = new Map<
      string,
      {
        peerId: string;
        lastMessage: string;
        lastAt: string;
        peer: (typeof all)[0]["sender"];
      }
    >();

    for (const m of all) {
      const peerId = m.senderId === me ? m.receiverId : m.senderId;
      if (peerLast.has(peerId)) continue;
      const peer = m.senderId === peerId ? m.sender : m.receiver;
      peerLast.set(peerId, {
        peerId,
        lastMessage: m.content,
        lastAt: m.createdAt.toISOString(),
        peer,
      });
    }

    const conversations = Array.from(peerLast.values()).sort((a, b) =>
      b.lastAt.localeCompare(a.lastAt)
    );

    return NextResponse.json({ conversations });
  } catch (e) {
    console.error("GET /api/messages", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as {
      receiverId?: string;
      content?: string;
    } | null;
    if (!body?.receiverId?.trim() || typeof body.content !== "string") {
      return NextResponse.json({ error: "receiverId and content are required" }, { status: 400 });
    }

    const receiverId = body.receiverId.trim();
    const content = body.content.trim();
    if (!content.length) {
      return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
    }
    if (content.length > MAX_LEN) {
      return NextResponse.json({ error: `Message too long (max ${MAX_LEN} characters)` }, { status: 400 });
    }

    const senderId = session.user.id;
    if (receiverId === senderId) {
      return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 });
    }

    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
      select: { id: true },
    });
    if (!receiver) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const created = await prisma.message.create({
      data: {
        senderId,
        receiverId,
        content,
      },
      include: {
        sender: { select: userMini },
        receiver: { select: userMini },
      },
    });

    return NextResponse.json({
      message: {
        id: created.id,
        content: created.content,
        createdAt: created.createdAt.toISOString(),
        senderId: created.senderId,
        receiverId: created.receiverId,
        sender: created.sender,
        receiver: created.receiver,
      },
    });
  } catch (e) {
    console.error("POST /api/messages", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
