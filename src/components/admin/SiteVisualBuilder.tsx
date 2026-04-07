"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { GripVertical, Monitor, Palette, Redo2, Undo2, X } from "lucide-react";
import type { SiteAppearanceDTO, HomeSectionKey } from "@/lib/site-appearance-shared";
import {
  DISCOVER_THEME_PRESETS,
  HOME_SECTION_KEYS,
  HOME_THEME_PRESETS,
  PROFILE_THEME_PRESETS,
  USER_THEME_PRESETS,
  VIDEO_THEME_PRESETS,
  appearanceToCssVars,
  homeVideoGridClass,
} from "@/lib/site-appearance-shared";
import SiteLookLivePreview from "@/components/admin/SiteLookLivePreview";

const SECTION_AR: Record<HomeSectionKey, string> = {
  hero_filters: "العنوان والفلاتر",
  grid_top: "شبكة الفيديو (الصفوف الأولى)",
  shorts: "رف Shorts",
  grid_rest: "بقية الشبكة",
  map: "الخريطة",
};

type PageKey = "home" | "discover" | "profile" | "user" | "video" | "theme";

function DemoPicker({
  items,
  value,
  onPick,
}: {
  items: { key: string; label: string; note: string }[];
  value: string;
  onPick: (key: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onPick(item.key)}
          className={[
            "rounded-lg border p-2 text-left transition",
            value === item.key
              ? "border-indigo-400 bg-indigo-500/15 text-white"
              : "border-white/10 bg-white/[0.02] text-white/75 hover:border-white/25",
          ].join(" ")}
        >
          <p className="text-[11px] font-semibold">{item.label}</p>
          <p className="text-[10px] text-white/55">{item.note}</p>
        </button>
      ))}
    </div>
  );
}

export default function SiteVisualBuilder({
  open,
  onClose,
  draft,
  onApply,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onResetAll,
}: {
  open: boolean;
  onClose: () => void;
  draft: SiteAppearanceDTO;
  onApply: (recipe: (d: SiteAppearanceDTO) => SiteAppearanceDTO) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onResetAll: () => void;
}) {
  const [mounted, setMounted] = React.useState(false);
  const [page, setPage] = React.useState<PageKey>("home");
  const [focus, setFocus] = React.useState<string | null>(null);

  React.useEffect(() => setMounted(true), []);

  const patchLayoutOrder = React.useCallback(
    (nextIn: HomeSectionKey[]) => {
      const missing = HOME_SECTION_KEYS.filter((k) => !nextIn.includes(k));
      const next = [...nextIn, ...missing];
      onApply((d) => ({
        ...d,
        layout: { ...d.layout, homeSections: next },
      }));
    },
    [onApply]
  );

  const homeSections = draft.layout.homeSections.filter((id) =>
    (HOME_SECTION_KEYS as readonly string[]).includes(id)
  ) as HomeSectionKey[];

  const moveHome = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0) return;
    const next = [...homeSections];
    const [x] = next.splice(from, 1);
    if (x === undefined) return;
    next.splice(to, 0, x);
    patchLayoutOrder(next);
  };

  const hm = draft.ui.home;
  const gridPreviewClass = homeVideoGridClass(hm.videoGridColumns);

  if (!open || !mounted) return null;

  const inspector = (() => {
    if (page === "theme" || focus === "theme") {
      return (
        <div className="space-y-4 text-sm text-white/85">
          <p className="text-xs text-white/50">ألوان عامة تُطبَّق على الموقع بالكامل.</p>
          <label className="block">
            <span className="mb-1 block text-xs text-white/55">أساسي</span>
            <div className="flex gap-2">
              <input
                type="color"
                className="h-9 w-12 cursor-pointer rounded border border-white/10 bg-transparent"
                value={draft.primaryHex.startsWith("#") ? draft.primaryHex.slice(0, 7) : "#3b82f6"}
                onChange={(e) => onApply((d) => ({ ...d, primaryHex: e.target.value }))}
              />
              <input
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs"
                value={draft.primaryHex}
                onChange={(e) => onApply((d) => ({ ...d, primaryHex: e.target.value }))}
              />
            </div>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-white/55">خلفية الصفحة</span>
            <div className="flex gap-2">
              <input
                type="color"
                className="h-9 w-12 cursor-pointer rounded border border-white/10 bg-transparent"
                value={draft.backgroundHex.startsWith("#") ? draft.backgroundHex.slice(0, 7) : "#0f0f0f"}
                onChange={(e) => onApply((d) => ({ ...d, backgroundHex: e.target.value }))}
              />
              <input
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs"
                value={draft.backgroundHex}
                onChange={(e) => onApply((d) => ({ ...d, backgroundHex: e.target.value }))}
              />
            </div>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-white/55">حجم الخط الأساسي (px)</span>
            <input
              type="number"
              min={12}
              max={22}
              className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs"
              value={draft.baseFontPx}
              onChange={(e) =>
                onApply((d) => ({
                  ...d,
                  baseFontPx: Number(e.target.value) || d.baseFontPx,
                }))
              }
            />
          </label>
        </div>
      );
    }

    if (page === "home") {
      if (focus === "grid" || focus === "grid_top" || focus === "grid_rest") {
        return (
          <div className="space-y-3 text-sm text-white/85">
            <p className="text-xs text-white/50">كثافة أعمدة بطاقات الفيديو على الصفحة الرئيسية.</p>
            <select
              className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-xs"
              value={hm.videoGridColumns}
              onChange={(e) =>
                onApply((d) => ({
                  ...d,
                  ui: {
                    ...d.ui,
                    home: {
                      ...d.ui.home,
                      videoGridColumns: Number(e.target.value) as 2 | 3 | 4,
                    },
                  },
                }))
              }
            >
              <option value={2}>عمودان</option>
              <option value={3}>3 أعمدة</option>
              <option value={4}>4 أعمدة (واسع)</option>
            </select>
            <label className="block text-xs">
              <span className="mb-1 block text-white/55">خلفية قسم الشبكة</span>
              <input
                type="color"
                className="mb-1 h-8 w-full cursor-pointer rounded border border-white/10"
                value={hm.gridBackground?.startsWith("#") ? hm.gridBackground.slice(0, 7) : "#000000"}
                onChange={(e) =>
                  onApply((d) => ({
                    ...d,
                    ui: { ...d.ui, home: { ...d.ui.home, gridBackground: e.target.value } },
                  }))
                }
              />
              <button
                type="button"
                className="text-[10px] text-indigo-300 underline"
                onClick={() =>
                  onApply((d) => ({
                    ...d,
                    ui: { ...d.ui, home: { ...d.ui.home, gridBackground: undefined } },
                  }))
                }
              >
                إزالة اللون
              </button>
            </label>
          </div>
        );
      }
      if (focus === "hero" || focus === "hero_filters") {
        return (
          <div className="space-y-3 text-sm text-white/85">
            <label className="block text-xs">
              <span className="mb-1 block text-white/55">خلفية المنطقة</span>
              <input
                type="color"
                className="h-8 w-full cursor-pointer rounded border border-white/10"
                value={hm.heroBackground?.startsWith("#") ? hm.heroBackground.slice(0, 7) : "#000000"}
                onChange={(e) =>
                  onApply((d) => ({
                    ...d,
                    ui: { ...d.ui, home: { ...d.ui.home, heroBackground: e.target.value } },
                  }))
                }
              />
            </label>
            <label className="block text-xs">
              <span className="mb-1 block text-white/55">لون النص</span>
              <input
                type="color"
                className="h-8 w-full cursor-pointer rounded border border-white/10"
                value={hm.heroForeground?.startsWith("#") ? hm.heroForeground.slice(0, 7) : "#ffffff"}
                onChange={(e) =>
                  onApply((d) => ({
                    ...d,
                    ui: { ...d.ui, home: { ...d.ui.home, heroForeground: e.target.value } },
                  }))
                }
              />
            </label>
          </div>
        );
      }
      if (focus === "shorts") {
        return (
          <label className="block text-xs text-white/85">
            <span className="mb-1 block text-white/55">خلفية رف Shorts</span>
            <input
              type="color"
              className="h-8 w-full cursor-pointer rounded border border-white/10"
              value={hm.shortsBackground?.startsWith("#") ? hm.shortsBackground.slice(0, 7) : "#000000"}
              onChange={(e) =>
                onApply((d) => ({
                  ...d,
                  ui: { ...d.ui, home: { ...d.ui.home, shortsBackground: e.target.value } },
                }))
              }
            />
          </label>
        );
      }
      if (focus === "map") {
        return (
          <label className="block text-xs text-white/85">
            <span className="mb-1 block text-white/55">خلفية قسم الخريطة</span>
            <input
              type="color"
              className="h-8 w-full cursor-pointer rounded border border-white/10"
              value={hm.mapBackground?.startsWith("#") ? hm.mapBackground.slice(0, 7) : "#000000"}
              onChange={(e) =>
                onApply((d) => ({
                  ...d,
                  ui: { ...d.ui, home: { ...d.ui.home, mapBackground: e.target.value } },
                }))
              }
            />
          </label>
        );
      }
      return (
        <div className="space-y-3 text-xs text-white/55">
          <div>
            <p className="mb-1 text-white/75">ثيم الصفحة الرئيسية (5 ثيمات)</p>
            <select
              className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-xs text-white"
              value={draft.ui.home.theme}
              onChange={(e) =>
                onApply((d) => ({
                  ...d,
                  ui: { ...d.ui, home: { ...d.ui.home, theme: e.target.value as typeof d.ui.home.theme } },
                }))
              }
            >
              {HOME_THEME_PRESETS.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label} - {t.note}
                </option>
              ))}
            </select>
          </div>
          <p>اختر منطقةً في المعاينة أو اسحب الأقسام لإعادة ترتيب ظهور الفيديوهات والخريطة على الصفحة الرئيسية.</p>
        </div>
      );
    }

    if (page === "discover") {
      return (
        <div className="space-y-3 text-xs text-white/60">
          <p className="text-[11px] text-white/75">اختيار ثيم صفحة الوكلاء/الوكالات (5 ثيمات).</p>
          <DemoPicker
            items={DISCOVER_THEME_PRESETS}
            value={draft.ui.discover.theme}
            onPick={(key) =>
              onApply((d) => ({
                ...d,
                ui: { ...d.ui, discover: { ...d.ui.discover, theme: key as typeof d.ui.discover.theme } },
              }))
            }
          />
          <label className="block">
            <span className="mb-1 block text-[11px] text-white/70">لون خلفية الاكتشاف</span>
            <input
              type="color"
              className="h-9 w-full cursor-pointer rounded border border-white/10"
              value={draft.ui.discover.pageBackground?.startsWith("#") ? draft.ui.discover.pageBackground.slice(0, 7) : "#0f172a"}
              onChange={(e) =>
                onApply((d) => ({
                  ...d,
                  ui: { ...d.ui, discover: { ...d.ui.discover, pageBackground: e.target.value } },
                }))
              }
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] text-white/70">لون تمييز الكروت</span>
            <input
              type="color"
              className="h-9 w-full cursor-pointer rounded border border-white/10"
              value={draft.ui.discover.cardAccent?.startsWith("#") ? draft.ui.discover.cardAccent.slice(0, 7) : "#38bdf8"}
              onChange={(e) =>
                onApply((d) => ({
                  ...d,
                  ui: { ...d.ui, discover: { ...d.ui.discover, cardAccent: e.target.value } },
                }))
              }
            />
          </label>
        </div>
      );
    }
    if (page === "profile") {
      return (
        <div className="space-y-3 text-xs text-white/60">
          <p className="text-[11px] text-white/75">ثيم صفحة البروفايل (5 ثيمات احترافية).</p>
          <DemoPicker
            items={PROFILE_THEME_PRESETS}
            value={draft.ui.profile.theme}
            onPick={(key) =>
              onApply((d) => ({
                ...d,
                ui: { ...d.ui, profile: { ...d.ui.profile, theme: key as typeof d.ui.profile.theme } },
              }))
            }
          />
          <label className="block">
            <span className="mb-1 block text-[11px] text-white/70">خلفية لوحة البروفايل</span>
            <input
              type="color"
              className="h-9 w-full cursor-pointer rounded border border-white/10"
              value={draft.ui.profile.panelBackground?.startsWith("#") ? draft.ui.profile.panelBackground.slice(0, 7) : "#111827"}
              onChange={(e) =>
                onApply((d) => ({
                  ...d,
                  ui: { ...d.ui, profile: { ...d.ui.profile, panelBackground: e.target.value } },
                }))
              }
            />
          </label>
        </div>
      );
    }
    if (page === "user") {
      return (
        <div className="space-y-3 text-xs text-white/60">
          <p className="text-[11px] text-white/75">ثيم صفحات المستخدم العامة (5 خيارات).</p>
          <DemoPicker
            items={USER_THEME_PRESETS}
            value={draft.ui.user.theme}
            onPick={(key) =>
              onApply((d) => ({
                ...d,
                ui: { ...d.ui, user: { ...d.ui.user, theme: key as typeof d.ui.user.theme } },
              }))
            }
          />
          <label className="block">
            <span className="mb-1 block text-[11px] text-white/70">خلفية صفحات المستخدم</span>
            <input
              type="color"
              className="h-9 w-full cursor-pointer rounded border border-white/10"
              value={draft.ui.user.pageBackground?.startsWith("#") ? draft.ui.user.pageBackground.slice(0, 7) : "#0b1020"}
              onChange={(e) =>
                onApply((d) => ({
                  ...d,
                  ui: { ...d.ui, user: { ...d.ui.user, pageBackground: e.target.value } },
                }))
              }
            />
          </label>
        </div>
      );
    }
    if (page === "video") {
      return (
        <div className="space-y-3 text-xs text-white/60">
          <p className="text-[11px] text-white/75">ثيم بطاقات الفيديو (5 ثيمات).</p>
          <DemoPicker
            items={VIDEO_THEME_PRESETS}
            value={draft.ui.videoCard.theme}
            onPick={(key) =>
              onApply((d) => ({
                ...d,
                ui: { ...d.ui, videoCard: { ...d.ui.videoCard, theme: key as typeof d.ui.videoCard.theme } },
              }))
            }
          />
          <label className="block">
            <span className="mb-1 block text-[11px] text-white/70">لون تظليل البطاقة</span>
            <input
              type="color"
              className="h-9 w-full cursor-pointer rounded border border-white/10"
              value={draft.ui.videoCard.cardTint?.startsWith("#") ? draft.ui.videoCard.cardTint.slice(0, 7) : "#6366f1"}
              onChange={(e) =>
                onApply((d) => ({
                  ...d,
                  ui: { ...d.ui, videoCard: { ...d.ui.videoCard, cardTint: e.target.value } },
                }))
              }
            />
          </label>
        </div>
      );
    }
    return null;
  })();

  const canvas = (() => {
    if (page === "home") {
      return (
        <div
          className="relative mx-auto max-w-3xl space-y-2 rounded-2xl border border-white/10 bg-black/30 p-4"
          style={appearanceToCssVars(draft) as React.CSSProperties}
        >
          <p className="text-center text-[10px] font-semibold uppercase tracking-wider text-white/40">معاينة الصفحة الرئيسية</p>
          {homeSections.map((key) => {
            const label = SECTION_AR[key];
            const isGrid = key === "grid_top" || key === "grid_rest";
            const isHero = key === "hero_filters";
            const sel =
              key === "hero_filters"
                ? "hero"
                : key === "grid_top" || key === "grid_rest"
                  ? "grid"
                  : key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFocus(sel)}
                className={[
                  "relative w-full rounded-xl border-2 p-4 text-left transition",
                  focus === sel || (isGrid && focus === "grid")
                    ? "border-indigo-400 bg-indigo-500/10"
                    : "border-white/10 bg-white/[0.03] hover:border-white/25",
                ].join(" ")}
              >
                <span className="text-xs font-semibold text-white">{label}</span>
                {isGrid ? (
                  <div className={`mt-2 ${gridPreviewClass}`}>
                    <div className="aspect-video rounded-lg bg-white/10" />
                    <div className="aspect-video rounded-lg bg-white/10" />
                    <div className="aspect-video rounded-lg bg-white/10" />
                  </div>
                ) : null}
                {key === "shorts" ? (
                  <div className="mt-2 flex gap-2">
                    <div className="h-24 w-16 rounded-md bg-white/10" />
                    <div className="h-24 w-16 rounded-md bg-white/10" />
                  </div>
                ) : null}
                {key === "map" ? <div className="mt-2 h-24 rounded-lg bg-emerald-900/30" /> : null}
                {isHero ? <div className="mt-2 h-8 rounded bg-white/10" /> : null}
              </button>
            );
          })}
          <div className="border-t border-white/10 pt-3">
            <p className="mb-2 text-[10px] font-semibold text-white/45">ترتيب الأقسام (سحب)</p>
            <ul className="space-y-1">
              {homeSections.map((id, index) => (
                <li
                  key={id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", String(index))}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const from = Number(e.dataTransfer.getData("text/plain"));
                    if (!Number.isFinite(from)) return;
                    moveHome(from, index);
                  }}
                  className="flex cursor-grab items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-[11px] text-white/80"
                >
                  <GripVertical className="h-3.5 w-3.5 shrink-0 text-white/35" />
                  {SECTION_AR[id]}
                </li>
              ))}
            </ul>
          </div>
        </div>
      );
    }
    if (page === "profile" || page === "discover" || page === "video" || page === "user") {
      return (
        <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-black/30 p-4">
          <SiteLookLivePreview draft={draft} activePage={page} />
        </div>
      );
    }
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-white/10 bg-black/30 p-4">
        <SiteLookLivePreview draft={draft} activePage={page} />
      </div>
    );
  })();

  return createPortal(
    <div className="fixed inset-0 z-[300] flex flex-col bg-[#07070c]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <Monitor className="h-5 w-5 text-indigo-400" />
          <h2 className="text-sm font-bold text-white">محرّر مرئي — معاينة مباشرة</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-2 py-1.5 text-xs text-white/80 disabled:opacity-40"
          >
            <Undo2 className="h-3.5 w-3.5" />
            تراجع
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-2 py-1.5 text-xs text-white/80 disabled:opacity-40"
          >
            <Redo2 className="h-3.5 w-3.5" />
            إعادة
          </button>
          <button
            type="button"
            onClick={onResetAll}
            className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-xs text-amber-100"
          >
            تراجع عن الكل
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white"
          >
            <X className="h-3.5 w-3.5" />
            إغلاق
          </button>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <nav className="w-44 shrink-0 border-r border-white/10 p-3">
          <ul className="space-y-1 text-xs">
            {(
              [
                ["home", "الرئيسية"],
                ["discover", "اكتشاف"],
                ["profile", "بروفايل"],
                ["user", "المستخدم"],
                ["video", "بطاقة فيديو"],
                ["theme", "ألوان وخط"],
              ] as const
            ).map(([k, lab]) => (
              <li key={k}>
                <button
                  type="button"
                  onClick={() => {
                    setPage(k);
                    setFocus(k === "theme" ? "theme" : null);
                    if (k === "home") return;
                    if (k === "discover") setFocus("discover");
                    if (k === "profile") setFocus("profile");
                    if (k === "video") setFocus("video");
                    if (k === "user") setFocus("user");
                  }}
                  className={[
                    "w-full rounded-lg px-2 py-2 text-right transition",
                    page === k ? "bg-indigo-500/20 text-white" : "text-white/65 hover:bg-white/5",
                  ].join(" ")}
                >
                  {lab}
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => {
              setPage("home");
              setFocus("hero");
            }}
            className="mt-4 flex w-full items-center gap-2 rounded-lg border border-white/10 px-2 py-2 text-[11px] text-white/60"
          >
            <Palette className="h-3.5 w-3.5" />
            ابدأ من الهيرو
          </button>
        </nav>
        <div className="min-w-0 flex-1 overflow-y-auto p-4">{canvas}</div>
        <aside className="w-72 shrink-0 border-l border-white/10 p-4">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-indigo-300/90">خصائص العنصر</h3>
          {inspector}
        </aside>
      </div>
    </div>,
    document.body
  );
}
