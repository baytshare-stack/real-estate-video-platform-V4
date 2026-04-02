import type { Metadata } from "next";
import AgencyCard from "@/components/discover/AgencyCard";
import DiscoverListDebug from "@/components/discover/DiscoverListDebug";
import DiscoverFilters from "@/components/discover/DiscoverFilters";
import DiscoverPagination from "@/components/discover/DiscoverPagination";
import PageHeader from "@/components/PageHeader";
import {
  DISCOVER_PAGE_SIZE,
  listDiscoverUsers,
  parseDiscoverParams,
} from "@/lib/discover-queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Real estate agencies | BytakTube",
  description: "Discover agencies, offices, and property marketing teams.",
};

export default async function AgenciesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const params = parseDiscoverParams(sp);
  const { items, total, page, pageSize } = await listDiscoverUsers("AGENCY", params);

  const filterValues = {
    q: sp.q ? String(Array.isArray(sp.q) ? sp.q[0] : sp.q) : "",
    city: sp.city ? String(Array.isArray(sp.city) ? sp.city[0] : sp.city) : "",
    country: sp.country ? String(Array.isArray(sp.country) ? sp.country[0] : sp.country) : "",
    verified: Boolean(params.verifiedOnly),
    topRated: Boolean(params.topRated),
    sort: params.sort ?? "featured",
  };

  const paginationQuery: Record<string, string | undefined> = {
    q: filterValues.q || undefined,
    city: filterValues.city || undefined,
    country: filterValues.country || undefined,
    sort: filterValues.sort,
    verified: params.verifiedOnly ? "1" : undefined,
    topRated: params.topRated ? "1" : undefined,
  };

  return (
    <div className="min-h-screen p-4 pb-24 md:p-6 md:pb-8 max-w-[2000px] mx-auto">
      <DiscoverListDebug page="agencies" roleLabel="AGENCY" total={total} shown={items.length} />
      <PageHeader
        iconName="Building2"
        iconColor="text-violet-400"
        title="Agencies & brokerages"
        subtitle="Explore companies showcasing properties on video — filter by region, trust, and performance."
      />

      <div className="mt-6 space-y-8">
        <DiscoverFilters
          basePath="/agencies"
          values={filterValues}
          title="Search & filters"
        />

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] py-20 text-center text-white/50">
            No agencies match your filters yet. Try broadening your search.
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {items.map((agency) => (
              <li key={agency.id}>
                <AgencyCard agency={agency} />
              </li>
            ))}
          </ul>
        )}

        <DiscoverPagination
          basePath="/agencies"
          total={total}
          page={page}
          pageSize={pageSize}
          query={paginationQuery}
        />

        <p className="text-center text-xs text-white/35">
          Showing {items.length} of {total} agencies · {DISCOVER_PAGE_SIZE} per page
        </p>
      </div>
    </div>
  );
}
