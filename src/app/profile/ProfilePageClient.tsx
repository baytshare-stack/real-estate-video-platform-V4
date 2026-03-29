"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getCountryByIso } from "@/lib/countriesData";
import { Pencil, X, Loader2, ArrowLeft } from "lucide-react";
import ProfileInbox from "@/components/profile/ProfileInbox";

export type ChannelPayload = {
  id: string;
  name: string;
  description: string | null;
  avatar: string | null;
  profileImage: string | null;
  phone: string | null;
  websiteUrl: string | null;
  country: string | null;
  whatsapp: string | null;
};

export type ProfileUserPayload = {
  id: string;
  username: string | null;
  fullName: string;
  name: string | null;
  email: string;
  phone: string | null;
  phoneCode: string | null;
  phoneNumber: string | null;
  fullPhoneNumber: string | null;
  whatsapp: string | null;
  country: string | null;
  city: string | null;
  phoneVerified: boolean;
  role: string;
  image: string | null;
  createdAt: string;
  profile: {
    id: string;
    userId: string;
    name: string | null;
    bio: string | null;
    showEmailOnProfile?: boolean;
    location: string | null;
    avatar: string | null;
    facebook: string | null;
    instagram: string | null;
    linkedin: string | null;
    website: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
  } | null;
  channel?: ChannelPayload | null;
};

type ProfileForm = {
  name: string;
  username: string;
  email: string;
  phoneE164: string;
  city: string;
  countryIso: string;
  bio: string;
  location: string;
  facebook: string;
  instagram: string;
  linkedin: string;
  website: string;
  contactEmail: string;
  contactPhone: string;
  showEmailOnProfile: boolean;
  agencyName: string;
  agencyDescription: string;
  agencyPhone: string;
  agencyContactEmail: string;
  officeLocation: string;
  officeCountry: string;
  agencyWebsite: string;
};

function buildForm(u: ProfileUserPayload): ProfileForm {
  const countryLabel = u.country ? getCountryByIso(u.country)?.name ?? u.country : undefined;
  const ch = u.channel;
  return {
    name: u.profile?.name || u.fullName || "",
    username: u.username ?? "",
    email: u.email || "",
    phoneE164: u.fullPhoneNumber || "",
    city: u.city || "",
    countryIso: u.country || "",
    bio: u.profile?.bio || "",
    location: u.profile?.location || countryLabel || "",
    facebook: u.profile?.facebook || "",
    instagram: u.profile?.instagram || "",
    linkedin: u.profile?.linkedin || "",
    website: u.profile?.website || "",
    contactEmail: u.profile?.contactEmail || u.email || "",
    contactPhone:
      u.fullPhoneNumber ||
      (u.phoneCode && u.phoneNumber ? `${u.phoneCode}${u.phoneNumber}` : "") ||
      u.profile?.contactPhone ||
      u.phone ||
      "",
    showEmailOnProfile: Boolean(u.profile?.showEmailOnProfile),
    agencyName: ch?.name || "",
    agencyDescription: ch?.description || u.profile?.bio || "",
    agencyPhone: ch?.phone || "",
    agencyContactEmail: u.profile?.contactEmail || u.email || "",
    officeLocation: u.profile?.location || "",
    officeCountry: ch?.country || u.country || "",
    agencyWebsite: ch?.websiteUrl || "",
  };
}

export default function ProfilePageClient({
  initialUser,
  fromStudio = false,
}: {
  initialUser: ProfileUserPayload;
  fromStudio?: boolean;
}) {
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();
  const [user, setUser] = useState<ProfileUserPayload>(initialUser);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState<ProfileForm>(() => buildForm(initialUser));

  useEffect(() => {
    setUser(initialUser);
    setForm(buildForm(initialUser));
  }, [initialUser]);

  const refreshFromServer = useCallback(async () => {
    const res = await fetch("/api/profile");
    if (!res.ok) return;
    const data = (await res.json()) as { user: ProfileUserPayload };
    setUser(data.user);
    setForm(buildForm(data.user));
    router.refresh();
    await updateSession();
  }, [router, updateSession]);

  const meta = useMemo(() => {
    const countryLabel = user.country ? getCountryByIso(user.country)?.name ?? user.country : undefined;
    return {
      email: user.email,
      username: user.username,
      role: user.role,
      country: user.country,
      countryLabel,
      phoneVerified: user.phoneVerified,
      fullPhoneNumber: user.fullPhoneNumber,
    };
  }, [user]);

  const isAgent = user.role === "AGENT";
  const isAgency = user.role === "AGENCY";

  const avatarUrl =
    isAgency && user.channel
      ? user.channel.profileImage || user.channel.avatar || user.profile?.avatar || user.image
      : user.profile?.avatar || user.image;
  const displayName =
    isAgency && user.channel?.name
      ? user.channel.name
      : user.profile?.name?.trim() || user.fullName || user.name || user.username || "User";
  const joined = new Date(user.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const t = e.target;
    if ("type" in t && t.type === "checkbox" && "checked" in t) {
      const name = t.name as keyof ProfileForm;
      setForm((prev) => ({ ...prev, [name]: t.checked }));
      return;
    }
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value } as ProfileForm));
  };

  /** Social + public contact cards (role-specific PUTs already handle name/bio/location for agent & agency). */
  const saveSocialOnly = async (overrides?: { contactEmail?: string; contactPhone?: string }) => {
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        facebook: form.facebook,
        instagram: form.instagram,
        linkedin: form.linkedin,
        website: form.website,
        contactEmail: overrides?.contactEmail ?? form.contactEmail,
        contactPhone: overrides?.contactPhone ?? form.contactPhone,
        showEmailOnProfile: form.showEmailOnProfile,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Save failed");
    return data as { user?: ProfileUserPayload };
  };

  const handleSaveDefault = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        bio: form.bio,
        location: form.location,
        facebook: form.facebook,
        instagram: form.instagram,
        linkedin: form.linkedin,
        website: form.website,
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone,
        showEmailOnProfile: form.showEmailOnProfile,
      };
      const u = form.username.trim();
      if (u.length > 0) payload.username = u;

      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Save failed");
        return;
      }
      if (data.user) {
        setUser(data.user);
        setForm(buildForm(data.user));
      }
      setSuccess("Profile saved");
      setEditOpen(false);
      router.refresh();
      await updateSession();
    } catch {
      setError("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const agentBody: Record<string, unknown> = {
        fullName: form.name.trim(),
        bio: form.bio,
        location: form.location,
        city: form.city.trim() || null,
        country: form.countryIso.trim() || null,
        email: form.email.trim(),
        phone: form.phoneE164.trim() || null,
      };
      const un = form.username.trim();
      if (un.length > 0) agentBody.username = un;

      const res = await fetch("/api/profile/agent", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(agentBody),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Save failed");
        return;
      }

      const social = await saveSocialOnly();
      const merged = social.user ?? data.user;
      if (merged) {
        setUser(merged);
        setForm(buildForm(merged));
      }

      setSuccess("Profile saved");
      setEditOpen(false);
      router.refresh();
      await updateSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAgency = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const agencyBody: Record<string, unknown> = {
        agencyName: form.agencyName.trim(),
        description: form.agencyDescription,
        contactPhone: form.agencyPhone.trim() || null,
        contactEmail: form.agencyContactEmail.trim() || null,
        officeLocation: form.officeLocation,
        officeCountry: form.officeCountry.trim() || null,
        websiteUrl: form.agencyWebsite.trim() || null,
      };
      const un = form.username.trim();
      if (un.length > 0) agencyBody.username = un;

      const res = await fetch("/api/profile/agency", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(agencyBody),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Save failed");
        return;
      }

      const social = await saveSocialOnly({
        contactEmail: form.agencyContactEmail,
        contactPhone: form.agencyPhone,
      });
      const merged = social.user ?? data.user;
      if (merged) {
        setUser(merged);
        setForm(buildForm(merged));
      }

      setSuccess("Agency profile saved");
      setEditOpen(false);
      router.refresh();
      await updateSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload failed");
        return;
      }
      setSuccess("Photo updated");
      await refreshFromServer();
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleAgencyLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/profile/agency-logo", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload failed");
        return;
      }
      setSuccess("Logo updated");
      await refreshFromServer();
    } catch {
      setError("Upload failed");
    } finally {
      setUploadingLogo(false);
    }
  };

  const openEdit = () => {
    setForm(buildForm(user));
    setEditOpen(true);
    setError("");
    setSuccess("");
  };

  const studioRoles = ["AGENT", "AGENCY", "ADMIN", "SUPER_ADMIN"];

  return (
    <div className="min-h-[calc(100vh-64px)] pb-24 xl:pb-8">
      {fromStudio ? (
        <div className="mb-6">
          <Link
            href="/studio"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-400 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Studio
          </Link>
        </div>
      ) : null}

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Your profile</h1>
          <p className="mt-1 text-sm text-gray-400">
            {isAgency ? "Agency branding and contact details" : "Manage how you appear on RealEstateTV"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {studioRoles.includes(user.role) ? (
            <Link
              href="/studio"
              className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/5"
            >
              Studio
            </Link>
          ) : null}
          <button
            type="button"
            onClick={openEdit}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-500"
          >
            <Pencil className="h-4 w-4" />
            Edit profile
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>
      )}
      {success && !editOpen && (
        <div className="mb-4 rounded-lg border border-green-500/50 bg-green-500/10 p-3 text-sm text-green-400">
          {success}
        </div>
      )}

      <div className="mb-6 rounded-2xl border border-gray-800 bg-gray-900 p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border border-gray-700 bg-gray-800 sm:rounded-2xl">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl text-gray-500">
                {displayName.charAt(0) || "?"}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <h2 className="text-xl font-semibold text-white">{displayName}</h2>
            {user.username ? (
              <p className="text-sm text-gray-400">@{user.username}</p>
            ) : (
              <p className="text-sm text-amber-400/90">Set a username in Edit profile</p>
            )}
            {user.profile?.showEmailOnProfile ? (
              <p className="text-sm text-gray-300">{user.email}</p>
            ) : (
              <p className="text-xs text-gray-500">Email hidden on profile summary (enable in edit)</p>
            )}
            {isAgency && user.channel?.description?.trim() ? (
              <p className="max-w-2xl text-sm leading-relaxed text-gray-300">{user.channel.description}</p>
            ) : user.profile?.bio?.trim() ? (
              <p className="max-w-2xl text-sm leading-relaxed text-gray-300">{user.profile.bio}</p>
            ) : (
              <p className="text-sm text-gray-500">No description yet — add one when you edit.</p>
            )}
            {(isAgent || isAgency) && (user.city || user.country) ? (
              <p className="text-sm text-gray-400">
                {[user.city, meta.countryLabel || user.country].filter(Boolean).join(", ")}
              </p>
            ) : null}
            {isAgency && user.channel?.websiteUrl ? (
              <a
                href={user.channel.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                {user.channel.websiteUrl}
              </a>
            ) : null}
            <p className="text-xs text-gray-500">Joined {joined}</p>
          </div>
          <div className="w-full sm:w-auto">
            <label className="block text-sm text-gray-400">
              <span className="mb-2 block">{isAgency ? "Update logo" : "Update photo"}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                className="text-sm text-gray-300 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-white"
                onChange={isAgency ? handleAgencyLogo : handleAvatar}
                disabled={uploading || uploadingLogo}
              />
            </label>
            {(uploading || uploadingLogo) && <p className="mt-1 text-xs text-gray-500">Uploading...</p>}
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-gray-800 bg-gray-900 p-6">
        <h3 className="mb-3 text-lg font-semibold text-white">Account &amp; contact</h3>
        <div className="space-y-1 text-sm text-gray-400">
          <p>
            <span className="text-gray-500">Email (login):</span> {meta.email}
          </p>
          <p>
            <span className="text-gray-500">Username:</span> {meta.username || "—"}
          </p>
          <p>
            <span className="text-gray-500">Role:</span> {meta.role}
          </p>
          {isAgency && user.channel?.phone ? (
            <p>
              <span className="text-gray-500">Office phone:</span> {user.channel.phone}
            </p>
          ) : null}
          {isAgency && user.profile?.contactEmail ? (
            <p>
              <span className="text-gray-500">Contact email:</span> {user.profile.contactEmail}
            </p>
          ) : null}
          <p>
            <span className="text-gray-500">Country:</span> {meta.countryLabel || meta.country || "—"}
          </p>
          {user.city ? (
            <p>
              <span className="text-gray-500">City:</span> {user.city}
            </p>
          ) : null}
          {meta.fullPhoneNumber && !isAgency ? (
            <p>
              <span className="text-gray-500">Phone:</span> {meta.fullPhoneNumber}
            </p>
          ) : null}
          <p>
            <span className="text-gray-500">Phone verified:</span> {meta.phoneVerified === false ? "No" : "Yes"}
          </p>
        </div>
      </div>

      <section className="mb-8">
        <h3 className="mb-3 text-lg font-semibold text-white">Messages</h3>
        <ProfileInbox currentUserId={user.id} sessionName={session?.user?.name ?? displayName} />
      </section>

      <p className="text-center text-sm text-gray-500">
        <Link href="/" className="text-blue-500 hover:text-blue-400">
          Back to home
        </Link>
      </p>

      {editOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            aria-label="Close"
            onClick={() => setEditOpen(false)}
          />
          <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-gray-800 bg-[#141414] p-6 shadow-2xl sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                {isAgent ? "Edit agent profile" : isAgency ? "Edit agency profile" : "Edit profile"}
              </h3>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {error && (
              <div className="mb-3 rounded-lg border border-red-500/50 bg-red-500/10 p-2 text-sm text-red-400">
                {error}
              </div>
            )}

            {isAgent ? (
              <form onSubmit={handleSaveAgent} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-400">Full name</label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-700 bg-black/50 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-400">Username</label>
                  <input
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-700 bg-black/50 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                    placeholder="letters_numbers_only"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-400">Email (login)</label>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-700 bg-black/50 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-400">
                    Phone (international, e.g. +971501234567)
                  </label>
                  <input
                    name="phoneE164"
                    value={form.phoneE164}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-700 bg-black/50 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                    placeholder="+..."
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-400">Bio</label>
                  <textarea
                    name="bio"
                    rows={4}
                    value={form.bio}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-700 bg-black/50 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-400">City</label>
                  <input
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-700 bg-black/50 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-400">
                    Country (ISO2, e.g. AE, EG, US)
                  </label>
                  <input
                    name="countryIso"
                    value={form.countryIso}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-700 bg-black/50 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                    placeholder="AE"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-400">Location / area</label>
                  <input
                    name="location"
                    value={form.location}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-700 bg-black/50 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="showEmail"
                    name="showEmailOnProfile"
                    type="checkbox"
                    checked={form.showEmailOnProfile}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-gray-600"
                  />
                  <label htmlFor="showEmail" className="text-sm text-gray-300">
                    Show account email on profile summary
                  </label>
                </div>
                <p className="text-xs text-gray-500">Social links and public contact cards below apply to your public profile.</p>
                {(
                  [
                    ["facebook", "Facebook"],
                    ["instagram", "Instagram"],
                    ["linkedin", "LinkedIn"],
                    ["website", "Website"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key}>
                    <label className="mb-1 block text-xs text-gray-500">{label}</label>
                    <input
                      name={key}
                      value={form[key as keyof ProfileForm] as string}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-gray-700 bg-black/50 px-4 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                      placeholder="https://"
                    />
                  </div>
                ))}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-400">Public contact email</label>
                  <input
                    name="contactEmail"
                    type="email"
                    value={form.contactEmail}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-700 bg-black/50 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-400">Public contact phone</label>
                  <input
                    name="contactPhone"
                    type="tel"
                    value={form.contactPhone}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-700 bg-black/50 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-bold text-white transition hover:bg-blue-500 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </form>
            ) : isAgency ? (
              <form onSubmit={handleSaveAgency} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-400">Username</label>
                  <input
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-700 bg-black/50 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-400">Agency name</label>
                  <input
                    name="agencyName"
                    value={form.agencyName}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-700 bg-black/50 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-400">Description</label>
                  <textarea
                    name="agencyDescription"
                    rows={4}
                    value={form.agencyDescription}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-700 bg-black/50 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-400">
                    Contact phone (international)
                  </label>
                  <input
                    name="agencyPhone"
                    value={form.agencyPhone}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-700 bg-black/50 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                    placeholder="+971..."
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-400">Contact email</label>
                  <input
                    name="agencyContactEmail"
                    type="email"
                    value={form.agencyContactEmail}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-700 bg-black/50 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-400">Office location</label>
                  <input
                    name="officeLocation"
                    value={form.officeLocation}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-700 bg-black/50 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-400">Office country (ISO2)</label>
                  <input
                    name="officeCountry"
                    value={form.officeCountry}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-700 bg-black/50 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                    placeholder="AE"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-400">Website (optional)</label>
                  <input
                    name="agencyWebsite"
                    value={form.agencyWebsite}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-700 bg-black/50 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                    placeholder="https://"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="showEmailAg"
                    name="showEmailOnProfile"
                    type="checkbox"
                    checked={form.showEmailOnProfile}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-gray-600"
                  />
                  <label htmlFor="showEmailAg" className="text-sm text-gray-300">
                    Show account email on profile summary
                  </label>
                </div>
                <p className="text-xs text-gray-500">Social links (optional)</p>
                {(
                  [
                    ["facebook", "Facebook"],
                    ["instagram", "Instagram"],
                    ["linkedin", "LinkedIn"],
                    ["website", "Website"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key}>
                    <label className="mb-1 block text-xs text-gray-500">{label}</label>
                    <input
                      name={key}
                      value={form[key as keyof ProfileForm] as string}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-gray-700 bg-black/50 px-4 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                ))}
                <button
                  type="submit"
                  disabled={saving}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-bold text-white transition hover:bg-blue-500 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSaveDefault} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-400">Display name</label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-700 bg-black/50 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-400">Username</label>
                  <input
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-700 bg-black/50 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-400">Bio</label>
                  <textarea
                    name="bio"
                    rows={4}
                    value={form.bio}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-700 bg-black/50 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-400">Location</label>
                  <input
                    name="location"
                    value={form.location}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-700 bg-black/50 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="showEmailDef"
                    name="showEmailOnProfile"
                    type="checkbox"
                    checked={form.showEmailOnProfile}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-gray-600"
                  />
                  <label htmlFor="showEmailDef" className="text-sm text-gray-300">
                    Show my account email on my public profile summary
                  </label>
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium text-gray-400">Social links</p>
                  {(
                    [
                      ["facebook", "Facebook"],
                      ["instagram", "Instagram"],
                      ["linkedin", "LinkedIn"],
                      ["website", "Website"],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key} className="mb-2">
                      <label className="mb-1 block text-xs text-gray-500">{label}</label>
                      <input
                        name={key}
                        value={form[key as keyof ProfileForm] as string}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-gray-700 bg-black/50 px-4 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                        placeholder="https://"
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-400">Contact email (public)</label>
                  <input
                    name="contactEmail"
                    type="email"
                    value={form.contactEmail}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-700 bg-black/50 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-400">Contact phone (public)</label>
                  <input
                    name="contactPhone"
                    type="tel"
                    value={form.contactPhone}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-700 bg-black/50 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-bold text-white transition hover:bg-blue-500 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
