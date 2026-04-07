"use client";

import { useState, useEffect, useRef, use } from 'react';
import { ThumbsUp, Share2, PhoneCall, MessageCircle, MapPin, Bed, Bath, Maximize, Mail, CalendarClock, Flag } from 'lucide-react';
import VideoCard from '@/components/VideoCard';
import ShareModal from '@/components/ShareModal';
import LocaleLink from '@/components/LocaleLink';
import { useTranslation } from '@/i18n/LanguageProvider';
import { useSession } from 'next-auth/react';
import YouTubePlayer from '@/components/video/YouTubePlayer';
import { getYouTubeEmbedUrl } from '@/lib/youtube';
import WatchPageComments from '@/components/watch/WatchPageComments';
import SubscriptionNotifyDropdown, { type NotifyPref } from '@/components/channel/SubscriptionNotifyDropdown';
import { formatSubscriberCount } from '@/lib/formatSubscribers';
import TemplateMotionPlayer from '@/components/video/TemplateMotionPlayer';
import { trackTemplateInteraction } from '@/lib/video-templates/track';
import BookVisitModal from '@/components/watch/BookVisitModal';
import WatchVideoAdsShell from '@/components/watch/WatchVideoAdsShell';
import FinalPriceActions from '@/components/property/FinalPriceActions';

function isNotifyPref(v: unknown): v is NotifyPref {
  return v === 'ALL' || v === 'PERSONALIZED' || v === 'NONE';
}

export default function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const videoId = unwrappedParams.id;
  const { t } = useTranslation();
  const { status: sessionStatus } = useSession();
  const [videoData, setVideoData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [notifyPref, setNotifyPref] = useState<NotifyPref>('ALL');
  const [recommendations, setRecommendations] = useState<any[]>([]);

  // Engagement State
  const [likesCount, setLikesCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isBookVisitOpen, setIsBookVisitOpen] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);
  const nativeVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        const res = await fetch(`/api/video/watch?id=${videoId}`);
        if (!res.ok) throw new Error('Failed to fetch video');
        const data = await res.json();
        setVideoData(data);
        setLikesCount(data.likesCount || 0);
        setIsLiked(data.userReaction === "LIKE");
        setIsSubscribed(Boolean(data.subscribedToChannel));
        const sc =
          typeof data.channel?.subscribersCount === 'number'
            ? data.channel.subscribersCount
            : typeof data.channel?.followersCount === 'number'
              ? data.channel.followersCount
              : 0;
        setSubscriberCount(sc);
        if (isNotifyPref(data.subscriptionNotificationPreference)) {
          setNotifyPref(data.subscriptionNotificationPreference);
        }

        // Fetch recommendations asynchronously
        fetch(`/api/recommendations/similar?videoId=${videoId}`)
          .then(r => r.json())
          .then(data => { if (Array.isArray(data)) setRecommendations(data); })
          .catch(e => console.error("Recs error", e));

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (videoId) fetchVideo();
  }, [videoId]);

  const handleLike = async () => {
    if (sessionStatus !== "authenticated") return;

    const previousReaction = isLiked;
    const previousCount = likesCount;
    setIsLiked(!isLiked);
    setLikesCount((prev) => (isLiked ? prev - 1 : prev + 1));

    try {
      const res = await fetch(`/api/videos/${encodeURIComponent(videoId)}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type: "LIKE" }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        likesCount?: number;
        userReaction?: "LIKE" | "DISLIKE" | null;
      };
      if (!res.ok) throw new Error(data.error || "Like failed");

      if (typeof data.likesCount === "number") setLikesCount(data.likesCount);
      setIsLiked(data.userReaction === "LIKE");
    } catch (e) {
      console.error(e);
      setIsLiked(previousReaction);
      setLikesCount(previousCount);
    }
  };

  const handleReportVideo = async () => {
    if (sessionStatus !== "authenticated") return;
    const ok = window.confirm("Report this listing to moderators?");
    if (!ok) return;
    setReportBusy(true);
    try {
      const res = await fetch("/api/video/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          targetType: "VIDEO",
          targetId: videoId,
          reason: "User report from watch page",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Report failed");
      window.alert("Thanks — moderators will review this report.");
    } catch (e) {
      console.error(e);
      window.alert(e instanceof Error ? e.message : "Could not submit report.");
    } finally {
      setReportBusy(false);
    }
  };

  const handleSubscribe = async () => {
    if (sessionStatus !== "authenticated") return;
    const chId = videoData?.channelId || videoData?.channel?.id;
    if (!chId) return;

    const prev = isSubscribed;
    setIsSubscribed(!prev);
    try {
      const res = await fetch(`/api/channels/${encodeURIComponent(chId)}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        subscribed?: boolean;
        subscriberCount?: number;
        notificationPreference?: string;
      };
      if (!res.ok) throw new Error(data.error || "Subscribe failed");
      if (typeof data.subscribed === "boolean") setIsSubscribed(data.subscribed);
      if (typeof data.subscriberCount === "number") setSubscriberCount(data.subscriberCount);
      if (isNotifyPref(data.notificationPreference)) setNotifyPref(data.notificationPreference);
      else if (data.subscribed) setNotifyPref("ALL");
    } catch (e) {
      console.error(e);
      setIsSubscribed(prev);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-white">Loading video...</div>;
  if (error || !videoData) return <div className="min-h-screen flex items-center justify-center text-white">Error loading video or not found. <LocaleLink href="/" className="ml-2 text-blue-500">Go home</LocaleLink></div>;

  const video = videoData;
  const channel = videoData.channel || {};
  const contact = videoData.contact || {};

  const formattedPrice = `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(video.price || 0)} ${video.currency || 'USD'}`;
  const locationString = video.location || `${video.city || ''}, ${video.country || ''}`.replace(/^,\s*|\s*,$/g, '');

  const templateImages = Array.isArray(video.images)
    ? video.images.filter((u: unknown): u is string => typeof u === 'string' && u.length > 0)
    : [];
  const templateAudioUser =
    typeof video.audio === 'string' && video.audio.trim() ? video.audio.trim() : null;
  const templateDefaultAudio =
    typeof video.template?.defaultAudio === 'string' && video.template.defaultAudio.trim()
      ? video.template.defaultAudio.trim()
      : null;
  const chIdForTrack = video.channelId || channel.id;

  const isNativeFile =
    Boolean(video.videoUrl) && !getYouTubeEmbedUrl(video.videoUrl) && !video.isTemplate;

  return (
    <>
    <div className="mx-auto grid max-w-[1600px] gap-4 px-2 py-3 sm:gap-6 sm:p-4 lg:grid lg:grid-cols-[1fr_400px] lg:p-6">
      
      {/* Primary Column: Video & Details */}
      <div className="flex min-w-0 w-full flex-col gap-4 overflow-hidden">
        
        {/* The Video Player Area + platform ads */}
        <WatchVideoAdsShell
          watchVideoId={videoId}
          videoRef={isNativeFile ? nativeVideoRef : undefined}
          outerClassName={[
            "bg-black rounded-2xl overflow-hidden border border-gray-800 shadow-2xl flex items-center justify-center",
            video.isShort
              ? "aspect-[9/16] w-full max-w-[400px] mx-auto"
              : "w-full aspect-video",
          ].join(" ")}
        >
            {video.isTemplate && video.template?.config ? (
              <TemplateMotionPlayer
                config={video.template.config}
                images={templateImages}
                audioUrl={templateAudioUser}
                fallbackAudioUrl={templateDefaultAudio}
                title={video.title}
                priceLine={formattedPrice}
                locationLine={locationString || 'Prime location'}
                channelName={channel.channelName || 'Channel'}
                channelAvatarUrl={channel.avatarUrl}
                isShort={Boolean(video.isShort)}
                trackView={{ videoId, channelId: chIdForTrack }}
              />
            ) : video.videoUrl ? (
                getYouTubeEmbedUrl(video.videoUrl) ? (
                  <YouTubePlayer watchUrl={video.videoUrl} title={video.title} className="w-full h-full min-h-0" />
                ) : (
                  <video
                    ref={nativeVideoRef}
                    src={video.videoUrl}
                    controls
                    className="w-full h-full object-contain"
                    poster={video.thumbnailUrl}
                  />
                )
            ) : (
               <div className="text-gray-500 flex flex-col items-center">
                  <PlaySquareIcon className="w-16 h-16 text-gray-700 mb-2" />
                  <p>Processing Video Stream</p>
               </div>
            )}
        </WatchVideoAdsShell>

        {/* Video Title */}
        <h1 className="text-xl md:text-2xl font-bold text-white mt-2 font-[family-name:var(--font-geist-sans)] line-clamp-2 leading-tight">{video.title}</h1>

        {/* Interactions & Channel Bar */}
        <div className="flex flex-col gap-4 border-b border-gray-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
            
            <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
                <LocaleLink href={`/channel/${channel.id}`}>
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden bg-gray-800 shrink-0">
                        <img src={channel.avatarUrl || `https://ui-avatars.com/api/?name=${channel.name}&background=random`} alt={channel.name} className="w-full h-full object-cover" />
                    </div>
                </LocaleLink>
                <div className="flex min-w-0 flex-1 flex-col justify-center">
                    <LocaleLink href={`/channel/${video.channelId || 'demo'}`} className="min-w-0">
                        <h3 className="line-clamp-2 text-base font-medium leading-tight text-white transition-colors hover:text-blue-400 md:line-clamp-1 md:text-lg">{channel.channelName || 'Unknown Channel'}</h3>
                    </LocaleLink>
                    <p className="text-gray-400 text-xs md:text-sm">
                      {formatSubscriberCount(subscriberCount)} {t('watch', 'subscribers')}
                    </p>
                </div>
                <div className="ml-2 flex shrink-0 items-center gap-1">
                <button 
                    type="button"
                    onClick={() => void handleSubscribe()}
                    className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full font-medium transition-colors flex items-center gap-2 text-sm ${
                        isSubscribed ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-white text-black hover:bg-gray-200'
                    }`}
                >
                    {isSubscribed ? t('watch', 'subscribed') : t('watch', 'subscribe')}
                </button>
                {isSubscribed && sessionStatus === 'authenticated' && (video.channelId || channel.id) ? (
                  <SubscriptionNotifyDropdown
                    channelId={video.channelId || channel.id}
                    value={notifyPref}
                    onChange={setNotifyPref}
                    variant="watch"
                  />
                ) : null}
                </div>
            </div>

            <div className="flex w-full max-w-full shrink-0 flex-wrap items-center gap-1 rounded-full border border-gray-800 bg-gray-900 p-1 sm:w-auto md:gap-2">
                <button 
                  type="button"
                  onClick={() => void handleLike()} 
                  className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 rounded-full transition-colors text-sm font-medium ${isLiked ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-white/10 text-white'}`}
                >
                    <ThumbsUp className={`w-4 h-4 md:w-5 md:h-5 ${isLiked ? 'fill-blue-400' : ''}`} /> {likesCount}
                </button>
                <div className="w-[1px] h-5 md:h-6 bg-gray-700"></div>
                <button 
                    onClick={() => setIsShareModalOpen(true)}
                    className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 hover:bg-white/10 rounded-full transition-colors text-white text-sm font-medium"
                >
                    <Share2 className="w-4 h-4 md:w-5 md:h-5" /> {t('watch', 'share')}
                </button>
                {sessionStatus === "authenticated" ? (
                  <button
                    type="button"
                    disabled={reportBusy}
                    onClick={() => void handleReportVideo()}
                    className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 hover:bg-white/10 rounded-full transition-colors text-white/80 text-sm font-medium disabled:opacity-50"
                    title="Report listing"
                  >
                    <Flag className="w-4 h-4 md:w-5 md:h-5" /> Report
                  </button>
                ) : null}
                <div className="hidden h-5 md:h-6 w-px bg-gray-700 sm:block" />
                <span className="hidden text-xs text-gray-400 sm:inline md:text-sm">
                  {formatSubscriberCount(subscriberCount)} {t('watch', 'subscribers')}
                </span>
            </div>
        </div>

        {/* Property Information Card (Below Video Layout as requested) */}
        <div className="bg-gray-900/50 rounded-2xl p-4 md:p-5 border border-gray-800 mt-2">
            <div className="mb-3 text-xs md:text-sm">
              <FinalPriceActions
                videoId={videoId}
                listPriceLabel={formattedPrice}
                trailing={
                  <>
                    <span className="bg-blue-600/20 px-2 py-0.5 text-[11px] font-bold text-blue-400 rounded sm:text-xs">
                      {video.status === "FOR_SALE" ? t("watch", "forSale") : t("watch", "forRent")}
                    </span>
                    <span className="text-gray-400">
                      • {video.viewsCount || 0} {t("watch", "views")} • {new Date(video.createdAt).toLocaleDateString()}
                    </span>
                  </>
                }
              />
            </div>

            {/* Quick Stats Banner */}
            <div className="flex flex-wrap gap-4 py-3 md:py-4 border-y border-gray-800/50 my-3 md:my-4">
                <div className="flex items-center gap-2 text-gray-300">
                    <Bed className="w-4 h-4 md:w-5 md:h-5 text-gray-500" />
                    <span className="text-sm md:text-base"><strong className="text-white">{video.bedrooms}</strong> {t('watch', 'beds')}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                    <Bath className="w-4 h-4 md:w-5 md:h-5 text-gray-500" />
                    <span className="text-sm md:text-base"><strong className="text-white">{video.bathrooms}</strong> {t('watch', 'baths')}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                    <Maximize className="w-4 h-4 md:w-5 md:h-5 text-gray-500" />
                    <span className="text-sm md:text-base"><strong className="text-white">{video.sizeSqm}</strong> {t('watch', 'sqm')}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300 w-full sm:w-auto mt-1 sm:mt-0">
                    <MapPin className="w-4 h-4 md:w-5 md:h-5 text-gray-500 shrink-0" />
                    <span className="text-sm md:text-base truncate"><strong className="text-white">{locationString}</strong></span>
                </div>
            </div>

            <p className="break-words text-xs leading-relaxed text-gray-300 whitespace-pre-wrap md:text-sm">
                {video.description}
            </p>

            {/* Contact + Book a Visit */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                    <button
                        type="button"
                        onClick={() => setIsBookVisitOpen(true)}
                        className="flex-1 border border-blue-500/40 bg-blue-600/15 hover:bg-blue-600/25 text-blue-100 flex items-center justify-center gap-1.5 py-2 px-3 md:px-4 rounded-lg font-semibold text-sm md:text-base transition-colors shadow-md shadow-blue-900/15"
                    >
                        <CalendarClock className="w-4 h-4 md:w-5 md:h-5 shrink-0" /> {t('watch', 'bookVisit')}
                    </button>
                    {contact.whatsappLink ? (
                    <a 
                        href={contact.whatsappLink} 
                        target="_blank" 
                        rel="noreferrer"
                        onClick={() => {
                          if (video.isTemplate && chIdForTrack) {
                            trackTemplateInteraction(videoId, chIdForTrack, 'whatsapp');
                          }
                        }}
                        className="flex-1 bg-[#25D366] hover:bg-[#20bd5a] text-white flex items-center justify-center gap-1.5 py-2 px-3 md:px-4 rounded-lg font-semibold text-sm md:text-base transition-colors shadow-md shadow-[#25D366]/15"
                    >
                        <MessageCircle className="w-4 h-4 md:w-5 md:h-5 shrink-0" /> WhatsApp
                    </a>
                    ) : null}
                    {contact.rawPhone ? (
                    <a 
                        href={`tel:${String(contact.rawPhone).replace(/\s+/g, '')}`} 
                        onClick={() => {
                          if (video.isTemplate && chIdForTrack) {
                            trackTemplateInteraction(videoId, chIdForTrack, 'call');
                          }
                        }}
                        className="flex-1 bg-white hover:bg-gray-200 text-black flex items-center justify-center gap-1.5 py-2 px-3 md:px-4 rounded-lg font-semibold text-sm md:text-base transition-colors shadow-md shadow-white/10"
                    >
                        <PhoneCall className="w-4 h-4 md:w-5 md:h-5 shrink-0" /> {contact.rawPhone}
                    </a>
                    ) : null}
                    {contact.email ? (
                    <a 
                        href={`mailto:${encodeURIComponent(contact.email)}?subject=${encodeURIComponent('Inquiry: ' + (video.title || 'Listing'))}`}
                        onClick={() => {
                          if (video.isTemplate && chIdForTrack) {
                            trackTemplateInteraction(videoId, chIdForTrack, 'email');
                          }
                        }}
                        className="flex-1 border border-gray-600 bg-gray-800 hover:bg-gray-700 text-white flex items-center justify-center gap-2 py-3 px-4 md:px-6 rounded-xl font-bold text-base md:text-lg transition-colors"
                    >
                        <Mail className="w-5 h-5 md:w-6 md:h-6" /> Email
                    </a>
                    ) : null}
                </div>
        </div>

        <WatchPageComments videoId={videoId} />

      </div>

      {/* Secondary Column: Recommendations */}
      <div className="hidden min-w-0 flex-col gap-4 lg:flex">
        <h3 className="text-lg font-bold text-white">{t('watch', 'recommended')}</h3>
        {recommendations?.map((rec: any) => (
           <VideoCard 
             key={rec.id} 
             {...rec}
             channelId={rec.channelId ?? rec.channel?.id}
             channelName={rec.channel?.channelName}
             channelAvatarUrl={rec.channel?.avatarUrl}
           />
        ))}
      </div>

    </div>
    
    <ShareModal 
      isOpen={isShareModalOpen} 
      onClose={() => setIsShareModalOpen(false)} 
      title={video?.title || 'Check out this property!'}
    />
    <BookVisitModal
      isOpen={isBookVisitOpen}
      onClose={() => setIsBookVisitOpen(false)}
      videoId={videoId}
      videoTitle={video?.title || ''}
    />
    </>
  );
}

function PlaySquareIcon(props: any) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><path d="m9 8 6 4-6 4Z"/></svg>
}
