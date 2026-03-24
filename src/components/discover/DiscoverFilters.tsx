import { Filter, Search } from "lucide-react";

type FilterValues = {
  q: string;
  city: string;
  country: string;
  verified: boolean;
  topRated: boolean;
  sort: string;
};

export default function DiscoverFilters({
  basePath,
  values,
  title,
}: {
  basePath: "/agents" | "/agencies";
  values: FilterValues;
  title: string;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-5 backdrop-blur-xl">
      <div className="mb-4 flex items-center gap-2 text-white/90">
        <Filter className="h-5 w-5 text-sky-400" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-white/70">{title}</h2>
      </div>
      <form action={basePath} method="get" className="flex flex-col gap-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
          <input
            type="search"
            name="q"
            defaultValue={values.q}
            placeholder="Search by name…"
            className="w-full rounded-xl border border-white/10 bg-black/30 py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-white/35 outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/40"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            name="city"
            defaultValue={values.city}
            placeholder="City"
            className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-sky-500/50"
          />
          <input
            name="country"
            defaultValue={values.country}
            placeholder="Country"
            className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-sky-500/50"
          />
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white/85">
            <input
              type="checkbox"
              name="verified"
              value="1"
              defaultChecked={values.verified}
              className="h-4 w-4 rounded border-white/20 bg-black/40 text-sky-500"
            />
            Verified only
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white/85">
            <input
              type="checkbox"
              name="topRated"
              value="1"
              defaultChecked={values.topRated}
              className="h-4 w-4 rounded border-white/20 bg-black/40 text-sky-500"
            />
            Top rated (4+)
          </label>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1">
            <label htmlFor={`sort-${basePath}`} className="text-xs font-medium text-white/50">
              Sort
            </label>
            <select
              id={`sort-${basePath}`}
              name="sort"
              defaultValue={values.sort}
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500/50"
            >
              <option value="featured">Featured → rating → newest</option>
              <option value="rating">Highest rated</option>
              <option value="newest">Newest</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500"
            >
              Apply filters
            </button>
            <a
              href={basePath}
              className="rounded-xl border border-white/15 px-5 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/5"
            >
              Reset
            </a>
          </div>
        </div>
      </form>
    </section>
  );
}
