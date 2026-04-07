import AdsManager from "@/components/admin/AdsManager";

export default function AdminAdsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-white">Ads</h1>
        <p className="mt-1 text-sm text-white/60">
          Targeting, budgets, and lifecycle controls for video ads (admin).
        </p>
      </div>
      <AdsManager />
    </div>
  );
}
