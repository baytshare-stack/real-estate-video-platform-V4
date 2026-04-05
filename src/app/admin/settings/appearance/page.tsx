import Link from "next/link";
import SiteAppearanceEditor from "@/components/admin/SiteAppearanceEditor";

export default function AdminSiteAppearancePage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Site look & layout</h1>
          <p className="mt-1 text-sm text-white/60">
            Theme the public video platform: colors, fonts, logo, and ordered navigation blocks.
          </p>
        </div>
        <Link
          href="/admin/settings"
          className="text-sm text-indigo-300 underline-offset-2 hover:text-white hover:underline"
        >
          ← General settings
        </Link>
      </div>

      <SiteAppearanceEditor />
    </div>
  );
}
