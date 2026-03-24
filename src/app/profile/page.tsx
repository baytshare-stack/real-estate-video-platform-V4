"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getCountryByIso } from "@/lib/countriesData";

type ProfileForm = {
  name: string;
  bio: string;
  location: string;
  facebook: string;
  instagram: string;
  linkedin: string;
  website: string;
  contactEmail: string;
  contactPhone: string;
};

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState<ProfileForm>({
    name: "",
    bio: "",
    location: "",
    facebook: "",
    instagram: "",
    linkedin: "",
    website: "",
    contactEmail: "",
    contactPhone: "",
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [meta, setMeta] = useState<{
    email: string;
    username: string | null;
    role: string;
    country?: string | null;
    countryLabel?: string;
    phoneVerified?: boolean;
    fullPhoneNumber?: string | null;
  } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;

    (async () => {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) {
          setError("Failed to load profile");
          setLoading(false);
          return;
        }
        const data = await res.json();
        const u = data.user;
        const countryLabel = u.country ? getCountryByIso(u.country)?.name ?? u.country : undefined;
        setMeta({
          email: u.email,
          username: u.username,
          role: u.role,
          country: u.country,
          countryLabel,
          phoneVerified: u.phoneVerified,
          fullPhoneNumber: u.fullPhoneNumber,
        });
        setAvatarUrl(u.profile?.avatar || u.image || null);
        setForm({
          name: u.profile?.name || u.fullName || "",
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
        });
      } catch {
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
  }, [status]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Save failed");
        return;
      }
      setSuccess("Profile saved");
      if (data.user?.profile?.avatar) setAvatarUrl(data.user.profile.avatar);
    } catch {
      setError("Save failed");
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
      setAvatarUrl(data.url);
      setSuccess("Photo updated");
      router.refresh();
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center text-gray-400">
        Loading profile...
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-[calc(100vh-64px)] p-4 md:p-8 max-w-3xl mx-auto pb-24 xl:pb-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Your profile</h1>
        <p className="text-gray-400 text-sm mt-1">Manage how you appear on RealEstateTV</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-500/10 border border-green-500/50 text-green-400 p-3 rounded-lg text-sm mb-4">
          {success}
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Account</h2>
        <div className="text-sm text-gray-400 space-y-1">
          <p>
            <span className="text-gray-500">Email:</span> {meta?.email}
          </p>
          <p>
            <span className="text-gray-500">Username:</span> {meta?.username || "—"}
          </p>
          <p>
            <span className="text-gray-500">Role:</span> {meta?.role}
          </p>
          <p>
            <span className="text-gray-500">Country:</span> {meta?.countryLabel || meta?.country || "—"}
          </p>
          {meta?.fullPhoneNumber ? (
            <p>
              <span className="text-gray-500">Registered phone:</span> {meta.fullPhoneNumber}
            </p>
          ) : null}
          <p>
            <span className="text-gray-500">Phone verified:</span>{" "}
            {meta?.phoneVerified === false ? "No" : "Yes"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Photo</h2>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gray-800 overflow-hidden border border-gray-700 flex-shrink-0">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl text-gray-500">
                  {session.user?.name?.charAt(0) || "?"}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                <span className="sr-only">Upload avatar</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                  className="text-sm text-gray-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white"
                  onChange={handleAvatar}
                  disabled={uploading}
                />
              </label>
              {uploading && <p className="text-xs text-gray-500">Uploading...</p>}
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white mb-2">About you</h2>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Display name</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full bg-black/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Bio</label>
            <textarea
              name="bio"
              rows={4}
              value={form.bio}
              onChange={handleChange}
              className="w-full bg-black/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Location (area you work in)
            </label>
            <input
              name="location"
              value={form.location}
              onChange={handleChange}
              className="w-full bg-black/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white mb-2">Social links</h2>
          {(
            [
              ["facebook", "Facebook"],
              ["instagram", "Instagram"],
              ["linkedin", "LinkedIn"],
              ["website", "Website"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-400 mb-1">{label}</label>
              <input
                name={key}
                value={form[key as keyof ProfileForm]}
                onChange={handleChange}
                className="w-full bg-black/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                placeholder="https://"
              />
            </div>
          ))}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white mb-2">Contact (public)</h2>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Contact email</label>
            <input
              name="contactEmail"
              type="email"
              value={form.contactEmail}
              onChange={handleChange}
              className="w-full bg-black/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Contact phone</label>
            <input
              name="contactPhone"
              type="tel"
              value={form.contactPhone}
              onChange={handleChange}
              className="w-full bg-black/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save profile"}
        </button>
      </form>

      <p className="text-center mt-8 text-sm text-gray-500">
        <Link href="/" className="text-blue-500 hover:text-blue-400">
          Back to home
        </Link>
      </p>
    </div>
  );
}
