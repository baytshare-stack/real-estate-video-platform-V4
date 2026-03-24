"use client";

import React, { useEffect, useMemo, useState } from "react";
import { User, Phone, MessageCircle, CheckCircle2, Loader2 } from "lucide-react";
import CountrySelect, { COUNTRIES, getCountryByIso } from "./settings/CountrySelect";
import SocialLinksForm, { type SocialLinks } from "./settings/SocialLinksForm";
import ImageUploader from "./settings/ImageUploader";

type ChannelSettingsChannel = {
  id: string;
  name: string;
  description?: string | null;
  avatar?: string | null;
  profileImage?: string | null;
  bannerImage?: string | null;
  country?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  whatsappUrl?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  telegramUrl?: string | null;
  youtubeUrl?: string | null;
  websiteUrl?: string | null;
};

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function parsePhoneForCountry(fullPhone: string | null | undefined): { iso2: string | null; rest: string } {
  if (!fullPhone) return { iso2: null, rest: "" };
  const digits = digitsOnly(fullPhone);
  let best: (typeof COUNTRIES)[number] | null = null;
  for (const c of COUNTRIES) {
    if (!digits.startsWith(c.phoneCodeDigits)) continue;
    if (!best || c.phoneCodeDigits.length > best.phoneCodeDigits.length) best = c;
  }
  if (!best) return { iso2: null, rest: digits };
  return { iso2: best.iso2, rest: digits.slice(best.phoneCodeDigits.length) };
}

type OwnerDefaults = {
  country?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
};

type Props = {
  channel: ChannelSettingsChannel;
  ownerDefaults?: OwnerDefaults;
  onSaved?: () => void;
};

function isIsoCountry(value: string | null | undefined): boolean {
  if (!value) return false;
  return COUNTRIES.some((c) => c.iso2 === value);
}

export default function ChannelSettingsTab({ channel, ownerDefaults, onSaved }: Props) {
  const [name, setName] = useState(channel.name);
  const [description, setDescription] = useState(channel.description ?? "");

  const initialPhone = channel.phone ?? ownerDefaults?.phone ?? null;
  const parsedPhone = useMemo(() => parsePhoneForCountry(initialPhone), [initialPhone]);

  const initialWhatsapp = channel.whatsapp ?? ownerDefaults?.whatsapp ?? null;
  const parsedWhatsapp = useMemo(() => parsePhoneForCountry(initialWhatsapp), [initialWhatsapp]);

  const initialCountryIso =
    parsedPhone.iso2 ??
    parsedWhatsapp.iso2 ??
    (isIsoCountry(channel.country) ? channel.country : null) ??
    ownerDefaults?.country ??
    COUNTRIES[0]?.iso2 ??
    null;

  const [countryIso, setCountryIso] = useState<string | null>(initialCountryIso);
  const [phoneRest, setPhoneRest] = useState<string>(parsedPhone.rest);

  const effPhone = channel.phone ?? ownerDefaults?.phone ?? null;
  const effWhatsapp = channel.whatsapp ?? ownerDefaults?.whatsapp ?? null;

  const [whatsappSameAsPhone, setWhatsappSameAsPhone] = useState<boolean>(() => {
    if (!effPhone || !effWhatsapp) return true;
    return digitsOnly(effPhone) === digitsOnly(effWhatsapp);
  });

  const [whatsappRest, setWhatsappRest] = useState<string>(() => {
    if (whatsappSameAsPhone) return parsedPhone.rest;
    return parsedWhatsapp.rest ?? parsedPhone.rest;
  });

  const [social, setSocial] = useState<SocialLinks>({
    facebookUrl: channel.facebookUrl ?? "",
    instagramUrl: channel.instagramUrl ?? "",
    whatsappUrl: channel.whatsappUrl ?? "",
    telegramUrl: channel.telegramUrl ?? "",
    youtubeUrl: channel.youtubeUrl ?? "",
    websiteUrl: channel.websiteUrl ?? "",
  });

  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [saveNonce, setSaveNonce] = useState(0);

  const country = getCountryByIso(countryIso);
  const phoneFull = country ? `${country.phoneCode}${phoneRest}` : "";
  const whatsappFull = country ? `${country.phoneCode}${whatsappRest}` : "";
  const restMaxLen = useMemo(() => {
    const codeLen = country?.phoneCodeDigits.length ?? 0;
    return Math.max(1, 15 - codeLen);
  }, [country?.phoneCodeDigits.length]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Keep the form in sync if the parent refreshes channel data.
  useEffect(() => {
    setName(channel.name);
    setDescription(channel.description ?? "");

    const nextParsedPhone = parsePhoneForCountry(channel.phone ?? ownerDefaults?.phone ?? null);
    const nextParsedWhatsapp = parsePhoneForCountry(channel.whatsapp ?? ownerDefaults?.whatsapp ?? null);
    setCountryIso(
      nextParsedPhone.iso2 ??
        nextParsedWhatsapp.iso2 ??
        (isIsoCountry(channel.country) ? channel.country : null) ??
        ownerDefaults?.country ??
        COUNTRIES[0]?.iso2 ??
        null
    );
    setPhoneRest(nextParsedPhone.rest ?? "");

    const pEff = channel.phone ?? ownerDefaults?.phone;
    const wEff = channel.whatsapp ?? ownerDefaults?.whatsapp;
    const same = pEff && wEff ? digitsOnly(pEff) === digitsOnly(wEff) : true;
    setWhatsappSameAsPhone(same);
    setWhatsappRest(same ? (nextParsedPhone.rest ?? "") : (nextParsedWhatsapp.rest ?? nextParsedPhone.rest ?? ""));

    setSocial({
      facebookUrl: channel.facebookUrl ?? "",
      instagramUrl: channel.instagramUrl ?? "",
      whatsappUrl: (channel as any).whatsappUrl ?? "",
      telegramUrl: channel.telegramUrl ?? "",
      youtubeUrl: channel.youtubeUrl ?? "",
      websiteUrl: channel.websiteUrl ?? "",
    });
    setProfileFile(null);
    setBannerFile(null);
    setSaveNonce((n) => n + 1);
    setError(null);
    setSuccess(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, ownerDefaults]);

  useEffect(() => {
    if (!whatsappSameAsPhone) return;
    setWhatsappRest(phoneRest);
  }, [phoneRest, whatsappSameAsPhone]);

  const validation = useMemo(() => {
    const nextErrors: Record<string, string> = {};

    if (!name.trim()) nextErrors.name = "Channel name is required";

    if (!countryIso) nextErrors.country = "Country is required";

    const fullPhoneDigits = `${country?.phoneCodeDigits ?? ""}${digitsOnly(phoneRest)}`;
    if (!digitsOnly(phoneRest)) nextErrors.phone = "Phone number is required";
    if (fullPhoneDigits && (fullPhoneDigits.length < 7 || fullPhoneDigits.length > 15)) nextErrors.phone = "Phone number must be 7-15 digits (including country code)";

    if (!whatsappSameAsPhone) {
      const fullWhatsappDigits = `${country?.phoneCodeDigits ?? ""}${digitsOnly(whatsappRest)}`;
      if (!digitsOnly(whatsappRest)) nextErrors.whatsapp = "WhatsApp number is required";
      if (fullWhatsappDigits && (fullWhatsappDigits.length < 7 || fullWhatsappDigits.length > 15)) {
        nextErrors.whatsapp = "WhatsApp must be 7-15 digits (including country code)";
      }
    }

    const socialEntries: Array<[keyof SocialLinks, string]> = [
      ["facebookUrl", social.facebookUrl],
      ["instagramUrl", social.instagramUrl],
      ["whatsappUrl", social.whatsappUrl],
      ["telegramUrl", social.telegramUrl],
      ["youtubeUrl", social.youtubeUrl],
      ["websiteUrl", social.websiteUrl],
    ];

    for (const [key, v] of socialEntries) {
      const trimmed = v.trim();
      if (!trimmed) continue;
      if (!isValidHttpUrl(trimmed)) nextErrors[key] = "Invalid URL (use http/https)";
    }

    return nextErrors;
  }, [countryIso, name, phoneRest, social, whatsappSameAsPhone, whatsappRest]);

  const canSave = Object.keys(validation).length === 0 && !!countryIso && phoneFull.length > 0 && whatsappFull.length > 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!canSave) {
      setError("Please fix validation errors before saving.");
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", name);
      fd.append("description", description);
      fd.append("country", countryIso ?? "");
      fd.append("phone", phoneFull);
      fd.append("whatsapp", whatsappSameAsPhone ? phoneFull : whatsappFull);

      fd.append("facebookUrl", social.facebookUrl.trim());
      fd.append("instagramUrl", social.instagramUrl.trim());
      fd.append("whatsappUrl", social.whatsappUrl.trim());
      fd.append("telegramUrl", social.telegramUrl.trim());
      fd.append("youtubeUrl", social.youtubeUrl.trim());
      fd.append("websiteUrl", social.websiteUrl.trim());

      if (profileFile) fd.append("profileImage", profileFile);
      if (bannerFile) fd.append("bannerImage", bannerFile);

      // Update existing channel only (do NOT call create endpoint).
      const res = await fetch("/api/channel", { method: "PUT", body: fd });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error ?? "Failed to save channel settings.");
        return;
      }

      setSuccess("Channel settings saved successfully.");
      setSaveNonce((n) => n + 1);

      // Clear local selected files (ImageUploader will also reset).
      setProfileFile(null);
      setBannerFile(null);

      onSaved?.();
    } catch {
      setError("Failed to save channel settings. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <User className="w-5 h-5 text-gray-400" />
        <h1 className="text-2xl font-black text-white">Channel Settings</h1>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-200 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-200 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {success}
        </div>
      )}

      {/* Identity */}
      <div className="bg-gray-900/80 border border-white/[0.07] rounded-2xl p-6 shadow-xl space-y-5">
        <h2 className="font-bold text-base text-white border-b border-white/[0.07] pb-3">Identity</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
              Channel Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full bg-gray-800/60 border rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors ${
                validation.name ? "border-red-500/70 focus:border-red-500/70" : "border-white/[0.08] focus:border-blue-500/50"
              }`}
            />
            {validation.name && <p className="text-xs text-red-400 mt-1">{validation.name}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full bg-gray-800/60 border border-white/[0.08] focus:border-blue-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors resize-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ImageUploader
            resetSignal={saveNonce}
            label="Profile Image"
            helpText="Recommended: 800x800"
            buttonText="Change Photo"
            currentUrl={channel.profileImage ?? channel.avatar ?? null}
            onFileChange={setProfileFile}
          />

          <ImageUploader
            resetSignal={saveNonce}
            label="Banner Image"
            helpText="Recommended: 1600x480"
            buttonText="Change Banner"
            currentUrl={channel.bannerImage ?? null}
            onFileChange={setBannerFile}
          />
        </div>
      </div>

      {/* Contact info */}
      <div className="bg-gray-900/80 border border-white/[0.07] rounded-2xl p-6 shadow-xl space-y-5">
        <h2 className="font-bold text-base text-white border-b border-white/[0.07] pb-3 flex items-center gap-2">
          <Phone className="w-4 h-4 text-gray-400" /> Contact Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <CountrySelect value={countryIso} onChange={setCountryIso} />
            {validation.country && <p className="text-xs text-red-400">{validation.country}</p>}
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-3">
              <div className="px-3 py-3 rounded-xl bg-gray-800/60 border border-white/[0.08] text-white text-sm font-semibold whitespace-nowrap">
                {country?.phoneCode ?? "+--"}
              </div>
              <input
                type="tel"
                value={phoneRest}
                onChange={(e) => setPhoneRest(digitsOnly(e.target.value).slice(0, restMaxLen))}
                placeholder="1234567890"
                className={`flex-1 bg-gray-800/60 border rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors ${
                  validation.phone ? "border-red-500/70 focus:border-red-500/70" : "border-white/[0.08] focus:border-blue-500/50"
                }`}
              />
            </div>
            {validation.phone && <p className="text-xs text-red-400">{validation.phone}</p>}
          </div>
        </div>

        <div className="pt-2 space-y-3">
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-gray-400" /> WhatsApp Number <span className="text-red-500">*</span>
          </label>

          <label className="flex items-center gap-3 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={whatsappSameAsPhone}
              onChange={(e) => setWhatsappSameAsPhone(e.target.checked)}
              className="w-4 h-4"
            />
            Same as phone number
          </label>

          <div className="flex items-center gap-3">
            <div className="px-3 py-3 rounded-xl bg-gray-800/60 border border-white/[0.08] text-white text-sm font-semibold whitespace-nowrap">
              {country?.phoneCode ?? "+--"}
            </div>
            <input
              type="tel"
              value={whatsappSameAsPhone ? phoneRest : whatsappRest}
              disabled={whatsappSameAsPhone}
              onChange={(e) => setWhatsappRest(digitsOnly(e.target.value).slice(0, restMaxLen))}
              placeholder="1234567890"
              className={`flex-1 bg-gray-800/60 border rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors ${
                validation.whatsapp && !whatsappSameAsPhone ? "border-red-500/70 focus:border-red-500/70" : "border-white/[0.08] focus:border-blue-500/50"
              } ${whatsappSameAsPhone ? "opacity-60" : ""}`}
            />
          </div>
          {!whatsappSameAsPhone && validation.whatsapp && <p className="text-xs text-red-400">{validation.whatsapp}</p>}
        </div>
      </div>

      {/* Social links */}
      <div className="bg-gray-900/80 border border-white/[0.07] rounded-2xl p-6 shadow-xl space-y-5">
        <h2 className="font-bold text-base text-white border-b border-white/[0.07] pb-3">Social Media Links</h2>
        <SocialLinksForm value={social} onChange={setSocial} />
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}

