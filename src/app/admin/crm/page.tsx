"use client";

import * as React from "react";

type UserRole = "USER" | "AGENT" | "AGENCY";
type CrmStatus = "LEAD" | "ACTIVE" | "INACTIVE";

type CrmUserRow = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  createdAt: string;
  crmStatus: CrmStatus;
  crmNotes: string | null;
};

type AdminAdLeadRow = {
  id: string;
  adId: string;
  videoId: string;
  videoTitle: string;
  agentId: string;
  agentName: string;
  agentEmail: string;
  name: string;
  phone: string;
  source: "AD" | "VIDEO";
  createdAt: string;
};

function roleLabel(role: UserRole) {
  if (role === "USER") return "User";
  if (role === "AGENT") return "Agent";
  return "Agency";
}

function statusLabel(status: CrmStatus) {
  if (status === "LEAD") return "Lead";
  if (status === "ACTIVE") return "Active";
  return "Inactive";
}

function statusPillClass(status: CrmStatus) {
  switch (status) {
    case "ACTIVE":
      return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
    case "INACTIVE":
      return "border-amber-400/20 bg-amber-500/10 text-amber-200";
    default:
      return "border-indigo-400/20 bg-indigo-500/10 text-indigo-200";
  }
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

type ContactEvent = {
  date: string;
  channel: "Call" | "Email" | "WhatsApp";
  summary: string;
};

function getMockContactHistory(userId: string): ContactEvent[] {
  // Mock data only (no persistence), as requested.
  // We make it deterministic-ish by using the id's hash.
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) % 1000;
  const dayOffset = hash % 21; // last ~3 weeks

  const base = new Date();
  const mk = (deltaDays: number, channel: ContactEvent["channel"], summary: string) => {
    const d = new Date(base.getTime() - deltaDays * 24 * 60 * 60 * 1000);
    return { date: d.toISOString(), channel, summary };
  };

  return [
    mk(2 + dayOffset, "Call", "Intro call completed. Discussed budget and timeline."),
    mk(7 + (dayOffset % 5), "WhatsApp", "Sent property shortlist and availability options."),
    mk(12 + (dayOffset % 7), "Email", "Shared a tailored deck and next steps."),
  ];
}

export default function AdminCrmPage() {
  const [tab, setTab] = React.useState<"users" | "agents" | "agencies">("users");

  const [rows, setRows] = React.useState<CrmUserRow[]>([]);
  const [adLeads, setAdLeads] = React.useState<AdminAdLeadRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string>("");

  const [selected, setSelected] = React.useState<CrmUserRow | null>(null);
  const [modalStatus, setModalStatus] = React.useState<CrmStatus>("LEAD");
  const [modalNotes, setModalNotes] = React.useState<string>("");
  const [saving, setSaving] = React.useState(false);

  const role: UserRole = tab === "users" ? "USER" : tab === "agents" ? "AGENT" : "AGENCY";

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("role", role);
      const res = await fetch(`/api/admin/crm?${params.toString()}`, { cache: "no-store" });
      const data = (await res.json()) as { users?: CrmUserRow[]; adLeads?: AdminAdLeadRow[]; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to load CRM.");
      setRows(data.users || []);
      setAdLeads(data.adLeads || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load CRM.");
    } finally {
      setLoading(false);
    }
  }, [role]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const openModal = (row: CrmUserRow) => {
    setSelected(row);
    setModalStatus(row.crmStatus);
    setModalNotes(row.crmNotes || "");
  };

  const closeModal = () => {
    if (saving) return;
    setSelected(null);
    setModalStatus("LEAD");
    setModalNotes("");
  };

  const saveProfile = async () => {
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/crm/users/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crmStatus: modalStatus, crmNotes: modalNotes.trim() || null }),
      });
      const data = (await res.json()) as { ok?: true; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to save CRM profile.");
      await load();
      closeModal();
    } catch (e: any) {
      setError(e?.message || "Failed to save CRM profile.");
    } finally {
      setSaving(false);
    }
  };

  const history = selected ? getMockContactHistory(selected.id) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">CRM</h1>
          <p className="mt-1 text-sm text-white/60">Manage Users, Agents, and Agencies leads.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab("users")}
          className={[
            "rounded-xl px-4 py-2 text-sm font-medium border transition",
            tab === "users"
              ? "bg-indigo-500/15 border-indigo-400/30 text-white"
              : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white",
          ].join(" ")}
        >
          Users
        </button>
        <button
          type="button"
          onClick={() => setTab("agents")}
          className={[
            "rounded-xl px-4 py-2 text-sm font-medium border transition",
            tab === "agents"
              ? "bg-indigo-500/15 border-indigo-400/30 text-white"
              : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white",
          ].join(" ")}
        >
          Agents
        </button>
        <button
          type="button"
          onClick={() => setTab("agencies")}
          className={[
            "rounded-xl px-4 py-2 text-sm font-medium border transition",
            tab === "agencies"
              ? "bg-indigo-500/15 border-indigo-400/30 text-white"
              : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white",
          ].join(" ")}
        >
          Agencies
        </button>
        <button
          type="button"
          onClick={() => void load()}
          className="ml-auto rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          Refresh
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        <div className="overflow-x-auto">
          <table className="min-w-[1000px] w-full text-sm">
            <thead className="bg-white/5">
              <tr className="text-left text-white/70">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Notes</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-white/60" colSpan={7}>
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-white/60" colSpan={7}>
                    No CRM records found.
                  </td>
                </tr>
              ) : (
                rows.map((u) => (
                  <tr key={u.id} className="text-white/80 align-top">
                    <td className="px-4 py-3 font-medium text-white">{u.fullName}</td>
                    <td className="px-4 py-3 text-white/70">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/70">
                        {roleLabel(u.role)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={[
                          "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
                          statusPillClass(u.crmStatus),
                        ].join(" ")}
                      >
                        {statusLabel(u.crmStatus)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-[360px] text-white/70 line-clamp-2">
                        {u.crmNotes ? u.crmNotes : <span className="text-white/40">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white/60">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openModal(u)}
                        className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
                      >
                        Edit CRM
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        <div className="border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">Ad Leads</h2>
          <p className="mt-1 text-xs text-white/60">Linked with adId, videoId, and agentId.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full text-sm">
            <thead className="bg-white/5">
              <tr className="text-left text-white/70">
                <th className="px-4 py-3 font-medium">Lead</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Ad</th>
                <th className="px-4 py-3 font-medium">Video</th>
                <th className="px-4 py-3 font-medium">Agent</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {adLeads.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-white/60" colSpan={6}>
                    No ad leads yet.
                  </td>
                </tr>
              ) : (
                adLeads.map((l) => (
                  <tr key={l.id} className="text-white/80">
                    <td className="px-4 py-3">{l.name}</td>
                    <td className="px-4 py-3">{l.phone}</td>
                    <td className="px-4 py-3 font-mono text-xs">{l.adId}</td>
                    <td className="px-4 py-3">
                      <div className="text-white">{l.videoTitle}</div>
                      <div className="font-mono text-xs text-white/50">{l.videoId}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-white">{l.agentName}</div>
                      <div className="font-mono text-xs text-white/50">{l.agentId}</div>
                    </td>
                    <td className="px-4 py-3 text-white/60">{formatDate(l.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeModal}
          />

          <div className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0f0f0f] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-white truncate">{selected.fullName}</h2>
                <p className="mt-1 text-sm text-white/60 truncate">{selected.email}</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-[1fr_1.1fr] gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <h3 className="text-sm font-semibold text-white">Lead details</h3>

                <div className="mt-3 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Status
                    </label>
                    <select
                      value={modalStatus}
                      onChange={(e) => setModalStatus(e.target.value as CrmStatus)}
                      className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white outline-none transition focus-visible:border-indigo-400/60 focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                    >
                      <option value="LEAD">Lead</option>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Notes
                    </label>
                    <textarea
                      value={modalNotes}
                      onChange={(e) => setModalNotes(e.target.value)}
                      rows={6}
                      placeholder="Add internal notes…"
                      className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-white/35 outline-none transition focus-visible:border-indigo-400/60 focus-visible:ring-2 focus-visible:ring-indigo-500/40 resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => void saveProfile()}
                      disabled={saving}
                      className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <h3 className="text-sm font-semibold text-white">Contact history (mock)</h3>
                <p className="mt-1 text-xs text-white/50">
                  This timeline is mocked for now.
                </p>

                <div className="mt-3 space-y-3">
                  {history.map((ev, idx) => (
                    <div key={`${ev.date}-${idx}`} className="flex gap-3">
                      <div className="mt-0.5 h-2.5 w-2.5 rounded-full bg-indigo-400/60" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-medium text-white/80">{ev.channel}</p>
                          <p className="text-xs text-white/50">{formatDate(ev.date)}</p>
                        </div>
                        <p className="mt-1 text-sm text-white/70 leading-snug">
                          {ev.summary}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}


