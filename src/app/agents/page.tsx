import type { Metadata } from "next";
import AgentCard from "@/components/discover/AgentCard";
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
  title: "Find real estate agents | BytakTube",
  description: "Discover verified agents by location, ratings, and listings.",
};

export default async function AgentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const params = parseDiscoverParams(sp);
  const { items, total, page, pageSize } = await listDiscoverUsers("AGENT", params);

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
      <DiscoverListDebug page="agents" roleLabel="AGENT" total={total} shown={items.length} />
      <PageHeader
        iconName="Users"
        iconColor="text-sky-400"
        title="Real estate agents"
        subtitle="Browse professionals by location, ratings, and activity — Airbnb & Zillow inspired discovery."
      />

      <div className="mt-6 space-y-8">
        <DiscoverFilters
          basePath="/agents"
          values={filterValues}
          title="Search & filters"
        />

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] py-20 text-center text-white/50">
            No agents match your filters yet. Try adjusting search or location.
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {items.map((agent) => (
              <li key={agent.id}>
                <AgentCard agent={agent} />
              </li>
            ))}
          </ul>
        )}

        <DiscoverPagination
          basePath="/agents"
          total={total}
          page={page}
          pageSize={pageSize}
          query={paginationQuery}
        />

        <p className="text-center text-xs text-white/35">
          Showing {items.length} of {total} agents · {DISCOVER_PAGE_SIZE} per page
        </p>
      </div>
    </div>
  );
}
