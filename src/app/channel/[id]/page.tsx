import prisma from "@/lib/prisma";
import VideoCard from "@/components/VideoCard";
import SubscribeButton from "@/components/channel/SubscribeButton";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";

function digitsOnly(s: string) {
  return s.replace(/\D/g, "");
}

export default async function ChannelPage({ params }: { params: { id: string } }) {
  const unwrappedParams = await params;
  const channelId = unwrappedParams.id;

  const [session, channel, subscriberCount] = await Promise.all([
    getServerSession(authOptions),
    prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        owner: true,
        videos: {
          include: { property: true },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.subscription.count({ where: { channelId } }).catch(() => 0),
  ]);

  if (!channel) return notFound();

  const subscriberId = session?.user?.id as string | undefined;

  const me = subscriberId
    ? await prisma.user.findUnique({
        where: { id: subscriberId },
        select: { channel: { select: { id: true } } },
      })
    : null;

  const disabledSelf = Boolean(me?.channel?.id && me?.channel?.id === channelId);

  let initialSubscribed = false;
  if (subscriberId && !disabledSelf) {
    const existing = await prisma.subscription.findFirst({
      where: { subscriberId, channelId },
      select: { id: true },
    });
    initialSubscribed = Boolean(existing);
  }

  const profileImage = channel.profileImage ?? channel.avatar ?? undefined;
  const bannerImage = channel.bannerImage ?? channel.banner ?? undefined;

  const phone = channel.phone ?? undefined;
  const whatsappUrl = channel.whatsappUrl ?? undefined;
  const whatsapp = channel.whatsapp ?? undefined;
  const waHref = whatsappUrl
    ? whatsappUrl
    : whatsapp
      ? `https://wa.me/${digitsOnly(whatsapp)}`
      : undefined;

  const socials = [
    { label: "Facebook", href: channel.facebookUrl ?? undefined },
    { label: "Instagram", href: channel.instagramUrl ?? undefined },
    { label: "Telegram", href: channel.telegramUrl ?? undefined },
    { label: "YouTube", href: channel.youtubeUrl ?? undefined },
    { label: "Website", href: channel.websiteUrl ?? undefined },
  ].filter((s) => s.href);

  const shorts = channel.videos.filter((v) => v.isShort);
  const longs = channel.videos.filter((v) => !v.isShort);

  return (
    <div className="w-full bg-[#0f0f0f] min-h-screen">
      {/* Channel Banner */}
      <div className="w-full h-48 md:h-64 lg:h-80 bg-gradient-to-r from-indigo-900 to-purple-900 overflow-hidden relative">
        {bannerImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bannerImage} alt={`${channel.name} banner`} className="w-full h-full object-cover opacity-90" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] to-transparent" />
      </div>

      {/* Channel Header Context */}
      <div className="max-w-[2000px] mx-auto px-4 sm:px-8 lg:px-12 relative -mt-16 md:-mt-24 pb-8 border-b border-white/10">
        <div className="flex flex-col lg:flex-row items-center lg:items-end gap-6">
          <div className="w-28 h-28 md:w-40 md:h-40 rounded-full border-4 border-[#0f0f0f] overflow-hidden bg-gray-800 shadow-2xl flex-shrink-0">
            {profileImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profileImage} alt={channel.name} className="w-full h-full object-cover" />
            ) : (
              <img
                // eslint-disable-next-line @next/next/no-img-element
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(channel.name)}&background=random&size=200`}
                alt={channel.name}
                className="w-full h-full object-cover"
              />
            )}
          </div>

          <div className="flex-1 w-full text-center lg:text-left">
            <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">{channel.name}</h1>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-4 gap-y-1 text-gray-400 mt-2 mb-3 font-medium">
              <span>@{channel.name.replace(/\s+/g, "")}</span>
              <span className="w-1 h-1 rounded-full bg-gray-600 hidden md:block"></span>
              <span className="text-indigo-400">{channel.owner.role === "AGENCY" ? "Real Estate Agency" : "Real Estate Agent"}</span>
              <span className="w-1 h-1 rounded-full bg-gray-600 hidden md:block"></span>
              <span>{subscriberCount.toLocaleString()} subscriber{subscriberCount === 1 ? "" : "s"}</span>
              {channel.country ? (
                <>
                  <span className="w-1 h-1 rounded-full bg-gray-600 hidden md:block"></span>
                  <span className="text-gray-300">{channel.country}</span>
                </>
              ) : null}
            </div>

            <p className="text-gray-300 max-w-2xl line-clamp-2 md:line-clamp-none text-sm leading-relaxed">
              {channel.description || "Welcome to our channel! Explore our property video tours."}
            </p>

            {/* Contact info */}
            <div className="mt-4 flex flex-col sm:flex-row flex-wrap items-center justify-center lg:justify-start gap-3">
              {phone ? (
                <a
                  className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold transition-colors"
                  href={`tel:${phone.replace(/\s+/g, "")}`}
                >
                  Phone: {phone}
                </a>
              ) : null}
              {waHref ? (
                <a
                  className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold transition-colors"
                  href={waHref}
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp
                </a>
              ) : null}
              {channel.country ? (
                <span className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white text-xs font-semibold">
                  {channel.country}
                </span>
              ) : null}
              {socials.map((s) => (
                <a
                  key={s.label}
                  className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold transition-colors"
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          {/* Subscribe button */}
          <div className="w-full lg:w-auto flex justify-center lg:justify-end pt-2">
            <SubscribeButton
              channelId={channel.id}
              initialSubscribed={initialSubscribed}
              initialSubscriberCount={subscriberCount}
              disabledSelf={disabledSelf}
              isLoggedIn={Boolean(subscriberId)}
            />
          </div>
        </div>
      </div>

      <div className="max-w-[2000px] mx-auto px-4 sm:px-8 lg:px-12 py-8">
        {/* Shorts */}
        {shorts.length > 0 ? (
          <div className="mb-12">
            <h2 className="text-xl font-bold text-white mb-6">Shorts</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-x-4 gap-y-8">
              {shorts.map((video) => (
                <VideoCard
                  key={video.id}
                  id={video.id}
                  title={video.title}
                  thumbnailUrl={video.thumbnail || ""}
                  price={Number(video.property?.price ?? 0)}
                  location={video.property ? `${video.property.city}, ${video.property.country}` : "Unknown location"}
                  channelName={channel.name}
                  channelAvatarUrl={profileImage}
                  channelId={channel.id}
                  viewsCount={Math.floor(Math.random() * 5000)}
                  createdAt={video.createdAt}
                  bedrooms={video.property?.bedrooms ?? undefined}
                  bathrooms={video.property?.bathrooms ?? undefined}
                  sizeSqm={video.property?.sizeSqm ?? undefined}
                  status={video.property?.status ?? undefined}
                  isShort={true}
                />
              ))}
            </div>
          </div>
        ) : null}

        {/* Long videos */}
        {longs.length > 0 ? (
          <div>
            <h2 className="text-xl font-bold text-white mb-6">{longs.length > 0 ? "Long videos" : "Videos"}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-x-4 gap-y-8">
              {longs.map((video) => (
                <VideoCard
                  key={video.id}
                  id={video.id}
                  title={video.title}
                  thumbnailUrl={video.thumbnail || ""}
                  price={Number(video.property?.price ?? 0)}
                  location={video.property ? `${video.property.city}, ${video.property.country}` : "Unknown location"}
                  channelName={channel.name}
                  channelAvatarUrl={profileImage}
                  channelId={channel.id}
                  viewsCount={Math.floor(Math.random() * 5000)}
                  createdAt={video.createdAt}
                  bedrooms={video.property?.bedrooms ?? undefined}
                  bathrooms={video.property?.bathrooms ?? undefined}
                  sizeSqm={video.property?.sizeSqm ?? undefined}
                  status={video.property?.status ?? undefined}
                  isShort={false}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-gray-400">No property video tours uploaded yet.</div>
        )}
      </div>
    </div>
  );
}
