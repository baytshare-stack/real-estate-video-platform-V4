import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

function buildQuery(query: Record<string, string | undefined>, page: number): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === "") continue;
    u.set(k, v);
  }
  u.set("page", String(page));
  const s = u.toString();
  return s ? `?${s}` : "";
}

export default function DiscoverPagination({
  basePath,
  total,
  page,
  pageSize,
  query,
}: {
  basePath: string;
  total: number;
  page: number;
  pageSize: number;
  query: Record<string, string | undefined>;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const qForPage = (p: number) => `${basePath}${buildQuery(query, p)}`;

  if (totalPages <= 1) return null;

  return (
    <nav
      className="mt-10 flex flex-wrap items-center justify-center gap-2"
      aria-label="Pagination"
    >
      <Link
        href={qForPage(page - 1)}
        aria-disabled={!hasPrev}
        className={`inline-flex items-center gap-1 rounded-xl border border-white/10 px-3 py-2 text-sm font-medium ${
          hasPrev
            ? "text-white hover:bg-white/10"
            : "pointer-events-none text-white/30"
        }`}
      >
        <ChevronLeft className="h-4 w-4" />
        Previous
      </Link>
      <span className="px-3 text-sm text-white/50">
        Page <span className="font-semibold text-white/90">{page}</span> of{" "}
        <span className="font-semibold text-white/90">{totalPages}</span>
      </span>
      <Link
        href={qForPage(page + 1)}
        aria-disabled={!hasNext}
        className={`inline-flex items-center gap-1 rounded-xl border border-white/10 px-3 py-2 text-sm font-medium ${
          hasNext
            ? "text-white hover:bg-white/10"
            : "pointer-events-none text-white/30"
        }`}
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </Link>
    </nav>
  );
}
