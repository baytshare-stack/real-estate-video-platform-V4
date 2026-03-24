"use client";

import {
  ChangeEvent,
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  AlertCircle,
  CheckCircle2,
  FileImage,
  FileVideo,
  Home,
  Loader2,
  MapPin,
  Upload,
  Video,
  Youtube,
} from "lucide-react";
import type { LocationPatch } from "@/components/upload/MapLeafletPicker";

const MapLeafletPicker = dynamic(() => import("@/components/upload/MapLeafletPicker"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[400px] min-h-[400px] w-full items-center justify-center rounded-2xl border border-slate-300 bg-slate-100 text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
      <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
    </div>
  ),
});

type UploadState = {
  file: File | null;
  progress: number;
  uploading: boolean;
  uploadedUrl: string;
  error: string;
};

type FormDataState = {
  title: string;
  description: string;
  videoUrl: string;
  thumbnail: string;
  propertyType: string;
  status: string;
  price: string;
  bedrooms: string;
  bathrooms: string;
  sizeSqm: string;
  sizeUnit: string;
  currency: string;
  country: string;
  city: string;
  address: string;
  latitude: string;
  longitude: string;
  videoType: "long" | "short";
};

const initialUploadState: UploadState = {
  file: null,
  progress: 0,
  uploading: false,
  uploadedUrl: "",
  error: "",
};

const COUNTRY_CONFIG: Record<string, { currency: string; areaUnit: "sqm" | "sqft"; cities: string[] }> = {
  Egypt: { currency: "EGP", areaUnit: "sqm", cities: ["Cairo", "Giza", "Alexandria", "Mansoura"] },
  USA: { currency: "USD", areaUnit: "sqft", cities: ["New York", "Los Angeles", "Miami", "Houston"] },
  UK: { currency: "GBP", areaUnit: "sqm", cities: ["London", "Manchester", "Birmingham", "Liverpool"] },
  UAE: { currency: "AED", areaUnit: "sqm", cities: ["Dubai", "Abu Dhabi", "Sharjah"] },
  SaudiArabia: { currency: "SAR", areaUnit: "sqm", cities: ["Riyadh", "Jeddah", "Dammam"] },
};

const uiTokens = {
  background: "bg-white dark:bg-slate-950",
  surface: "bg-white dark:bg-slate-900",
  surfaceMuted: "bg-white dark:bg-slate-800",
  textPrimary: "text-black dark:text-slate-100",
  textSecondary: "text-slate-700 dark:text-slate-300",
  border: "border-slate-300 dark:border-slate-600",
  input:
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-black shadow-sm placeholder:text-slate-500 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400",
  select:
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-black shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100",
  buttonPrimary:
    "rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700 active:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-70",
};

function parseApiError(data: unknown): string {
  if (!data || typeof data !== "object") return "Request failed";
  const o = data as { error?: string; detail?: string; missingFields?: string[] };
  const parts: string[] = [];
  if (o.error) parts.push(o.error);
  if (o.detail) parts.push(o.detail);
  if (o.missingFields?.length) parts.push(`Missing: ${o.missingFields.join(", ")}`);
  return parts.length ? parts.join(" — ") : "Request failed";
}

function postFormDataWithProgress(
  url: string,
  formData: FormData,
  onProgress: (pct: number) => void
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.min(100, Math.round((e.loaded / e.total) * 100)));
      }
    };
    xhr.onload = () => {
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(xhr.responseText || "{}") as Record<string, unknown>;
      } catch {
        reject(new Error("Invalid server response"));
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data);
      } else {
        reject(new Error(parseApiError(data)));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(formData);
  });
}

export default function UploadVideoPageContent() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [combinedUploadProgress, setCombinedUploadProgress] = useState(0);

  const [videoUpload, setVideoUpload] = useState<UploadState>(initialUploadState);
  const [thumbnailUpload, setThumbnailUpload] = useState<UploadState>(initialUploadState);

  const [formData, setFormData] = useState<FormDataState>({
    title: "",
    description: "",
    videoUrl: "",
    thumbnail: "",
    propertyType: "APARTMENT",
    status: "FOR_SALE",
    price: "",
    bedrooms: "",
    bathrooms: "",
    sizeSqm: "",
    sizeUnit: "sqm",
    currency: "USD",
    country: "",
    city: "",
    address: "",
    latitude: "",
    longitude: "",
    videoType: "long",
  });

  const isUploading = videoUpload.uploading || thumbnailUpload.uploading;
  const isYoutubeMode = Boolean(formData.videoUrl.trim()) && !Boolean(videoUpload.file);
  const countries = useMemo(() => Object.keys(COUNTRY_CONFIG), []);
  const cities = useMemo(
    () => (formData.country ? COUNTRY_CONFIG[formData.country]?.cities ?? [] : []),
    [formData.country]
  );
  const thumbnailPreviewUrl = useMemo(
    () => (thumbnailUpload.file ? URL.createObjectURL(thumbnailUpload.file) : ""),
    [thumbnailUpload.file]
  );

  const videoPreviewSrc = useMemo(() => {
    if (preview) return preview;
    if (formData.videoUrl.trim() && !videoUpload.file) return formData.videoUrl.trim();
    return "";
  }, [preview, formData.videoUrl, videoUpload.file]);

  const canSubmit = useMemo(() => !isUploading && !loading, [isUploading, loading]);

  const handleLocationPatch = useCallback((patch: LocationPatch) => {
    setFormData((prev) => ({
      ...prev,
      ...patch,
    }));
  }, []);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  useEffect(() => {
    if (!thumbnailPreviewUrl) return;
    return () => URL.revokeObjectURL(thumbnailPreviewUrl);
  }, [thumbnailPreviewUrl]);

  useEffect(() => {
    if (!formData.country) return;
    const countryData = COUNTRY_CONFIG[formData.country];
    if (!countryData) return;
    setFormData((prev) => ({
      ...prev,
      currency: countryData.currency,
      sizeUnit: countryData.areaUnit,
      city: countryData.cities.includes(prev.city) ? prev.city : "",
    }));
  }, [formData.country]);

  if (status === "loading") {
    return (
      <div className={`flex min-h-screen items-center justify-center ${uiTokens.background}`}>
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600" />
      </div>
    );
  }

  const canUpload =
    session?.user?.role === "AGENT" ||
    session?.user?.role === "AGENCY" ||
    session?.user?.role === "ADMIN" ||
    session?.user?.role === "SUPER_ADMIN";

  if (status === "unauthenticated" || !canUpload) {
    return (
      <div className={`flex min-h-screen flex-col items-center justify-center px-4 ${uiTokens.background}`}>
        <AlertCircle className="mb-4 h-16 w-16 text-amber-500" />
        <h1 className={`mb-2 text-2xl font-bold ${uiTokens.textPrimary}`}>Access Denied</h1>
        <p className={`mb-6 max-w-md text-center ${uiTokens.textSecondary}`}>
          Only Real Estate Agents and Agencies can upload property videos.
        </p>
        <button
          onClick={() => router.push("/")}
          className="rounded-lg bg-indigo-600 px-6 py-2 text-white transition hover:bg-indigo-700 active:bg-indigo-800"
        >
          Return Home
        </button>
      </div>
    );
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleVideoFileSelect = (file: File | null) => {
    if (!file) {
      setVideoUpload(initialUploadState);
      setFormData((prev) => ({ ...prev, videoUrl: "" }));
      setPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }

    setError("");
    setSuccessMessage("");
    setFormData((prev) => ({ ...prev, videoUrl: "" }));
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setVideoUpload({ file, progress: 0, uploading: false, uploadedUrl: "", error: "" });
  };

  const handleThumbnailSelect = (file: File | null) => {
    if (!file) {
      setThumbnailUpload(initialUploadState);
      setFormData((prev) => ({ ...prev, thumbnail: "" }));
      return;
    }

    setError("");
    setSuccessMessage("");
    setThumbnailUpload({ file, progress: 0, uploading: false, uploadedUrl: "", error: "" });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    if (isUploading || loading) {
      setError("Please wait for current processing to finish.");
      return;
    }

    const hasVideoFile = Boolean(videoUpload.file);
    const hasVideoRemote = Boolean(formData.videoUrl.trim()) && !hasVideoFile;
    const hasThumbFile = Boolean(thumbnailUpload.file);
    const hasVideo = hasVideoFile || hasVideoRemote;
    const hasLocation = Boolean(formData.address.trim() || (formData.latitude.trim() && formData.longitude.trim()));
    if (!formData.title.trim() || !formData.price.trim() || !hasVideo || !hasLocation) {
      setError("Please fill required fields: title, video, location, and price.");
      return;
    }

    const addressFinal =
      formData.latitude && formData.longitude
        ? `${formData.address} (lat:${formData.latitude}, lng:${formData.longitude})`
        : formData.address;

    setLoading(true);

    let videoUrlFinal = "";
    let thumbnailFinal = formData.thumbnail.trim();

    try {
      const needsMultipart = hasVideoFile || hasThumbFile;

      if (needsMultipart) {
        setCombinedUploadProgress(0);
        setVideoUpload((prev) => ({ ...prev, uploading: hasVideoFile, progress: 0 }));
        setThumbnailUpload((prev) => ({ ...prev, uploading: hasThumbFile, progress: 0 }));

        const fd = new FormData();
        if (videoUpload.file) fd.append("video", videoUpload.file);
        if (thumbnailUpload.file) fd.append("thumbnail", thumbnailUpload.file);

        const data = await postFormDataWithProgress("/api/upload", fd, (pct) => {
          setCombinedUploadProgress(pct);
          setVideoUpload((prev) => (prev.file ? { ...prev, progress: pct } : prev));
          setThumbnailUpload((prev) => (prev.file ? { ...prev, progress: pct } : prev));
        });

        const uploadedVideoUrl = typeof data.url === "string" ? data.url : "";
        const uploadedThumbUrl = typeof data.thumbnailUrl === "string" ? data.thumbnailUrl : "";

        if (hasVideoFile && !uploadedVideoUrl) {
          setError("Upload finished but the server did not return a video URL.");
          return;
        }
        if (hasThumbFile && !uploadedThumbUrl) {
          setError("Upload finished but the server did not return a thumbnail URL.");
          return;
        }

        if (uploadedVideoUrl) {
          videoUrlFinal = uploadedVideoUrl;
          setVideoUpload((prev) => ({
            ...prev,
            progress: 100,
            uploadedUrl: uploadedVideoUrl,
            uploading: false,
          }));
        } else if (hasVideoRemote) {
          videoUrlFinal = formData.videoUrl.trim();
        }

        if (uploadedThumbUrl) {
          thumbnailFinal = uploadedThumbUrl;
          setFormData((prev) => ({ ...prev, thumbnail: uploadedThumbUrl }));
          setThumbnailUpload((prev) => ({
            ...prev,
            progress: 100,
            uploadedUrl: uploadedThumbUrl,
            uploading: false,
          }));
        } else {
          setThumbnailUpload((prev) => ({ ...prev, uploading: false }));
        }

        if (!videoUrlFinal) {
          setError("Could not determine video URL after upload.");
          return;
        }

        setCombinedUploadProgress(100);
      } else {
        videoUrlFinal = formData.videoUrl.trim();
      }

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        videoUrl: videoUrlFinal,
        thumbnail: thumbnailFinal || undefined,
        videoType: formData.videoType,
        propertyType: formData.propertyType,
        status: formData.status,
        price: Number(formData.price),
        bedrooms: formData.bedrooms || undefined,
        bathrooms: formData.bathrooms || undefined,
        sizeSqm: formData.sizeSqm || undefined,
        currency: formData.currency,
        country: formData.country,
        city: formData.city,
        address: addressFinal,
        latitude: formData.latitude || undefined,
        longitude: formData.longitude || undefined,
      };

      const createRes = await fetch("/api/videos/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const createData = (await createRes.json().catch(() => ({}))) as Record<string, unknown>;
      if (!createRes.ok) {
        setError(parseApiError(createData));
        return;
      }

      setSuccessMessage("Video published successfully.");
      const role = session?.user?.role;
      router.push(role === "ADMIN" || role === "SUPER_ADMIN" ? "/studio" : "/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error while publishing video");
    } finally {
      setLoading(false);
      setCombinedUploadProgress(0);
      setVideoUpload((prev) => ({ ...prev, uploading: false }));
      setThumbnailUpload((prev) => ({ ...prev, uploading: false }));
    }
  };

  return (
    <div className={`min-h-screen px-4 py-10 sm:px-6 lg:px-8 ${uiTokens.background}`}>
      <div className={`mx-auto max-w-5xl overflow-hidden rounded-2xl border shadow-sm ${uiTokens.border} ${uiTokens.surface}`}>
        <div className={`border-b px-6 py-6 sm:px-8 ${uiTokens.border} ${uiTokens.surfaceMuted}`}>
          <h1 className={`flex items-center gap-2 text-2xl font-bold ${uiTokens.textPrimary}`}>
            <Upload className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            Upload Property Video
          </h1>
          <p className={`mt-1 text-sm ${uiTokens.textSecondary}`}>
            Create a clean, complete listing with video, property details, and exact location.
          </p>
        </div>

        {(error || successMessage) && (
          <div className="space-y-3 px-6 pt-6 sm:px-8">
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-900/20 dark:text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {successMessage && (
              <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-900/70 dark:bg-green-900/20 dark:text-green-300">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}
          </div>
        )}

        {(isUploading || combinedUploadProgress > 0) && (
          <div className="px-6 pt-4 sm:px-8">
            <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
              <span>Uploading media…</span>
              <span>{combinedUploadProgress}%</span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className="h-full rounded-full bg-indigo-600 transition-[width] duration-150"
                style={{ width: `${combinedUploadProgress}%` }}
              />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} encType="multipart/form-data" className="space-y-10 px-6 py-8 sm:px-8">
          <section className="space-y-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
              <Video className="h-5 w-5 text-indigo-500" />
              Video
            </h2>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
              <input
                name="title"
                type="text"
                required
                value={formData.title}
                onChange={handleChange}
                className={uiTokens.input}
                placeholder="Modern 3BR apartment with marina view"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
              <textarea
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleChange}
                className={uiTokens.input}
                placeholder="Highlight rooms, amenities, and neighborhood value."
              />
            </div>
            <div className="space-y-4">
              <div className="w-full max-w-xs">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Video Type</label>
                <div className={`inline-flex w-full rounded-xl border p-1 shadow-sm ${uiTokens.border} ${uiTokens.surface}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, videoType: "long" }));
                    }}
                    className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      formData.videoType === "long"
                        ? "bg-indigo-600 text-white"
                        : "text-slate-800 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    Long
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, videoType: "short" }));
                    }}
                    className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      formData.videoType === "short"
                        ? "bg-indigo-600 text-white"
                        : "text-slate-800 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    Short
                  </button>
                </div>
              </div>

              <UploadCard
                title="Upload Video"
                icon={<FileVideo className="h-5 w-5 text-indigo-500" />}
                accept="video/mp4,.mp4"
                disabled={isYoutubeMode || isUploading}
                fileName={videoUpload.file?.name || ""}
                progress={videoUpload.progress}
                uploading={videoUpload.uploading}
                uploaded={Boolean(videoUpload.uploadedUrl)}
                helperText="MP4 — uploads when you publish"
                previewSrc={videoPreviewSrc}
                previewAsVideo
                videoVariant={formData.videoType}
                onChange={(event) => handleVideoFileSelect(event.target.files?.[0] || null)}
                dropzoneHeight="min-h-[14rem]"
                wrapperClassName="w-full"
              />

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  YouTube URL
                </label>
                <div className="relative">
                  <Youtube className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                  <input
                    type="url"
                    name="videoUrl"
                    value={videoUpload.file ? "" : formData.videoUrl}
                    onChange={(event) => {
                      setFormData((prev) => ({ ...prev, videoUrl: event.target.value }));
                    }}
                    disabled={Boolean(videoUpload.file) || isUploading}
                    className={`${uiTokens.input} py-3 pl-10 pr-4 disabled:cursor-not-allowed disabled:opacity-60`}
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </div>
              </div>

              <UploadCard
                title="Thumbnail"
                icon={<FileImage className="h-5 w-5 text-indigo-500" />}
                accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                disabled={isUploading}
                fileName={thumbnailUpload.file?.name || ""}
                progress={thumbnailUpload.progress}
                uploading={thumbnailUpload.uploading}
                uploaded={Boolean(thumbnailUpload.uploadedUrl)}
                helperText="Optional — JPG or PNG"
                previewSrc={thumbnailPreviewUrl}
                onChange={(event) => handleThumbnailSelect(event.target.files?.[0] || null)}
                dropzoneHeight="min-h-[11rem]"
                wrapperClassName="w-full"
              />
            </div>
          </section>

          <section className="space-y-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
              <Home className="h-5 w-5 text-indigo-500" />
              Property Details
            </h2>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Property Type</label>
                <select
                  name="propertyType"
                  value={formData.propertyType}
                  onChange={handleChange}
                  className={uiTokens.select}
                >
                  <option value="APARTMENT">Apartment</option>
                  <option value="VILLA">Villa</option>
                  <option value="HOUSE">House</option>
                  <option value="OFFICE">Office</option>
                  <option value="SHOP">Shop</option>
                  <option value="COMMERCIAL">Commercial</option>
                  <option value="LAND">Land</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Listing Type</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className={uiTokens.select}
                >
                  <option value="FOR_SALE">For Sale</option>
                  <option value="FOR_RENT">For Rent</option>
                </select>
              </div>

              <CompactField
                label="Bedrooms"
                name="bedrooms"
                value={formData.bedrooms}
                onChange={handleChange}
                type="number"
                min="0"
                maxWidthClassName="max-w-none"
              />
              <CompactField
                label="Bathrooms"
                name="bathrooms"
                value={formData.bathrooms}
                onChange={handleChange}
                type="number"
                min="0"
                step="0.5"
                maxWidthClassName="max-w-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <CompactField
                label="Area"
                name="sizeSqm"
                value={formData.sizeSqm}
                onChange={handleChange}
                type="number"
                min="0"
                maxWidthClassName="max-w-none"
              />
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Area Unit</label>
                <input
                  value={formData.sizeUnit === "sqft" ? "ft²" : "m²"}
                  readOnly
                  className={uiTokens.input}
                />
              </div>
              <CompactField
                label="Price"
                name="price"
                value={formData.price}
                onChange={handleChange}
                type="number"
                min="0"
                required
                maxWidthClassName="max-w-none"
              />
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Currency</label>
                <input value={formData.currency} readOnly className={uiTokens.input} />
              </div>
            </div>
          </section>

          <section className="space-y-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
              <MapPin className="h-5 w-5 text-indigo-500" />
              Location
            </h2>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Country</label>
                <select
                  name="country"
                  required
                  value={formData.country}
                  onChange={handleChange}
                  className={uiTokens.select}
                >
                  <option value="">Select country</option>
                  {countries.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">City</label>
                <select
                  name="city"
                  required
                  value={formData.city}
                  onChange={handleChange}
                  disabled={!formData.country}
                  className={uiTokens.select}
                >
                  <option value="">{formData.country ? "Select city" : "Select country first"}</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Area / Address</label>
                <input
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className={uiTokens.input}
                  placeholder="Business Bay, Downtown, etc."
                />
              </div>

              <MapLeafletPicker
                address={formData.address}
                country={formData.country}
                city={formData.city}
                latitude={formData.latitude}
                longitude={formData.longitude}
                onPatch={handleLocationPatch}
              />
            </div>
          </section>

          <div className="flex justify-center pt-2">
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex w-full max-w-sm items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {(loading || isUploading) && <Loader2 className="h-5 w-5 animate-spin" />}
              {loading ? "Publishing..." : isUploading ? "Uploading..." : "Publish Video"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UploadCard({
  title,
  icon,
  accept,
  disabled,
  fileName,
  progress,
  uploading,
  uploaded,
  helperText,
  previewSrc,
  previewAsVideo = false,
  videoVariant = "long",
  onChange,
  dropzoneHeight = "h-40",
  wrapperClassName = "",
}: {
  title: string;
  icon: ReactNode;
  accept: string;
  disabled: boolean;
  fileName: string;
  progress: number;
  uploading: boolean;
  uploaded: boolean;
  helperText: string;
  previewSrc?: string;
  previewAsVideo?: boolean;
  videoVariant?: "long" | "short";
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  dropzoneHeight?: string;
  wrapperClassName?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const aspectClass = previewAsVideo
    ? videoVariant === "short"
      ? "aspect-[9/16] mx-auto w-full max-w-[280px]"
      : "aspect-video w-full"
    : "aspect-video mx-auto w-full max-w-xl";

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-600 dark:bg-slate-900 ${wrapperClassName}`}>
      <label className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-100">
        {icon}
        {title}
      </label>

      <div
        className={`relative overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-neutral-50 p-3 dark:border-slate-500 dark:bg-slate-800/40 ${dropzoneHeight}`}
      >
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept={accept}
          disabled={disabled}
          onChange={onChange}
          className="sr-only"
        />

        {previewSrc ? (
          <div className="flex h-full min-h-[10rem] flex-col gap-2">
            <div
              className={`relative flex w-full flex-1 items-center justify-center overflow-hidden rounded-lg bg-neutral-100 dark:bg-slate-800/60 ${aspectClass}`}
            >
              {previewAsVideo ? (
                <video
                  src={previewSrc}
                  key={previewSrc}
                  controls
                  playsInline
                  preload="metadata"
                  className="z-[1] max-h-full w-full object-contain"
                />
              ) : (
                <img
                  src={previewSrc}
                  alt="Thumbnail preview"
                  className="z-[1] max-h-full w-full object-contain"
                />
              )}
              <button
                type="button"
                disabled={disabled}
                onClick={() => inputRef.current?.click()}
                className="absolute right-2 top-2 z-[2] rounded-lg border border-slate-200 bg-white/95 px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-sm backdrop-blur-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900/95 dark:text-slate-100"
              >
                Replace
              </button>
            </div>
          </div>
        ) : (
          <label
            htmlFor={inputId}
            className={`flex h-full min-h-[8rem] cursor-pointer flex-col items-center justify-center text-center ${
              disabled ? "cursor-not-allowed opacity-60" : ""
            }`}
          >
            <Upload className="mx-auto h-6 w-6 text-gray-400" />
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-100">{fileName || "Click to upload"}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">{helperText}</p>
          </label>
        )}
      </div>
      {(uploading || uploaded || fileName) && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-100">
            <span className="truncate">{fileName || "Preparing upload..."}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700">
            <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
          {uploaded && (
            <p className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-3.5 w-3.5" /> Upload complete
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function CompactField({
  label,
  name,
  value,
  onChange,
  type,
  min,
  step,
  required,
  maxWidthClassName = "max-w-xs",
}: {
  label: string;
  name: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  type: string;
  min?: string;
  step?: string;
  required?: boolean;
  maxWidthClassName?: string;
}) {
  return (
    <div className={maxWidthClassName}>
      <label className="mb-2 block text-sm font-medium text-slate-800 dark:text-slate-100">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        min={min}
        step={step}
        required={required}
        onChange={onChange}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-500 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
      />
    </div>
  );
}
