import type { MetadataRoute } from "next";
import { ModerationStatus, Role } from "@prisma/client";
import { locales } from "@/i18n/config";
import { listPublicStaticSeoPaths } from "@/i18n/seo";
import { prefixWithLocale } from "@/i18n/routing";
import { getSiteUrl } from "@/lib/site-url";
import prisma from "@/lib/prisma";
import { safeFindMany } from "@/lib/safePrisma";

export const revalidate = 3600;

function alternatesForPath(pathWithoutLocale: string): Record<string, string> {
  const base = getSiteUrl();
  const out: Record<string, string> = {};
  for (const loc of locales) {
    out[loc] = `${base}${prefixWithLocale(loc, pathWithoutLocale)}`;
  }
  out["x-default"] = `${base}${prefixWithLocale("en", pathWithoutLocale)}`;
  return out;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const staticPaths = listPublicStaticSeoPaths();
  const entries: MetadataRoute.Sitemap = [];

  for (const path of staticPaths) {
    for (const loc of locales) {
      const url = `${base}${prefixWithLocale(loc, path)}`;
      entries.push({
        url,
        changeFrequency: path === "/" ? "daily" : "weekly",
        priority: path === "/" ? 1 : 0.7,
        alternates: { languages: alternatesForPath(path) },
      });
    }
  }

  const [videos, channels, agents, agencies] = await Promise.all([
    safeFindMany(() =>
      prisma.video.findMany({
        where: { moderationStatus: ModerationStatus.APPROVED },
        select: { id: true, createdAt: true },
      })
    ),
    safeFindMany(() => prisma.channel.findMany({ select: { id: true } })),
    safeFindMany(() =>
      prisma.user.findMany({
        where: { role: Role.AGENT },
        select: { id: true, createdAt: true },
      })
    ),
    safeFindMany(() =>
      prisma.user.findMany({
        where: { role: Role.AGENCY },
        select: { id: true, createdAt: true },
      })
    ),
  ]);

  const pushDynamic = (pathWithoutLocale: string, lastMod?: Date) => {
    for (const loc of locales) {
      const url = `${base}${prefixWithLocale(loc, pathWithoutLocale)}`;
      entries.push({
        url,
        lastModified: lastMod,
        changeFrequency: "weekly",
        priority: 0.6,
        alternates: { languages: alternatesForPath(pathWithoutLocale) },
      });
    }
  };

  for (const v of videos) {
    pushDynamic(`/watch/${v.id}`, v.createdAt);
  }
  for (const c of channels) {
    pushDynamic(`/channel/${c.id}`);
  }
  for (const u of agents) {
    pushDynamic(`/agent/${u.id}`, u.createdAt);
  }
  for (const u of agencies) {
    pushDynamic(`/agency/${u.id}`, u.createdAt);
  }

  return entries;
}
