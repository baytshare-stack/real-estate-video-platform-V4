import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import {
  ExternalLink,
  MapPin,
  MessageCircle,
  Phone,
  Users,
  Video,
} from "lucide-react";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import SubscribeButton from "@/components/channel/SubscribeButton";
import SendMessageButton from "@/components/profile/SendMessageButton";
import StarRating from "@/components/discover/StarRating";
import VideoCard from "@/components/VideoCard";
import { getAgencyProfile } from "@/lib/discover-queries";
import {
  discoverAvatarUrl,
  discoverDisplayName,
  discoverLocation,
} from "@/lib/discover-display";
import prisma from "@/lib/prisma";
import { serializeVideosForClient } from "@/lib/serializePrismaVideos";
import { safeCount, safeFindFirst } from "@/lib/safePrisma";

export const dynamic = "force-dynamic";

function digitsOnly(s: string) {
  return s.replace(/\D/g, "");
}

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const user = await getAgencyProfile(id);
  if (!user) return { title: "Agency not found" };
  return {
    title: `${discoverDisplayName(user)} | Agency`,
    description: user.profile?.bio ?? "Real estate agency on BytakTube",
  };
}

export default async function AgencyProfilePage({ params }: Props) {
  const { id } = await params;
  const user = await getAgencyProfile(id);
  if (!user) notFound();

  const session = await getServerSession(authOptions);
  const subscriberId = session?.user?.id as string | undefined;
  const channel = user.channel;

  const me = subscriberId
    ? await safeFindFirst(() =>
        prisma.user.findUnique({
          where: { id: subscriberId },
          select: { channel: { select: { id: true } } },
        })
      )
    : null;

  const channelId = channel?.id;
  let initialSubscribed = false;
  let initialNotificationPreference: "ALL" | "PERSONALIZED" | "NONE" | null = null;
  let subscriberCount = channel?.subscribersCount ?? 0;
  const disabledSelf = Boolean(channelId && me?.channel?.id === channelId);

  if (channelId && subscriberId && !disabledSelf) {
    const existing = await safeFindFirst(() =>
      prisma.subscription.findFirst({
        where: { subscriberId, channelId },
        select: { id: true, notificationPreference: true },
      })
    );
    initialSubscribed = Boolean(existing);
    initialNotificationPreference = existing?.notificationPreference ?? null;
    subscriberCount = await safeCount(() =>
      prisma.subscription.count({ where: { channelId } })
    );
  }

  const displayName = discoverDisplayName(user);
  const avatar =
    discoverAvatarUrl(user) ??
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=400&h=400";
  const location = discoverLocation(user);
  const bio = user.profile?.bio?.trim() || "Property marketing team on BytakTube.";
  const phone =
    user.phone?.trim() ||
    user.fullPhoneNumber?.trim() ||
    user.profile?.contactPhone?.trim() ||
    channel?.phone?.trim() ||
    "";
  const whatsapp = user.whatsapp?.trim() || channel?.whatsapp?.trim() || "";
  const whatsappUrl = channel?.whatsappUrl?.trim();
  const waHref = whatsappUrl
    ? whatsappUrl
    : whatsapp
      ? `https://wa.me/${digitsOnly(whatsapp)}`
      : "";

  const rawVideos = channel?.videos ?? [];
  const videos = serializeVideosForClient(rawVideos);
  const team = user.agencyAgents ?? [];

  return (
    <div className="min-h-screen bg-[#0f0f0f] pb-24">
      <div className="h-48 md:h-64 w-full bg-gradient-to-br from-violet-900/90 via-[#0f0f0f] to-fuchsia-900/50" />
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 -mt-24 pb-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end">
          <div className="flex items-end gap-4">
            <div className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl border-4 border-[#0f0f0f] bg-black shadow-2xl sm:h-36 sm:w-36">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={avatar} alt="" className="h-full w-full object-cover" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-white md:text-3xl">{displayName}</h1>
              {user.isVerified ? (
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/40">
                  Verified
                </span>
              ) : null}
              {user.isFeatured ? (
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-200 ring-1 ring-amber-500/40">
                  Featured
                </span>
              ) : null}
            </div>
            <p className="mt-2 flex items-center gap-2 text-white/65">
              <MapPin className="h-4 w-4 shrink-0" />
              {location}
            </p>
            <div className="mt-3">
              <StarRating value={user.rating} />
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
            {phone ? (
              <a
                href={`tel:${digitsOnly(phone)}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/15"
              >
                <Phone className="h-4 w-4" />
                Call office
              </a>
            ) : null}
            {waHref ? (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-emerald-500"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            ) : null}
            {subscriberId && subscriberId !== user.id ? (
              <SendMessageButton receiverId={user.id} receiverName={displayName} />
            ) : null}
            {channelId ? (
              <SubscribeButton
                channelId={channelId}
                initialSubscribed={initialSubscribed}
                initialSubscriberCount={subscriberCount}
                initialNotificationPreference={initialNotificationPreference}
                disabledSelf={disabledSelf}
                isLoggedIn={Boolean(subscriberId)}
              />
            ) : null}
            {channelId ? (
              <Link
                href={`/channel/${channelId}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-white/90 transition hover:bg-white/5"
              >
                <ExternalLink className="h-4 w-4" />
                Channel
              </Link>
            ) : null}
          </div>
        </div>

        <p className="mt-8 max-w-3xl text-sm leading-relaxed text-white/70">{bio}</p>

        {team.length > 0 ? (
          <section className="mt-12">
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-violet-400" />
              <h2 className="text-lg font-semibold text-white">Agents</h2>
              <span className="text-sm text-white/45">({team.length})</span>
            </div>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {team.map((a) => {
                const img =
                  a.profile?.avatar?.trim() ||
                  a.image?.trim() ||
                  "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=200&h=200";
                const nm = a.name?.trim() || (a.fullName !== "User" ? a.fullName : "Agent");
                const loc = [a.city, a.country].filter(Boolean).join(", ") || "—";
                const vc = a.channel?._count?.videos ?? 0;
                return (
                  <li key={a.id}>
                    <Link
                      href={`/agent/${a.id}`}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-violet-500/40 hover:bg-white/[0.06]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img}
                        alt=""
                        className="h-14 w-14 rounded-xl object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-white">{nm}</p>
                        <p className="truncate text-xs text-white/50">{loc}</p>
                        <p className="text-xs text-violet-300/90">{vc} videos</p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <section className="mt-12">
          <div className="mb-4 flex items-center gap-2">
            <Video className="h-5 w-5 text-violet-400" />
            <h2 className="text-lg font-semibold text-white">Company listings</h2>
            <span className="text-sm text-white/45">({videos.length})</span>
          </div>
          {videos.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-white/[0.02] py-12 text-center text-white/45">
              No published videos yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {videos.map((v: any) => (
                <VideoCard
                  key={v.id}
                  id={v.id}
                  title={v.title}
                  thumbnailUrl={v.thumbnailUrl ?? v.thumbnail}
                  videoUrl={v.videoUrl}
                  price={Number(v.property?.price ?? 0)}
                  currency={v.property?.currency ?? "USD"}
                  location={
                    v.property ? `${v.property.city}, ${v.property.country}` : "—"
                  }
                  channelName={channel?.name ?? displayName}
                  channelAvatarUrl={channel?.avatar ?? undefined}
                  channelId={channel?.id}
                  viewsCount={v.viewsCount}
                  createdAt={new Date(v.createdAt)}
                  isShort={Boolean(v.isShort)}
                  bedrooms={v.property?.bedrooms ?? undefined}
                  bathrooms={v.property?.bathrooms ?? undefined}
                  sizeSqm={v.property?.sizeSqm ?? undefined}
                  status={v.property?.status}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
