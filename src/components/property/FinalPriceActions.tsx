"use client";

import * as React from "react";
import { useTranslation } from "@/i18n/LanguageProvider";

/** Watch page — inline row: price toggle (price inside button when shown) + final-price + trailing (badges). */
export default function FinalPriceActions({
  videoId,
  listPriceLabel,
  trailing,
}: {
  videoId: string;
  listPriceLabel: string;
  trailing?: React.ReactNode;
}) {
  const { t, dir } = useTranslation();
  const [showListPrice, setShowListPrice] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [err, setErr] = React.useState("");

  const btnBase =
    "rounded-lg border border-blue-500/40 bg-blue-600/15 px-3 py-2 text-xs font-semibold text-blue-100 shadow-sm transition hover:bg-blue-600/25 sm:text-sm";

  const openModal = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setErr("");
    setDone(false);
    setModalOpen(true);
  };

  const toggleList = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowListPrice((v) => !v);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const res = await fetch("/api/video/final-price-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ videoId, visitorName: name.trim(), visitorPhone: phone.trim() }),
      });
      const raw = await res.text();
      let data: { error?: string; detail?: string } = {};
      try {
        data = raw ? (JSON.parse(raw) as { error?: string; detail?: string }) : {};
      } catch {
        setErr(raw?.slice(0, 200) || t("finalPrice", "error"));
        return;
      }
      if (!res.ok) {
        const parts = [data.error, data.detail].filter(Boolean);
        setErr(parts.length ? parts.join(" — ") : t("finalPrice", "error"));
        return;
      }
      setDone(true);
      setName("");
      setPhone("");
    } catch {
      setErr(t("finalPrice", "error"));
    } finally {
      setBusy(false);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setDone(false);
    setErr("");
  };

  return (
    <>
      <div
        className="flex w-full flex-wrap items-center gap-2"
        dir={dir}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className={`${btnBase} min-h-[2.5rem] max-w-full shrink-0 sm:max-w-[min(100%,16rem)] ${showListPrice && listPriceLabel ? "tabular-nums text-white" : ""}`}
          onClick={toggleList}
          title={showListPrice ? t("finalPrice", "hideListPrice") : undefined}
        >
          {showListPrice && listPriceLabel ? (
            <span className="block max-w-full truncate text-center text-[11px] font-bold sm:text-sm md:text-base">
              {listPriceLabel}
            </span>
          ) : (
            t("finalPrice", "showListPrice")
          )}
        </button>
        <button type="button" className={`${btnBase} shrink-0`} onClick={openModal}>
          {t("finalPrice", "requestFinalPrice")}
        </button>
        {trailing ? <div className="flex min-w-0 flex-wrap items-center gap-2 text-gray-400">{trailing}</div> : null}
      </div>

      {modalOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-3"
          dir={dir}
          role="dialog"
          aria-modal="true"
          aria-labelledby="final-price-modal-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            aria-label="Close"
            onClick={closeModal}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900 p-5 shadow-2xl">
            <h2 id="final-price-modal-title" className="text-lg font-bold text-white">
              {t("finalPrice", "modalTitle")}
            </h2>

            {done ? (
              <p className="mt-4 text-sm leading-relaxed text-emerald-200/95">{t("finalPrice", "success")}</p>
            ) : (
              <form onSubmit={(e) => void submit(e)} className="mt-4 space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-400">{t("finalPrice", "name")}</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    minLength={2}
                    className="w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">{t("finalPrice", "phone")}</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    minLength={5}
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="+966501234567"
                    className="w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                  />
                  <p className="mt-1.5 text-[11px] leading-snug text-gray-500 sm:text-xs">{t("finalPrice", "phoneCountryHint")}</p>
                </div>
                {err ? <p className="text-sm text-red-400">{err}</p> : null}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-xl border border-gray-600 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
                  >
                    {t("finalPrice", "cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                  >
                    {busy ? t("finalPrice", "sending") : t("finalPrice", "submit")}
                  </button>
                </div>
              </form>
            )}

            {done ? (
              <button
                type="button"
                onClick={closeModal}
                className="mt-5 w-full rounded-xl bg-gray-800 py-2.5 text-sm font-medium text-white hover:bg-gray-700"
              >
                {t("finalPrice", "close")}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
