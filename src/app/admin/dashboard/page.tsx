import AnalyticsCards from "@/components/admin/AnalyticsCards";
import AdsManager from "@/components/admin/AdsManager";
import CRMPanel from "@/components/admin/CRMPanel";
import UserTable from "@/components/admin/UserTable";
import VideoTable from "@/components/admin/VideoTable";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold text-white">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-white/60">
          A glassy, responsive SaaS control center (mock data; backend-ready structure).
        </p>
      </div>

      <AnalyticsCards />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <UserTable />
        <VideoTable />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <CRMPanel />
        <AdsManager />
      </div>
    </div>
  );
}
