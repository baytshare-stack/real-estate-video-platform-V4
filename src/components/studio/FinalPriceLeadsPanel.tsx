"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, Phone, Download } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageProvider";
import { locales, type Locale } from "@/i18n/config";
import { telHref, whatsappToNumberUrl } from "@/lib/phoneLinks";

export type FinalPriceLeadRow = {
  id: string;
  visitorName: string;
  visitorPhone: string;
  specifications: string;
  listedPriceLabel: string;
  videoId: string;
  videoTitle: string;
  createdAt: string;
};

function csvEscape(cell: string): string {
  if (/[",\n\r]/.test(cell)) return `"${cell.replace(/"/g, '""')}"`;
  return cell;
}

function useLocalePrefix(): string {
  const pathname = usePathname() || "/";
  const first = pathname.split("/").filter(Boolean)[0];
  return first && locales.includes(first as Locale) ? `/${first}` : "";
}

export default function FinalPriceLeadsPanel({ leads }: { leads: FinalPriceLeadRow[] }) {
  const { t } = useTranslation();
  const localePrefix = useLocalePrefix();

  const watchPath = (videoId: string) => `${localePrefix}/watch/${videoId}`;

  const exportCsv = () => {
    const headers = [
      t("studio", "crm.finalPriceColName"),
      t("studio", "crm.finalPriceColPhone"),
      t("studio", "crm.finalPriceColSpecs"),
      t("studio", "crm.finalPriceColPrice"),
      t("studio", "crm.finalPriceColVideo"),
      t("studio", "crm.finalPriceColDate"),
    ];
    const lines = [headers.map(csvEscape).join(",")];
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    for (const row of leads) {
      const fullVideoUrl = `${origin}${watchPath(row.videoId)}`;
      lines.push(
        [
          csvEscape(row.visitorName),
          csvEscape(row.visitorPhone),
          csvEscape(row.specifications),
          csvEscape(row.listedPriceLabel),
          csvEscape(fullVideoUrl),
          csvEscape(new Date(row.createdAt).toISOString()),
        ].join(",")
      );
    }
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `final-price-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const waMsg = (row: FinalPriceLeadRow) =>
    t("studio", "crm.finalPriceWaMessage")
      .replace("{{name}}", row.visitorName)
      .replace("{{title}}", row.videoTitle);

  if (!leads.length) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-gray-900/40 p-6 text-center text-sm text-gray-500">
        {t("studio", "crm.finalPriceEmpty")}
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-emerald-500/20 bg-gray-900/50 p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">{t("studio", "crm.finalPriceSectionTitle")}</h2>
          <p className="mt-0.5 text-xs text-gray-400">{t("studio", "crm.finalPriceSectionSubtitle")}</p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-600/15 px-4 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-600/25"
        >
          <Download className="h-4 w-4" />
          {t("studio", "crm.finalPriceExport")}
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
        <table className="min-w-[900px] w-full text-left text-sm text-gray-200">
          <thead className="border-b border-white/10 bg-white/[0.04] text-xs uppercase tracking-wide text-gray-400">
            <tr>
              <th className="px-3 py-3 font-medium">{t("studio", "crm.finalPriceColVideo")}</th>
              <th className="px-3 py-3 font-medium">{t("studio", "crm.finalPriceColName")}</th>
              <th className="px-3 py-3 font-medium">{t("studio", "crm.finalPriceColPhone")}</th>
              <th className="px-3 py-3 font-medium">{t("studio", "crm.finalPriceColSpecs")}</th>
              <th className="px-3 py-3 font-medium">{t("studio", "crm.finalPriceColPrice")}</th>
              <th className="px-3 py-3 font-medium">{t("studio", "crm.finalPriceColDate")}</th>
              <th className="px-3 py-3 font-medium text-end">{t("studio", "crm.finalPriceColActions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {leads.map((row) => (
              <tr key={row.id} className="bg-transparent hover:bg-white/[0.02]">
                <td className="px-3 py-3 align-top">
                  <a
                    href={watchPath(row.videoId)}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-blue-400 hover:underline line-clamp-2"
                  >
                    {row.videoTitle}
                  </a>
                  <p className="mt-1 font-mono text-[10px] text-gray-500">{row.videoId}</p>
                </td>
                <td className="px-3 py-3 align-top font-medium text-white">{row.visitorName}</td>
                <td className="px-3 py-3 align-top tabular-nums text-gray-300">{row.visitorPhone}</td>
                <td className="max-w-[240px] px-3 py-3 align-top text-xs text-gray-400 line-clamp-4" title={row.specifications}>
                  {row.specifications}
                </td>
                <td className="px-3 py-3 align-top tabular-nums text-amber-200/90">{row.listedPriceLabel}</td>
                <td className="px-3 py-3 align-top text-xs text-gray-500 whitespace-nowrap">
                  {new Date(row.createdAt).toLocaleString()}
                </td>
                <td className="px-3 py-3 align-top">
                  <div className="flex flex-wrap justify-end gap-2">
                    <a
                      href={whatsappToNumberUrl(row.visitorPhone, waMsg(row))}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg bg-[#25D366]/20 px-2.5 py-1.5 text-xs font-semibold text-[#25D366] hover:bg-[#25D366]/30"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      {t("studio", "crm.finalPriceWhatsapp")}
                    </a>
                    <a
                      href={telHref(row.visitorPhone)}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-white/10"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      {t("studio", "crm.finalPriceCall")}
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
