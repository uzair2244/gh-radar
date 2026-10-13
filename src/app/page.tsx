import { Suspense } from "react";
import Link from "next/link";
import { FilterPanel } from "@/components/FilterPanel";
import { RepoCard } from "@/components/RepoCard";
import { About, SiteFooter } from "@/components/SiteFooter";
import { compactNumber, relativeTime } from "@/lib/format";
import { connectionInfo } from "@/lib/mongodb";
import {
  countAllRepos,
  getFacets,
  getRepos,
  getRunInfo,
  getStats,
  parseFilters,
} from "@/lib/queries";
import type { Filters } from "@/lib/types";

// Never statically prerender: every request must hit MongoDB so the listing
// reflects what the collector most recently stored.
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function pageHref(filters: Filters, page: number): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.languages.length) params.set("language", filters.languages.join(","));
  if (filters.licenses.length) params.set("license", filters.licenses.join(","));
  if (filters.topics.length) params.set("topic", filters.topics.join(","));
  if (filters.minStars > 0) params.set("stars", String(filters.minStars));
  if (filters.dateFrom) params.set("from", filters.dateFrom);
  if (filters.dateTo) params.set("to", filters.dateTo);
  if (filters.sort !== "stars") params.set("sort", filters.sort);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

function Pagination({
  page,
  pages,
  filters,
}: {
  page: number;
  pages: number;
  filters: Filters;
}) {
  if (pages <= 1) return null;

  const windowStart = Math.max(1, page - 2);
  const windowEnd = Math.min(pages, windowStart + 4);
  const numbers = Array.from(
    { length: windowEnd - windowStart + 1 },
    (_, index) => windowStart + index,
  );

  const base =
    "rounded-lg border border-edge px-3 py-1.5 font-mono text-[0.75rem] text-ink-dim transition-colors hover:border-signal/50 hover:text-signal";

  return (
    <nav className="mt-10 flex flex-wrap items-center justify-center gap-1.5" aria-label="Pagination">
      {page > 1 && (
        <Link href={pageHref(filters, page - 1)} className={base}>
          ← prev
        </Link>
      )}
      {numbers.map((number) => (
        <Link
          key={number}
          href={pageHref(filters, number)}
          aria-current={number === page ? "page" : undefined}
          className={
            number === page
              ? "rounded-lg border border-signal/60 bg-signal/15 px-3 py-1.5 font-mono text-[0.75rem] text-signal"
              : base
          }
        >
          {number}
        </Link>
      ))}
      {page < pages && (
        <Link href={pageHref(filters, page + 1)} className={base}>
          next →
        </Link>
      )}
    </nav>
  );
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const filters = parseFilters(params);

  const [result, facets, run, totalAll, stats] = await Promise.all([
    getRepos(filters),
    getFacets(filters),
    getRunInfo(),
    countAllRepos(),
    getStats(),
  ]);

  const conn = connectionInfo();
  const healthy = run?.status === "ok";

  return (
    <main className="mx-auto w-full max-w-[1500px] px-4 pb-24 pt-8 sm:px-6 lg:px-10">
      <header className="mb-9">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="relative flex h-9 w-9 items-center justify-center" aria-hidden="true">
                <span className="absolute inset-0 rounded-full border border-signal/25" />
                <span className="absolute inset-0 rounded-full border border-transparent border-t-signal/70 radar-sweep" />
                <span className="h-1.5 w-1.5 rounded-full bg-signal pulse-dot" />
              </span>
              <div>
                <h1 className="font-mono text-xl font-semibold tracking-tight text-ink sm:text-2xl">
                  GH<span className="text-signal">·</span>RADAR
                </h1>
                <p className="text-[0.78rem] text-ink-dim">
                  New open-source developer tools, the day they appear.
                </p>
              </div>
            </div>

            <p className="mt-4 max-w-2xl text-[0.88rem] leading-relaxed text-ink-dim">
              Most tools worth adopting surface in the noise before anyone
              writes about them. GH Radar sweeps newly created repositories
              every day and keeps the ones that look like real developer
              tooling, so you can filter the flood down to the handful
              actually worth a look.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 font-mono text-[0.7rem]">
            <span className="chip">
              <span
                className={`h-1.5 w-1.5 rounded-full ${healthy ? "bg-signal" : "bg-warn"}`}
                aria-hidden="true"
              />
              collector {run?.status ?? "no runs"}
            </span>
            {run?.window && <span className="chip">window {run.window}</span>}
            {typeof run?.repos_new === "number" && (
              <span className="chip">+{run.repos_new} new</span>
            )}
            {run?.finished_at && (
              <span className="chip text-ink-faint">
                {relativeTime(run.finished_at)}
              </span>
            )}
          </div>
        </div>

        {run?.warnings && run.warnings.length > 0 && (
          <div
            role="status"
            className="mt-5 rounded-xl border border-warn/30 bg-warn/[0.07] px-4 py-3 text-[0.78rem] text-warn"
          >
            <span className="font-semibold">Last run reported {run.warnings.length} warning(s):</span>{" "}
            {run.warnings[0]}
            {run.warnings.length > 1 && " …"}
          </div>
        )}
      </header>

      <div className="mb-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <div className="stat-tile">
          <b>{compactNumber(stats.total)}</b>
          <span>repos indexed</span>
        </div>
        <div className="stat-tile">
          <b className="text-warn">{compactNumber(stats.breakout)}</b>
          <span>breakout</span>
        </div>
        <div className="stat-tile">
          <b className="text-signal">{compactNumber(stats.rising)}</b>
          <span>rising</span>
        </div>
        <div className="stat-tile">
          <b>{compactNumber(stats.gainingTraction)}</b>
          <span>10+ stars</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Suspense fallback={<div className="panel hidden h-96 animate-pulse lg:block" />}>
          <FilterPanel
            facets={facets}
            filters={filters}
            total={result.total}
            totalAll={totalAll}
            dateFilterInert={stats.dateFilterInert}
          />
        </Suspense>

        <section aria-label="Repositories">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="section-label">Repository feed</h2>
            <p className="font-mono text-[0.68rem] text-ink-faint">
              {result.total.toLocaleString()} matching
            </p>
          </div>

          {result.docs.length === 0 ? (
            <div className="panel flex flex-col items-center gap-3 px-6 py-24 text-center">
              <span className="font-mono text-2xl text-ink-faint" aria-hidden="true">
                ⌀
              </span>
              <p className="text-sm text-ink-dim">No repositories match these filters.</p>
              <p className="max-w-sm text-[0.78rem] text-ink-faint">
                Try removing the search text or widening the language and topic
                selections.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {result.docs.map((repo) => (
                  <RepoCard key={repo.repo_id} repo={repo} />
                ))}
              </div>

              <Pagination page={result.page} pages={result.pages} filters={filters} />
            </>
          )}

          <section
            aria-labelledby="how-heading"
            className="panel mt-12 p-5 sm:p-6"
          >
            <h2 id="how-heading" className="section-label mb-3">
              How the signal is scored
            </h2>
            <p className="max-w-3xl text-[0.82rem] leading-relaxed text-ink-dim">
              Every repo carries a <span className="text-signal">potential</span>{" "}
              score combining log-scaled stars and forks, recent commit activity,
              project health, and how deeply it matched the developer-tool
              topics the collector watches. Stars and forks are log-scaled so a
              single outlier cannot flatten everything below it, and forks carry
              their own weight, so a young project people are already building
              on can outrank a more starred one nobody has adopted.
            </p>
            <p className="mt-2 max-w-3xl text-[0.78rem] leading-relaxed text-ink-faint">
              Age is deliberately excluded. Every repo in the collection is
              currently the same age, so a growth rate would carry no information
              and would just rank by raw stars. The weighting is worth revisiting
              once the collector has covered enough days for velocity to mean
              something.
            </p>
          </section>

          <About />
        </section>
      </div>

      <SiteFooter totalAll={totalAll} dbName={conn.db} />
    </main>
  );
}
