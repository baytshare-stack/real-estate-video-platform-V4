"use client";

import { type LucideIcon } from 'lucide-react';

interface FilterChip {
  label: string;
  value: string;
}

interface PageHeaderProps {
  icon?: LucideIcon;
  iconColor?: string;
  title: string;
  subtitle?: string;
  filters?: FilterChip[];
  activeFilter?: string;
  onFilterChange?: (value: string) => void;
}

export default function PageHeader({
  icon: Icon,
  iconColor = 'text-blue-500',
  title,
  subtitle,
  filters,
  activeFilter,
  onFilterChange,
}: PageHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-1">
        {Icon && <Icon className={`w-7 h-7 ${iconColor}`} />}
        <h1 className="text-2xl font-bold text-white">{title}</h1>
      </div>
      {subtitle && <p className="text-gray-400 text-sm mb-4 ml-1">{subtitle}</p>}

      {filters && filters.length > 0 && (
        <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2 mt-3">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => onFilterChange?.(f.value)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeFilter === f.value
                  ? 'bg-white text-black'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
