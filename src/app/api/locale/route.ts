import { NextResponse } from "next/server";
import { locales, type Locale, LOCALE_COOKIE } from "@/i18n/config";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as { locale?: string } | null;
    const raw = body?.locale;
    if (!raw || !locales.includes(raw as Locale)) {
      return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
    }
    const locale = raw as Locale;
    const res = NextResponse.json({ ok: true, locale });
    res.cookies.set(LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
