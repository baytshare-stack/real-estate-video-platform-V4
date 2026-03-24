"use client";

import * as React from "react";

type CrmStatus = "lead" | "active" | "inactive";
type CrmCategory = "users" | "agents" | "agencies";
type CrmRole = "user" | "agent" | "agency";

type CrmRecord = {
  id: string;
  name: string;
  email: string;
  role: CrmRole;
  createdAt: string;
  status: CrmStatus;
  notes: string;
};

type ContactEvent = {
  date: string;
  channel: "Call" | "Email" | "WhatsApp";
  summary: string;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function statusPillClass(status: CrmStatus) {
  switch (status) {
    case "active":
      return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
    case "inactive":
      return "border-amber-400/20 bg-amber-500/10 text-amber-200";
    default:
      return "border-indigo-400/20 bg-indigo-500/10 text-indigo-200";
  }
}

function statusLabel(status: CrmStatus) {
  if (status === "lead") return "Lead";
  if (status === "active") return "Active";
  return "Inactive";
}

function mockContactHistory(userId: string): ContactEvent[] {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) % 1000;
  const base = new Date();
  const mk = (deltaDays: number, channel: ContactEvent["channel"], summary: string): ContactEvent => ({
    date: new Date(base.getTime() - deltaDays * 24 * 60 * 60 * 1000).toISOString(),
    channel,
    summary,
  });
  const d = hash % 17;
  return [
    mk(1 + d, "Call", "Follow-up call completed. Discussed scheduling and next steps."),
    mk(4 + (d % 4), "WhatsApp", "Sent property shortlist and availability options."),
    mk(9 + (d % 7), "Email", "Shared a tailored offer summary and required documents."),
  ];
}

const MOCK_CRM: CrmRecord[] = [
  {
    id: "crm_1",
    name: "John Doe",
    email: "john@example.com",
    role: "user",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
    status: "lead",
    notes: "Interested in 2-3 bedrooms. Wants viewings this week.",
  },
  {
    id: "crm_2",
    name: "Maged Elwan",
    email: "maged@example.com",
    role: "agent",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 21).toISOString(),
    status: "active",
    notes: "Regular uploads and weekly inquiries. Prefers WhatsApp updates.",
  },
  {
    id: "crm_3",
    name: "Bayt Share",
    email: "baytshare@example.com",
    role: "agency",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 33).toISOString(),
    status: "inactive",
    notes: "Paused campaigns. Waiting for new budget approval.",
  },
];

export default function CRMPanel({
  records,
  onSave,
}: {
  records?: CrmRecord[];
  onSave?: (recordId: string, next: { status: CrmStatus; notes: string }) => Promise<void> | void;
}) {
  const [tab, setTab] = React.useState<CrmCategory>("users");
  const [rows, setRows] = React.useState<CrmRecord[]>(records ?? MOCK_CRM);

  const [selectedId, setSelectedId] = React.useState<string>("");
  const selected = rows.find((r) => r.id === selectedId) ?? null;

  const [modalStatus, setModalStatus] = React.useState<CrmStatus>("lead");
  const [modalNotes, setModalNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setRows(records ?? MOCK_CRM);
  }, [records]);

  React.useEffect(() => {
    if (!selected) return;
    setModalStatus(selected.status);
    setModalNotes(selected.notes ?? "");
  }, [selectedId]);

  const filtered = rows.filter((r) => {
    if (tab === "users") return r.role === "user";
    if (tab === "agents") return r.role === "agent";
    return r.role === "agency";
  });

  const open = (r: CrmRecord) => setSelectedId(r.id);
  const close = () => setSelectedId("");

  const history = selected ? mockContactHistory(selected.id) : [];

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    const prev = rows;
    const nextNotes = modalNotes.trim();
    setRows((p) =>
      p.map((x) =>
        x.id === selected.id ? { ...x, status: modalStatus, notes: nextNotes } : x
      )
    );
    try {
      await onSave?.(selected.id, { status: modalStatus, notes: nextNotes });
      close();
    } catch {
      setRows(prev);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-sm overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-white font-semibold">CRM</h2>
          <p className="text-sm text-white/60 mt-1">Lead status, internal notes, and mock contact history.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {([
            { id: "users", label: "Users" },
            { id: "agents", label: "Agents" },
            { id: "agencies", label: "Agencies" },
          ] as const).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={[
                "rounded-xl px-3 py-2 text-xs font-medium border transition",
                tab === t.id
                  ? "bg-indigo-500/15 border-indigo-400/30 text-white"
                  : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white",
              ].join(" ")}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        <div className="overflow-x-auto">
          <table className="min-w-[780px] w-full text-sm">
            <thead className="bg-white/5 text-white/70">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Notes</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filtered.map((r) => (
                <tr key={r.id} className="text-white/80 align-top">
                  <td className="px-4 py-3 font-medium text-white">{r.name}</td>
                  <td className="px-4 py-3 text-white/70">{r.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={[
                        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
                        statusPillClass(r.status),
                      ].join(" ")}
                    >
                      {statusLabel(r.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="max-w-[320px] text-white/70 line-clamp-2">{r.notes ?? "-"}</div>
                  </td>
                  <td className="px-4 py-3 text-white/60 tabular-nums">{formatDate(r.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => open(r)}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
                    >
                      Edit CRM
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-white/60" colSpan={6}>
                    No CRM records found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />
          <div className="relative w-full max-w-3xl rounded-2xl border border-white/10 bg-[#0f0f0f] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-white truncate">{selected?.name ?? "-"}</h3>
                <p className="mt-1 text-sm text-white/60 truncate">{selected?.email ?? "-"}</p>
              </div>
              <button
                type="button"
                onClick={close}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.2fr]">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <h4 className="text-sm font-semibold text-white">Lead details</h4>
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Status</label>
                    <select
                      value={modalStatus}
                      onChange={(e) => setModalStatus(e.target.value as CrmStatus)}
                      className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white outline-none transition focus-visible:border-indigo-400/60 focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                    >
                      <option value="lead">Lead</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Notes</label>
                    <textarea
                      value={modalNotes}
                      onChange={(e) => setModalNotes(e.target.value)}
                      rows={6}
                      className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-white/35 outline-none transition focus-visible:border-indigo-400/60 focus-visible:ring-2 focus-visible:ring-indigo-500/40 resize-none"
                      placeholder="Internal notes..."
                    />
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void save()}
                      className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <h4 className="text-sm font-semibold text-white">Contact history (mock)</h4>
                <p className="mt-1 text-xs text-white/50">Timeline is mocked for now.</p>
                <div className="mt-3 space-y-3">
                  {history.map((ev, idx) => (
                    <div key={`${ev.date}-${idx}`} className="flex gap-3">
                      <div className="mt-0.5 h-2.5 w-2.5 rounded-full bg-indigo-400/60" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-medium text-white/80">{ev.channel}</p>
                          <p className="text-xs text-white/50">{formatDate(ev.date)}</p>
                        </div>
                        <p className="mt-1 text-sm text-white/70 leading-snug line-clamp-2">{ev.summary}</p>
                      </div>
                    </div>
                  ))}
                  {history.length === 0 ? (
                    <p className="text-sm text-white/60">No history yet.</p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

