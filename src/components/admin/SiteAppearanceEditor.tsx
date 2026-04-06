"use client";

import * as React from "react";
import { GripVertical, ImageUp, LayoutTemplate, Loader2, Redo2, Save, Undo2 } from "lucide-react";
import SiteVisualBuilder from "@/components/admin/SiteVisualBuilder";
import {
  isCloudinarySiteLogoConfigured,
  uploadSiteLogoToCloudinary,
} from "@/lib/cloudinaryDirectUpload";
import { AdminSectionTitle, AdminToolLabel } from "@/components/admin/AdminToolLabel";
import SiteLookLivePreview from "@/components/admin/SiteLookLivePreview";
import type {
  DiscoverCardStyle,
  DiscoverColumns,
  DiscoverGap,
  ProfileLayout,
  SiteAppearanceDTO,
  SiteLayoutConfig,
  VideoCardLayout,
} from "@/lib/site-appearance";
import {
  DISCOVER_THEME_PRESETS,
  FONT_PRESETS,
  HEADER_RIGHT_KEYS,
  HOME_SECTION_KEYS,
  HOME_THEME_PRESETS,
  PROFILE_THEME_PRESETS,
  SIDEBAR_DESKTOP_KEYS,
  SIDEBAR_MOBILE_KEYS,
  USER_THEME_PRESETS,
  VIDEO_THEME_PRESETS,
} from "@/lib/site-appearance";

const DESKTOP_LABELS: Record<string, string> = {
  home: "Home",
  shorts: "Shorts",
  subscribers: "Subscribers",
  subscriptions: "Subscriptions",
  explore: "Explore",
  agents: "Agents",
  agencies: "Agencies",
  trending: "Trending",
};

const MOBILE_LABELS: Record<string, string> = {
  ...DESKTOP_LABELS,
  studio: "Studio",
};

const HEADER_LABELS: Record<string, string> = {
  mobile_search: "Mobile search",
  upload: "Upload",
  language: "Language",
  user: "Account / login",
};

const MAX_LOGO_BYTES = Math.floor(2.5 * 1024 * 1024);
const LOGO_ACCEPT = "image/png,image/jpeg,image/webp,image/svg+xml,.svg";

const SECTION_LABELS: Record<string, string> = {
  hero_filters: "Title + filter chips",
  grid_top: "Main video grid (first rows)",
  shorts: "Shorts shelf",
  grid_rest: "Remaining grid (if any)",
  map: "Map block",
};

const CARD_STYLE_OPTIONS: { value: DiscoverCardStyle; label: string }[] = [
  { value: "immersive", label: "غامر (بطاقة كبيرة وظلال)" },
  { value: "compact", label: "مضغوط" },
  { value: "minimal", label: "بسيط" },
];

const GAP_OPTIONS: { value: DiscoverGap; label: string }[] = [
  { value: "tight", label: "ضيّق" },
  { value: "normal", label: "عادي" },
  { value: "wide", label: "واسع" },
];

function DraggableRowList({
  title,
  description,
  items,
  onChange,
  labelOf,
}: {
  title: string;
  description?: string;
  items: string[];
  onChange: (next: string[]) => void;
  labelOf: (id: string) => string;
}) {
  const dragFrom = React.useRef<number | null>(null);

  const move = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return;
    const next = [...items];
    const [removed] = next.splice(from, 1);
    if (removed === undefined) return;
    next.splice(to, 0, removed);
    onChange(next);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      {description ? <p className="mt-1 text-xs text-white/55">{description}</p> : null}
      <ul className="mt-3 space-y-2">
        {items.map((id, index) => (
          <li
            key={id}
            draggable
            onDragStart={() => {
              dragFrom.current = index;
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              const from = dragFrom.current;
              dragFrom.current = null;
              if (from === null) return;
              move(from, index);
            }}
            className="flex cursor-grab items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4 shrink-0 text-white/40" aria-hidden />
            <span className="text-sm text-white/85">
              <span className="font-mono text-xs text-white/45">{id}</span>
              <span className="mx-2 text-white/25">·</span>
              {labelOf(id)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function selectClassName() {
  return "w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white";
}

export default function SiteAppearanceEditor() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [form, setForm] = React.useState<SiteAppearanceDTO | null>(null);
  const [logoUploading, setLogoUploading] = React.useState(false);
  const [logoUploadErr, setLogoUploadErr] = React.useState("");
  const [histTick, setHistTick] = React.useState(0);
  const logoFileRef = React.useRef<HTMLInputElement>(null);
  const skipHistoryRef = React.useRef(false);
  const undoStackRef = React.useRef<string[]>([]);
  const redoStackRef = React.useRef<string[]>([]);
  const baselineRef = React.useRef<string>("");
  const [visualOpen, setVisualOpen] = React.useState(false);

  const updateForm = React.useCallback((recipe: (f: SiteAppearanceDTO) => SiteAppearanceDTO) => {
    setForm((f) => {
      if (!f) return f;
      const next = recipe(f);
      if (next === f) return f;
      if (!skipHistoryRef.current) {
        undoStackRef.current = [...undoStackRef.current.slice(-49), JSON.stringify(f)];
        redoStackRef.current = [];
        setHistTick((t) => t + 1);
      }
      return next;
    });
  }, []);

  const undo = React.useCallback(() => {
    setForm((f) => {
      if (!f || undoStackRef.current.length === 0) return f;
      skipHistoryRef.current = true;
      const snap = undoStackRef.current.pop()!;
      redoStackRef.current.push(JSON.stringify(f));
      const parsed = JSON.parse(snap) as SiteAppearanceDTO;
      setHistTick((t) => t + 1);
      queueMicrotask(() => {
        skipHistoryRef.current = false;
      });
      return parsed;
    });
  }, []);

  const redo = React.useCallback(() => {
    setForm((f) => {
      if (!f || redoStackRef.current.length === 0) return f;
      skipHistoryRef.current = true;
      const snap = redoStackRef.current.pop()!;
      undoStackRef.current.push(JSON.stringify(f));
      const parsed = JSON.parse(snap) as SiteAppearanceDTO;
      setHistTick((t) => t + 1);
      queueMicrotask(() => {
        skipHistoryRef.current = false;
      });
      return parsed;
    });
  }, []);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable=true]")) return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (k === "y" || (k === "z" && e.shiftKey)) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  const resetHistoryFromServer = React.useCallback((data: SiteAppearanceDTO) => {
    skipHistoryRef.current = true;
    undoStackRef.current = [];
    redoStackRef.current = [];
    baselineRef.current = JSON.stringify(data);
    setForm(data);
    queueMicrotask(() => {
      skipHistoryRef.current = false;
      setHistTick((t) => t + 1);
    });
  }, []);

  const resetAllToBaseline = React.useCallback(() => {
    const raw = baselineRef.current;
    if (!raw) return;
    skipHistoryRef.current = true;
    undoStackRef.current = [];
    redoStackRef.current = [];
    setForm(JSON.parse(raw) as SiteAppearanceDTO);
    queueMicrotask(() => {
      skipHistoryRef.current = false;
      setHistTick((t) => t + 1);
    });
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/site-appearance", { credentials: "include", cache: "no-store" });
      const data = (await res.json()) as SiteAppearanceDTO & { error?: string };
      if (!res.ok) throw new Error(data.error || "Load failed");
      resetHistoryFromServer(data);
    } catch (e) {
      setMessage({ type: "err", text: e instanceof Error ? e.message : "Load failed" });
      setForm(null);
      undoStackRef.current = [];
      redoStackRef.current = [];
      setHistTick((t) => t + 1);
    } finally {
      setLoading(false);
    }
  }, [resetHistoryFromServer]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!form) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/site-appearance", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          layout: form.layout,
          ui: form.ui,
        }),
      });
      const data = (await res.json()) as SiteAppearanceDTO & { error?: string };
      if (!res.ok) throw new Error(data.error || "Save failed");
      resetHistoryFromServer(data);
      setMessage({
        type: "ok",
        text: "Saved. Visitors will see updates within ~2 minutes (cache) or after refresh.",
      });
    } catch (e) {
      setMessage({ type: "err", text: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  const patchLayout = (partial: Partial<SiteLayoutConfig>) => {
    updateForm((f) => ({ ...f, layout: { ...f.layout, ...partial } }));
  };

  const patchDiscover = (partial: Partial<SiteAppearanceDTO["ui"]["discover"]>) => {
    updateForm((f) => ({ ...f, ui: { ...f.ui, discover: { ...f.ui.discover, ...partial } } }));
  };

  const patchProfileUi = (partial: Partial<SiteAppearanceDTO["ui"]["profile"]>) => {
    updateForm((f) => ({ ...f, ui: { ...f.ui, profile: { ...f.ui.profile, ...partial } } }));
  };

  const patchVideoCard = (partial: Partial<SiteAppearanceDTO["ui"]["videoCard"]>) => {
    updateForm((f) => ({ ...f, ui: { ...f.ui, videoCard: { ...f.ui.videoCard, ...partial } } }));
  };

  const patchHome = (partial: Partial<SiteAppearanceDTO["ui"]["home"]>) => {
    updateForm((f) => ({ ...f, ui: { ...f.ui, home: { ...f.ui.home, ...partial } } }));
  };

  const onLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !form) return;
    setLogoUploadErr("");
    const mime = (file.type || "").toLowerCase();
    const extOk = /\.(png|jpe?g|webp|svg)$/i.test(file.name);
    const mimeOk =
      mime === "image/png" ||
      mime === "image/jpeg" ||
      mime === "image/webp" ||
      mime === "image/svg+xml";
    if (!mimeOk && !extOk) {
      setLogoUploadErr("يُسمح بـ PNG أو JPG أو WebP أو SVG فقط.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoUploadErr("الحد الأقصى لحجم الملف 2.5 ميجابايت.");
      return;
    }
    if (!isCloudinarySiteLogoConfigured()) {
      setLogoUploadErr(
        "لم يُضبط Cloudinary (NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME / UPLOAD_PRESET). الصق رابط صورة بدلاً من ذلك."
      );
      return;
    }
    setLogoUploading(true);
    try {
      const url = await uploadSiteLogoToCloudinary(file);
      updateForm((f) => ({ ...f, logoUrl: url }));
    } catch (err) {
      setLogoUploadErr(err instanceof Error ? err.message : "فشل الرفع");
    } finally {
      setLogoUploading(false);
    }
  };

  if (loading || !form) {
    return (
      <div className="flex items-center gap-2 text-sm text-white/70">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading appearance…
      </div>
    );
  }

  const fontKeys = Object.keys(FONT_PRESETS);
  const canUndo = undoStackRef.current.length > 0;
  const canRedo = redoStackRef.current.length > 0;
  void histTick;

  const colSelect = (value: DiscoverColumns, onChange: (n: DiscoverColumns) => void) => (
    <select
      className={selectClassName()}
      value={value}
      onChange={(e) => onChange(Number(e.target.value) as DiscoverColumns)}
    >
      <option value={2}>2</option>
      <option value={3}>3</option>
      <option value={4}>4</option>
    </select>
  );

  return (
    <>
    <div className="space-y-6">
      {message ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            message.type === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
              : "border-red-500/30 bg-red-500/10 text-red-200"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-white/60">
          تعديل مظهر الموقع العام: ألوان، خطوط، شعار، ترتيب القوائم، وشكل صفحات الوكلاء/الوكالات والبروفايل وبطاقات
          الفيديو. المعاينة على اليمين تعكس المسودة قبل الحفظ.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            title="تراجع (Ctrl+Z)"
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Undo2 className="h-4 w-4" />
            تراجع
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            title="إعادة (Ctrl+Y أو Ctrl+Shift+Z)"
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Redo2 className="h-4 w-4" />
            إعادة
          </button>
          <button
            type="button"
            onClick={resetAllToBaseline}
            title="استرجاع المسودة كما عند آخر تحميل أو حفظ"
            className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2.5 text-sm font-medium text-amber-100 transition hover:bg-amber-500/20"
          >
            تراجع عن الكل
          </button>
          <button
            type="button"
            onClick={() => setVisualOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-400/40 bg-indigo-500/15 px-3 py-2.5 text-sm font-medium text-indigo-100 transition hover:bg-indigo-500/25"
          >
            <LayoutTemplate className="h-4 w-4" />
            محرّر مرئي
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            حفظ
          </button>
        </div>
      </div>

      <div className="xl:grid xl:grid-cols-[minmax(0,1fr),min(400px,36vw)] xl:items-start xl:gap-8">
        <div className="min-w-0 space-y-6">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <AdminSectionTitle
                title="ألوان العلامة"
                subtitle="تُطبَّق على الواجهة العامة عبر متغيرات CSS."
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {(
                  [
                    ["primaryHex", "اللون الأساسي", "أزرار وروابط وتمييزات رئيسية في الموقع."],
                    ["accentHex", "لون مميز ثانوي", "لون إضافي للتباين مع الأساسي."],
                    ["backgroundHex", "خلفية الصفحة", "لون خلفية المحتوى الرئيسي."],
                    ["surfaceHex", "الأسطح", "بطاقات وحقول ومناطق مرتفعة قليلاً عن الخلفية."],
                    ["textHex", "نص رئيسي", "لون النصوص الأساسية."],
                    ["mutedHex", "نص ثانوي", "نصوص توضيحية وأقل بروزاً."],
                  ] as const
                ).map(([key, title, hint]) => {
                  const k = key as keyof Pick<
                    SiteAppearanceDTO,
                    "primaryHex" | "accentHex" | "backgroundHex" | "surfaceHex" | "textHex" | "mutedHex"
                  >;
                  const v = form[k];
                  const hex =
                    typeof v === "string" && v.startsWith("#") && v.length >= 7 ? v.slice(0, 7) : "#3b82f6";
                  return (
                    <div key={key} className="block">
                      <div className="mb-1">
                        <AdminToolLabel title={title} hint={hint} />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          className="h-10 w-14 cursor-pointer rounded border border-white/10 bg-transparent"
                          value={hex}
                          onChange={(e) => updateForm((f) => ({ ...f, [k]: e.target.value }))}
                        />
                        <input
                          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                          value={v}
                          onChange={(e) => updateForm((f) => ({ ...f, [k]: e.target.value }))}
                        />
                      </div>
                    </div>
                  );
                })}
                <div className="block sm:col-span-2">
                  <div className="mb-1">
                    <AdminToolLabel
                      title="حدود (CSS)"
                      hint="لون أو قيمة شفافة مثل rgba(...) لحدود البطاقات والفواصل."
                    />
                  </div>
                  <input
                    className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                    value={form.borderHex}
                    onChange={(e) => updateForm((f) => ({ ...f, borderHex: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <AdminSectionTitle title="الخطوط" subtitle="عائلة الخط وحجم النص ونسبة العناوين." />
              <div className="mt-4 space-y-4">
                <div>
                  <div className="mb-1">
                    <AdminToolLabel title="خط النصوص" hint="يُطبَّق على الفقرات والنصوص العادية في الموقع." />
                  </div>
                  <select
                    className={selectClassName()}
                    value={form.fontBodyKey}
                    onChange={(e) => updateForm((f) => ({ ...f, fontBodyKey: e.target.value }))}
                  >
                    {fontKeys.map((k) => (
                      <option key={k} value={k}>
                        {FONT_PRESETS[k]?.label ?? k}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="mb-1">
                    <AdminToolLabel title="خط العناوين" hint="يُستخدم للعناوين الكبيرة والعناوين الفرعية." />
                  </div>
                  <select
                    className={selectClassName()}
                    value={form.fontHeadingKey}
                    onChange={(e) => updateForm((f) => ({ ...f, fontHeadingKey: e.target.value }))}
                  >
                    {fontKeys.map((k) => (
                      <option key={k} value={k}>
                        {FONT_PRESETS[k]?.label ?? k}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="mb-1">
                    <AdminToolLabel
                      title="حجم الخط الأساسي (بكسل)"
                      hint="يحدد حجم النص المرجعي؛ العناوين تُحسب نسبةً له."
                    />
                  </div>
                  <input
                    type="number"
                    min={12}
                    max={22}
                    className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                    value={form.baseFontPx}
                    onChange={(e) =>
                      updateForm((f) => ({
                        ...f,
                        baseFontPx: Number(e.target.value) || f.baseFontPx,
                      }))
                    }
                  />
                </div>
                <div>
                  <div className="mb-1">
                    <AdminToolLabel title="مقياس العناوين" hint="ضرب حجم العناوين نسبةً للأساس (مثلاً 1.1 أكبر قليلاً)." />
                  </div>
                  <input
                    type="number"
                    step={0.01}
                    min={0.95}
                    max={1.35}
                    className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                    value={form.headingScale}
                    onChange={(e) =>
                      updateForm((f) => ({
                        ...f,
                        headingScale: Number(e.target.value) || f.headingScale,
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <AdminSectionTitle
              title="الشعار"
              subtitle="يظهر في الهيدر العام. يمكن الرفع أو لصق رابط HTTPS."
            />
            <p className="mt-1 text-xs leading-relaxed text-white/55">
              ارفع شعاراً من جهازك (PNG / JPG / WebP / SVG — حتى 2.5 ميجابايت). الصور النقطية تُحوَّل على السحابة إلى{" "}
              <strong className="text-white/75">WebP</strong> بجودة تلقائية. ملفات{" "}
              <strong className="text-white/75">SVG</strong> تُرفع كما هي.
            </p>

            <input
              ref={logoFileRef}
              type="file"
              accept={LOGO_ACCEPT}
              className="sr-only"
              aria-hidden
              onChange={(e) => void onLogoFileChange(e)}
            />

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={logoUploading}
                onClick={() => logoFileRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/15 disabled:opacity-50"
              >
                {logoUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ImageUp className="h-4 w-4" />
                )}
                {logoUploading ? "جارٍ الرفع…" : "رفع من الجهاز"}
              </button>
              {form.logoUrl ? (
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={form.logoUrl}
                    alt=""
                    className="h-10 w-auto max-w-[160px] object-contain"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              ) : null}
            </div>
            {logoUploadErr ? <p className="mt-2 text-sm text-red-300">{logoUploadErr}</p> : null}

            <div className="mt-3">
              <div className="mb-1">
                <AdminToolLabel
                  title="رابط الشعار"
                  hint="رابط مباشر لصورة الشعار. اتركه فارغاً لعرض الحرف R الافتراضي."
                />
              </div>
              <input
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                placeholder="https://…"
                value={form.logoUrl ?? ""}
                onChange={(e) => updateForm((f) => ({ ...f, logoUrl: e.target.value || null }))}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <AdminSectionTitle
              title="الصفحة الرئيسية"
              subtitle="شبكة الفيديو والألوان حسب المنطقة. استخدم «محرّر مرئي» لسحب أقسام الصفحة وضبط المناطق بالنقر."
            />
            <div className="mt-3 max-w-md">
              <div className="mb-4">
                <div className="mb-1">
                  <AdminToolLabel
                    title="ثيم الصفحة الرئيسية"
                    hint="اختر واحداً من 5 ثيمات عالمية للرئيسية، مع إمكانية المعاينة قبل الحفظ."
                  />
                </div>
                <select
                  className={selectClassName()}
                  value={form.ui.home.theme}
                  onChange={(e) => patchHome({ theme: e.target.value as SiteAppearanceDTO["ui"]["home"]["theme"] })}
                >
                  {HOME_THEME_PRESETS.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label} - {t.note}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-1">
                <AdminToolLabel
                  title="أعمدة بطاقات الفيديو"
                  hint="يؤثر على صف الصف الأول والباقي من شبكة الفيديو على الرئيسية."
                />
              </div>
              <select
                className={selectClassName()}
                value={form.ui.home.videoGridColumns}
                onChange={(e) =>
                  patchHome({ videoGridColumns: Number(e.target.value) as 2 | 3 | 4 })
                }
              >
                <option value={2}>عمودان</option>
                <option value={3}>3 أعمدة</option>
                <option value={4}>4 أعمدة</option>
              </select>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <AdminSectionTitle
              title="شكل الصفحات والبطاقات"
              subtitle="وكلاء، وكالات، بروفايل، وبطاقة الفيديو في القوائم والشبكات."
            />

            <h4 className="mt-2 text-xs font-bold uppercase tracking-wider text-indigo-300/90">اكتشاف الوكلاء والوكالات</h4>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <div className="mb-1">
                  <AdminToolLabel title="ثيم الاكتشاف" hint="5 ثيمات لصفحات الوكلاء والوكالات." />
                </div>
                <select
                  className={selectClassName()}
                  value={form.ui.discover.theme}
                  onChange={(e) =>
                    patchDiscover({ theme: e.target.value as SiteAppearanceDTO["ui"]["discover"]["theme"] })
                  }
                >
                  {DISCOVER_THEME_PRESETS.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label} - {t.note}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="mb-1">
                  <AdminToolLabel
                    title="أعمدة شبكة الوكلاء"
                    hint="عدد الأعمدة في صفحة الوكلاء على الشاشات الواسعة."
                  />
                </div>
                {colSelect(form.ui.discover.agentsColumns, (n) => patchDiscover({ agentsColumns: n }))}
              </div>
              <div>
                <div className="mb-1">
                  <AdminToolLabel
                    title="أعمدة شبكة الوكالات"
                    hint="عدد الأعمدة في صفحة الوكالات."
                  />
                </div>
                {colSelect(form.ui.discover.agenciesColumns, (n) => patchDiscover({ agenciesColumns: n }))}
              </div>
              <div>
                <div className="mb-1">
                  <AdminToolLabel title="المسافة بين البطاقات" hint="تباعد عمودي وأفقي بين عناصر الشبكة." />
                </div>
                <select
                  className={selectClassName()}
                  value={form.ui.discover.gap}
                  onChange={(e) => patchDiscover({ gap: e.target.value as DiscoverGap })}
                >
                  {GAP_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="mb-1">
                  <AdminToolLabel title="شكل بطاقة الوكيل" hint="مظهر بطاقة الوكيل في قائمة الوكلاء." />
                </div>
                <select
                  className={selectClassName()}
                  value={form.ui.discover.agentCardStyle}
                  onChange={(e) => patchDiscover({ agentCardStyle: e.target.value as DiscoverCardStyle })}
                >
                  {CARD_STYLE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <div className="mb-1">
                  <AdminToolLabel title="شكل بطاقة الوكالة" hint="مظهر بطاقة الشركة في قائمة الوكالات." />
                </div>
                <select
                  className={selectClassName()}
                  value={form.ui.discover.agencyCardStyle}
                  onChange={(e) => patchDiscover({ agencyCardStyle: e.target.value as DiscoverCardStyle })}
                >
                  {CARD_STYLE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-[11px] font-semibold text-white/70">عناصر واجهة صفحات الاكتشاف</p>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-white/20 bg-black/40"
                  checked={form.ui.discover.showFilters}
                  onChange={(e) => patchDiscover({ showFilters: e.target.checked })}
                />
                <AdminToolLabel title="إظهار الفلاتر" hint="شريط البحث والفلاتر أعلى القائمة." />
              </label>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-white/20 bg-black/40"
                  checked={form.ui.discover.showPagination}
                  onChange={(e) => patchDiscover({ showPagination: e.target.checked })}
                />
                <AdminToolLabel title="إظهار ترقيم الصفحات" hint="أزرار الصفحات أسفل القائمة." />
              </label>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-white/20 bg-black/40"
                  checked={form.ui.discover.showResultsFooter}
                  onChange={(e) => patchDiscover({ showResultsFooter: e.target.checked })}
                />
                <AdminToolLabel title="تذييل النتائج" hint="سطر يوضح عدد النتائج أو ملخصاً أسفل القائمة." />
              </label>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-white/20 bg-black/40"
                  checked={form.ui.discover.showListDebug}
                  onChange={(e) => patchDiscover({ showListDebug: e.target.checked })}
                />
                <AdminToolLabel
                  title="وضع تصحيح القائمة"
                  hint="معلومات تقنية للمطورين (مفيدة عند ضبط الشبكة)."
                />
              </label>
            </div>

            <h4 className="mt-6 text-xs font-bold uppercase tracking-wider text-indigo-300/90">صفحة البروفايل</h4>
            <div className="mt-3 space-y-3">
              <div>
                <div className="mb-1">
                  <AdminToolLabel title="ثيم البروفايل" hint="5 ثيمات احترافية لعرض الهوية والبطاقات." />
                </div>
                <select
                  className={selectClassName()}
                  value={form.ui.profile.theme}
                  onChange={(e) => patchProfileUi({ theme: e.target.value as SiteAppearanceDTO["ui"]["profile"]["theme"] })}
                >
                  {PROFILE_THEME_PRESETS.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label} - {t.note}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="mb-1">
                  <AdminToolLabel
                    title="تنسيق رأس البروفايل"
                    hint="كلاسيكي: صف أفقي. Spotlight: تمركز وخلفية مميزة للهوية."
                  />
                </div>
                <select
                  className={selectClassName()}
                  value={form.ui.profile.layout}
                  onChange={(e) => patchProfileUi({ layout: e.target.value as ProfileLayout })}
                >
                  <option value="classic">كلاسيكي</option>
                  <option value="spotlight">Spotlight</option>
                </select>
              </div>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-white/20 bg-black/40"
                  checked={form.ui.profile.showAccountCard}
                  onChange={(e) => patchProfileUi({ showAccountCard: e.target.checked })}
                />
                <AdminToolLabel title="بطاقة الحساب والاتصال" hint="بيانات البريد والدور والهاتف في بطاقة منفصلة." />
              </label>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-white/20 bg-black/40"
                  checked={form.ui.profile.showMyVisits}
                  onChange={(e) => patchProfileUi({ showMyVisits: e.target.checked })}
                />
                <AdminToolLabel title="قسم زياراتي" hint="قائمة العقارات التي زارها المستخدم." />
              </label>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-white/20 bg-black/40"
                  checked={form.ui.profile.showInbox}
                  onChange={(e) => patchProfileUi({ showInbox: e.target.checked })}
                />
                <AdminToolLabel title="الرسائل (صندوق الوارد)" hint="محادثات الرسائل داخل البروفايل." />
              </label>
            </div>

            <h4 className="mt-6 text-xs font-bold uppercase tracking-wider text-indigo-300/90">بطاقة الفيديو في القوائم</h4>
            <div className="mt-3 space-y-3">
              <div>
                <div className="mb-1">
                  <AdminToolLabel title="ثيم بطاقات الفيديو" hint="5 ثيمات لأسلوب عرض البطاقات عبر المنصة." />
                </div>
                <select
                  className={selectClassName()}
                  value={form.ui.videoCard.theme}
                  onChange={(e) =>
                    patchVideoCard({ theme: e.target.value as SiteAppearanceDTO["ui"]["videoCard"]["theme"] })
                  }
                >
                  {VIDEO_THEME_PRESETS.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label} - {t.note}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-1">
                <AdminToolLabel
                  title="تخطيط البطاقة"
                  hint="قياسي: صورة كبيرة + قناة. مضغوط: صف أفقي. ملصق: عنوان على الصورة."
                />
              </div>
              <select
                className={selectClassName()}
                value={form.ui.videoCard.layout}
                onChange={(e) => patchVideoCard({ layout: e.target.value as VideoCardLayout })}
              >
                <option value="standard">قياسي</option>
                <option value="dense">مضغوط</option>
                <option value="poster">ملصق (عنوان على الصورة)</option>
              </select>
            </div>

            <h4 className="mt-6 text-xs font-bold uppercase tracking-wider text-indigo-300/90">صفحات المستخدم</h4>
            <div className="mt-3">
              <div className="mb-1">
                <AdminToolLabel title="ثيم المستخدم" hint="5 أنماط لصفحات المستخدم العامة داخل المنصة." />
              </div>
              <select
                className={selectClassName()}
                value={form.ui.user.theme}
                onChange={(e) =>
                  updateForm((f) => ({ ...f, ui: { ...f.ui, user: { ...f.ui.user, theme: e.target.value as SiteAppearanceDTO["ui"]["user"]["theme"] } } }))
                }
              >
                {USER_THEME_PRESETS.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label} - {t.note}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <AdminSectionTitle
              title="ترتيب التخطيط (سحب وإفلات)"
              subtitle="الشريط الجانبي، شريط الجوال، أزرار الهيدر، وأقسام الصفحة الرئيسية."
            />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <DraggableRowList
                title="الشريط الجانبي — سطح المكتب"
                items={form.layout.sidebarDesktop.filter((id) =>
                  (SIDEBAR_DESKTOP_KEYS as readonly string[]).includes(id)
                )}
                onChange={(sidebarDesktop) => patchLayout({ sidebarDesktop })}
                labelOf={(id) => DESKTOP_LABELS[id] ?? id}
              />
              <DraggableRowList
                title="شريط الجوال السفلي"
                items={form.layout.sidebarMobile.filter((id) =>
                  (SIDEBAR_MOBILE_KEYS as readonly string[]).includes(id)
                )}
                onChange={(sidebarMobile) => patchLayout({ sidebarMobile })}
                labelOf={(id) => MOBILE_LABELS[id] ?? id}
              />
              <DraggableRowList
                title="زرّات يمين الهيدر"
                description="ترتيب الإجراءات بجانب البحث (سطح المكتب) أو بعد الشعار (جوال)."
                items={form.layout.headerRight.filter((id) =>
                  (HEADER_RIGHT_KEYS as readonly string[]).includes(id)
                )}
                onChange={(headerRight) => patchLayout({ headerRight })}
                labelOf={(id) => HEADER_LABELS[id] ?? id}
              />
              <DraggableRowList
                title="أقسام الصفحة الرئيسية"
                items={form.layout.homeSections.filter((id) =>
                  (HOME_SECTION_KEYS as readonly string[]).includes(id)
                )}
                onChange={(homeSections) => patchLayout({ homeSections })}
                labelOf={(id) => SECTION_LABELS[id] ?? id}
              />
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={undo}
              disabled={!canUndo}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-40"
            >
              <Undo2 className="h-4 w-4" />
              تراجع
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              حفظ التغييرات
            </button>
          </div>
        </div>

        <aside className="mt-8 min-w-0 xl:mt-0">
          <SiteLookLivePreview draft={form} />
        </aside>
      </div>
    </div>
    <SiteVisualBuilder
      open={visualOpen}
      onClose={() => setVisualOpen(false)}
      draft={form}
      onApply={updateForm}
      canUndo={canUndo}
      canRedo={canRedo}
      onUndo={undo}
      onRedo={redo}
      onResetAll={resetAllToBaseline}
    />
    </>
  );
}
