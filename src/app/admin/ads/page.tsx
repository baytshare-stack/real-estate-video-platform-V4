import AdsManager from "@/components/admin/AdsManager";

export default function AdminAdsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-white">Ads</h1>
        <p className="mt-1 text-sm text-white/60">
          Pre-roll / mid-roll video inventory for the watch player. Campaign rows are for advertiser billing only.
        </p>
      </div>
      <AdsManager />
    </div>
  );
}
