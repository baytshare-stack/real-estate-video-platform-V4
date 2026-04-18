import AdsManager from "@/components/admin/AdsManager";
import AdminUserAdsModeration from "@/components/admin/AdminUserAdsModeration";

export default function AdminAdsPage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-white">Ads</h1>
        <p className="mt-1 text-sm text-white/60">
          Global platform inventory plus full advertiser ad moderation. User creatives require approval before they run.
        </p>
      </div>
      <AdsManager />
      <AdminUserAdsModeration />
    </div>
  );
}

