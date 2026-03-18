import { type LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
}

export default function StatCard({ label, value, trend, trendUp, icon: Icon, iconBg, iconColor }: StatCardProps) {
  return (
    <div className="bg-gray-900/80 border border-white/[0.07] rounded-2xl p-6 shadow-xl hover:border-white/15 transition-all">
      <div className="flex items-center justify-between mb-4">
        <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest">{label}</p>
        <div className={`p-2.5 rounded-xl ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>
      <p className="text-4xl font-black text-white mb-2 tabular-nums leading-none">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {trend && (
        <p className={`text-sm font-medium flex items-center gap-1 ${trendUp ? 'text-emerald-400' : 'text-gray-500'}`}>
          {trendUp ? '↑' : '→'} {trend}
        </p>
      )}
    </div>
  );
}
