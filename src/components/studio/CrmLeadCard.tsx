"use client";

import {
  Bell,
  Heart,
  MessageCircle,
  Mail,
  Phone,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Eye,
  MousePointerClick,
} from "lucide-react";
import { useState } from "react";
import { mailtoInquiryUrl, telHref, whatsappDigits, whatsappUrl } from "@/lib/crmContactLinks";
import { useTranslation } from "@/i18n/LanguageProvider";

export interface CrmTemplateEvent {
  type: string;
  videoTitle: string;
  createdAt: string;
}

export interface CrmInteractor {
  user: {
    id: string;
    fullName: string;
    email: string;
    country: string | null;
    phoneNumber: string | null;
    phoneCode: string | null;
    phone: string | null;
    fullPhoneNumber: string | null;
    whatsapp: string | null;
    role: string;
  };
  likes: { videoTitle: string }[];
  comments: { videoTitle: string }[];
  totalInteractions: number;
  isSubscriber?: boolean;
  templateEvents?: CrmTemplateEvent[];
  /** Logged-out template traffic rolled into one row */
  isAnonymousAggregate?: boolean;
}

interface CrmLeadCardProps {
  lead: CrmInteractor;
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
      />
    </svg>
  );
}

export default function CrmLeadCard({ lead }: CrmLeadCardProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const templateEventLabel = (type: string) => {
    switch (type) {
      case "TEMPLATE_VIEW":
        return t("studio", "crm.eventTemplateView");
      case "TEMPLATE_WHATSAPP_CLICK":
        return t("studio", "crm.eventWhatsapp");
      case "TEMPLATE_CALL_CLICK":
        return t("studio", "crm.eventCall");
      case "TEMPLATE_EMAIL_CLICK":
        return t("studio", "crm.eventEmail");
      default:
        return t("studio", "crm.eventDefault");
    }
  };
  const {
    user,
    likes,
    comments,
    totalInteractions,
    isSubscriber,
    templateEvents = [],
    isAnonymousAggregate,
  } = lead;
  const initials = user.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const interestScore = Math.min(100, totalInteractions * 15);
  const scoreColor =
    interestScore >= 70 ? "bg-emerald-500" : interestScore >= 40 ? "bg-yellow-500" : "bg-blue-500";

  const waDigits = whatsappDigits(user);
  const phoneHref = telHref(user);
  const waPrefill = `Hello ${user.fullName}, I am interested in your property listing on RealEstateTV.`;
  const mailHref =
    user.email.trim().length > 0
      ? mailtoInquiryUrl(user.email, {
          leadName: user.fullName,
          subject: "Property inquiry — RealEstateTV",
          bodyIntro: `Hello ${user.fullName},\n\nI am reaching out regarding your interest in our real estate listings on RealEstateTV.\n\nBest regards`,
        })
      : null;

  const btnClass =
    "flex min-h-[44px] flex-1 min-w-[6.5rem] items-center justify-center gap-2 rounded-xl border px-2 py-2.5 text-xs font-semibold transition-colors sm:text-sm";

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-gray-900/80 p-4 transition-all hover:border-white/15">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-sm font-bold text-white shadow-lg">
          {initials}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-white">{user.fullName}</p>
            <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-400">
              {user.role}
            </span>
          </div>
          {user.email ? (
            <p className="truncate text-xs text-gray-500">{user.email}</p>
          ) : (
            <p className="truncate text-xs text-gray-600 italic">No email on file</p>
          )}
          {user.country ? <p className="text-xs text-gray-600">{user.country}</p> : null}
        </div>

        <div className="flex flex-shrink-0 items-center gap-3">
          {likes.length > 0 && (
            <div className="flex items-center gap-1 text-xs font-medium text-red-400">
              <Heart className="h-3.5 w-3.5" /> {likes.length}
            </div>
          )}
          {comments.length > 0 && (
            <div className="flex items-center gap-1 text-xs font-medium text-blue-400">
              <MessageCircle className="h-3.5 w-3.5" /> {comments.length}
            </div>
          )}
          {isSubscriber ? (
            <div className="flex items-center gap-1 text-xs font-medium text-amber-400" title={t("studio", "crm.subscriberTitle")}>
              <Bell className="h-3.5 w-3.5" /> {t("studio", "crm.subBadge")}
            </div>
          ) : null}
          {templateEvents.length > 0 && (
            <div
              className="flex items-center gap-1 text-xs font-medium text-violet-400"
              title={t("studio", "crm.templateEngagementTitle")}
            >
              <Sparkles className="h-3.5 w-3.5" /> {templateEvents.length}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="ml-1 rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-white/5"
          aria-expanded={expanded}
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      <div className="mb-1 mt-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-500">{t("studio", "crm.interestScore")}</span>
          <span className="text-xs font-bold text-gray-400">{interestScore}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-gray-800">
          <div
            className={`h-full rounded-full transition-all duration-500 ${scoreColor}`}
            style={{ width: `${interestScore}%` }}
          />
        </div>
      </div>

      {expanded && (
        <div className="mt-4 flex flex-col gap-3 border-t border-white/[0.06] pt-4">
          {isSubscriber ? (
            <p className="text-xs text-amber-400/90">
              <Bell className="mb-0.5 mr-1 inline h-3.5 w-3.5" />
              {t("studio", "crm.subscribedHint")}
            </p>
          ) : null}
          {likes.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">{t("studio", "crm.likedVideos")}</p>
              {likes.slice(0, 3).map((l, i) => (
                <p key={i} className="line-clamp-1 flex items-center gap-1.5 text-xs text-gray-400">
                  <Heart className="h-3 w-3 flex-shrink-0 text-red-400" /> {l.videoTitle}
                </p>
              ))}
            </div>
          )}
          {comments.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">{t("studio", "crm.commentedOn")}</p>
              {comments.slice(0, 3).map((c, i) => (
                <p key={i} className="line-clamp-1 flex items-center gap-1.5 text-xs text-gray-400">
                  <MessageCircle className="h-3 w-3 flex-shrink-0 text-blue-400" /> {c.videoTitle}
                </p>
              ))}
            </div>
          )}
          {templateEvents.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">{t("studio", "crm.templateListings")}</p>
              {templateEvents.slice(0, 6).map((ev, i) => (
                <p
                  key={`${ev.createdAt}-${i}`}
                  className="line-clamp-2 flex items-start gap-1.5 text-xs text-gray-400"
                >
                  {ev.type === "TEMPLATE_VIEW" ? (
                    <Eye className="mt-0.5 h-3 w-3 flex-shrink-0 text-violet-400" />
                  ) : (
                    <MousePointerClick className="mt-0.5 h-3 w-3 flex-shrink-0 text-fuchsia-400" />
                  )}
                  <span>
                    <span className="font-medium text-gray-300">{templateEventLabel(ev.type)}</span>
                    {" · "}
                    {ev.videoTitle}
                  </span>
                </p>
              ))}
              {templateEvents.length > 6 ? (
                <p className="mt-1 text-[10px] text-gray-600">
                  {t("studio", "crm.moreEvents").replace("{{count}}", String(templateEvents.length - 6))}
                </p>
              ) : null}
            </div>
          )}
          {isAnonymousAggregate ? (
            <p className="text-xs text-gray-500">{t("studio", "crm.anonymousHint")}</p>
          ) : null}
        </div>
      )}

      {isAnonymousAggregate ? null : (
      <div className="mt-4 flex flex-col gap-2 border-t border-white/[0.06] pt-3 sm:flex-row sm:flex-wrap">
        {phoneHref ? (
          <a
            href={phoneHref}
            className={`${btnClass} border-emerald-500/25 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20`}
          >
            <Phone className="h-4 w-4 shrink-0" />
            <span>{t("studio", "crm.call")}</span>
          </a>
        ) : (
          <span
            className={`${btnClass} cursor-not-allowed border-white/10 bg-white/[0.02] text-gray-600`}
            title={t("studio", "crm.noPhone")}
          >
            <Phone className="h-4 w-4 shrink-0 opacity-50" />
            <span>{t("studio", "crm.call")}</span>
          </span>
        )}

        {waDigits ? (
          <a
            href={whatsappUrl(waDigits, waPrefill)}
            target="_blank"
            rel="noopener noreferrer"
            className={`${btnClass} border-emerald-600/30 bg-emerald-600/15 text-emerald-400 hover:bg-emerald-600/25`}
          >
            <WhatsAppIcon className="h-4 w-4 shrink-0" />
            <span>{t("studio", "crm.whatsapp")}</span>
          </a>
        ) : (
          <span
            className={`${btnClass} cursor-not-allowed border-white/10 bg-white/[0.02] text-gray-600`}
            title={t("studio", "crm.noPhoneWhatsapp")}
          >
            <WhatsAppIcon className="h-4 w-4 shrink-0 opacity-50" />
            <span>{t("studio", "crm.whatsapp")}</span>
          </span>
        )}

        {mailHref ? (
          <a
            href={mailHref}
            className={`${btnClass} border-sky-500/25 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20`}
          >
            <Mail className="h-4 w-4 shrink-0" />
            <span>{t("studio", "crm.email")}</span>
          </a>
        ) : (
          <span
            className={`${btnClass} cursor-not-allowed border-white/10 bg-white/[0.02] text-gray-600`}
            title={t("studio", "crm.noEmailFile")}
          >
            <Mail className="h-4 w-4 shrink-0 opacity-50" />
            <span>{t("studio", "crm.email")}</span>
          </span>
        )}
      </div>
      )}
    </div>
  );
}
