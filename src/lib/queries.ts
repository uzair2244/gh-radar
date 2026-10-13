import { Filter, Sort } from "mongodb";
import { getDb } from "./mongodb";
import { SCORE_STAGE, TIER_MINS } from "./scoring";
import {
  FacetValue,
  Facets,
  Filters,
  RadarStats,
  RepoDoc,
  RepoResult,
  RunInfo,
} from "./types";

const SORT_KEYS = ["stars", "newest", "forks", "updated", "potential"] as const;
type SortKey = (typeof SORT_KEYS)[number];

/** Dimensions that a facet can be computed independently of. */
type FacetDim = "language" | "license" | "topic";

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readMany(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string[] {
  const raw = params[key];
  if (raw === undefined) return [];
  const values = Array.isArray(raw) ? raw : [raw];
  return values
    .flatMap((value) => String(value).split(","))
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 40);
}

function readOne(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string {
  const raw = params[key];
  return Array.isArray(raw) ? String(raw[0] ?? "") : String(raw ?? "");
}

function readNumber(
  params: Record<string, string | string[] | undefined>,
  key: string,
  fallback: number,
  max: number,
): number {
  const parsed = Number.parseInt(readOne(params, key), 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.min(parsed, max);
}

/** Turn a Next.js searchParams object into a validated filter set. */
export function parseFilters(
  params: Record<string, string | string[] | undefined>,
): Filters {
  const sortRaw = readOne(params, "sort") as SortKey;
  return {
    q: readOne(params, "q").slice(0, 120),
    languages: readMany(params, "language"),
    licenses: readMany(params, "license"),
    topics: readMany(params, "topic"),
    minStars: readNumber(params, "stars", 0, 10_000_000),
    dateFrom: readOne(params, "from").trim(),
    dateTo: readOne(params, "to").trim(),
    sort: SORT_KEYS.includes(sortRaw) ? sortRaw : "stars",
    page: Math.max(1, readNumber(params, "page", 1, 100_000)),
    // Clamp to [1, 96]: upper bound stops a single request from pulling the
    // whole collection, lower bound stops a bad value from disabling paging.
    limit: Math.min(Math.max(readNumber(params, "limit", 24, 96), 1), 96),
  };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Build the MongoDB match for the active filters.
 *
 * `skipDim` exists for facet counting: a language facet is computed with the
 * language filter removed, so its counts still reflect the topic and search
 * filters you have active. Without that, ticking one language would collapse
 * every other language's count to zero and you could not explore.
 */
export function buildMatch(
  filters: Filters,
  skipDim?: FacetDim,
): Filter<RepoDoc> {
  const clauses: Filter<RepoDoc>[] = [];

  if (filters.q) {
    const rx = new RegExp(escapeRegex(filters.q), "i");
    clauses.push({
      $or: [{ full_name: rx }, { description: rx }, { topics: rx }],
    } as Filter<RepoDoc>);
  }

  if (filters.languages.length && skipDim !== "language") {
    clauses.push({ language: { $in: filters.languages } } as Filter<RepoDoc>);
  }

  if (filters.licenses.length && skipDim !== "license") {
    clauses.push({
      "license.spdx_id": { $in: filters.licenses },
    } as Filter<RepoDoc>);
  }

  if (filters.topics.length && skipDim !== "topic") {
    clauses.push({ topics: { $all: filters.topics } } as Filter<RepoDoc>);
  }

  if (filters.minStars > 0) {
    clauses.push({ stars: { $gte: filters.minStars } } as Filter<RepoDoc>);
  }

  // created_at is stored as an ISO-8601 string, and ISO strings sort
  // lexicographically in chronological order, so plain string comparison is
  // correct here. Guard the shape so a stray value cannot match everything.
  if (ISO_DATE.test(filters.dateFrom)) {
    clauses.push({ created_at: { $gte: filters.dateFrom } } as Filter<RepoDoc>);
  }
  if (ISO_DATE.test(filters.dateTo)) {
    clauses.push({
      created_at: { $lte: `${filters.dateTo}T23:59:59.999Z` },
    } as Filter<RepoDoc>);
  }

  if (clauses.length === 0) return {};
  if (clauses.length === 1) return clauses[0];
  return { $and: clauses };
}

function sortSpecFor(sort: Filters["sort"]): Sort {
  switch (sort) {
    case "newest":
      return { created_at: -1, repo_id: 1 };
    case "forks":
      return { forks: -1, repo_id: 1 };
    case "updated":
      return { updated_at: -1, repo_id: 1 };
    case "potential":
      return { potentialScore: -1, repo_id: 1 };
    case "stars":
    default:
      return { stars: -1, repo_id: 1 };
  }
}

export async function getRepos(filters: Filters): Promise<RepoResult> {
  const db = await getDb();
  const repos = db.collection<RepoDoc>("repos");
  const match = buildMatch(filters);
  const skip = (filters.page - 1) * filters.limit;

  // Every read runs the scoring stage, so each card can render its own signal
  // badge rather than only the rows under sort=potential. That costs an
  // in-memory sort (a computed field cannot use an index), which is free at the
  // current collection size, but past roughly 100k docs the score should be
  // materialised by the collector and indexed instead.
  //
  // repo_id stays the tiebreaker on every sort, so paging never repeats or
  // drops a row when two repos score identically.
  const [docs, total] = await Promise.all([
    repos
      .aggregate(
        [
          { $match: match },
          SCORE_STAGE,
          { $sort: sortSpecFor(filters.sort) },
          { $skip: skip },
          { $limit: filters.limit },
        ],
        { allowDiskUse: true },
      )
      .toArray() as Promise<RepoDoc[]>,
    repos.countDocuments(match),
  ]);

  return {
    docs,
    total,
    page: filters.page,
    pages: Math.max(1, Math.ceil(total / filters.limit)),
  };
}

type FacetRow = { _id: string | null; count: number };

function toFacetValues(rows: FacetRow[], emptyLabel = "Unknown"): FacetValue[] {
  return rows.map((row) => ({
    value: row._id ?? "",
    label: row._id ?? emptyLabel,
    count: row.count,
  }));
}

export async function getFacets(filters: Filters): Promise<Facets> {
  const db = await getDb();
  const repos = db.collection<RepoDoc>("repos");

  const [languages, licenses, topics, bounds] = await Promise.all([
    repos
      .aggregate([
        { $match: buildMatch(filters, "language") },
        { $group: { _id: "$language", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 16 },
      ])
      .toArray() as Promise<FacetRow[]>,
    repos
      .aggregate([
        { $match: buildMatch(filters, "license") },
        { $group: { _id: "$license.spdx_id", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 16 },
      ])
      .toArray() as Promise<FacetRow[]>,
    repos
      .aggregate([
        { $match: buildMatch(filters, "topic") },
        { $unwind: "$topics" },
        { $group: { _id: "$topics", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 40 },
      ])
      .toArray() as Promise<FacetRow[]>,
    repos
      .aggregate([
        {
          $group: {
            _id: null,
            minDate: { $min: "$created_at" },
            maxDate: { $max: "$created_at" },
            maxStars: { $max: "$stars" },
          },
        },
      ])
      .toArray() as Promise<
        { _id: null; minDate: string | null; maxDate: string | null; maxStars: number }[]
      >,
  ]);

  const bound = bounds[0];

  return {
    languages: toFacetValues(languages),
    licenses: toFacetValues(licenses),
    topics: toFacetValues(topics),
    dateRange: {
      from: bound?.minDate ? bound.minDate.slice(0, 10) : null,
      to: bound?.maxDate ? bound.maxDate.slice(0, 10) : null,
    },
    maxStars: bound?.maxStars ?? 100,
  };
}

export async function countAllRepos(): Promise<number> {
  const db = await getDb();
  return db.collection<RepoDoc>("repos").estimatedDocumentCount();
}

/**
 * Headline figures for the insight band. Counted across the whole collection
 * rather than the active filter set: these describe what the radar has seen,
 * not what the current query happens to match.
 */
export async function getStats(): Promise<RadarStats> {
  const db = await getDb();
  const repos = db.collection<RepoDoc>("repos");

  const [row] = await repos
    .aggregate([
      SCORE_STAGE,
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          gainingTraction: { $sum: { $cond: [{ $gte: ["$stars", 10] }, 1, 0] } },
          breakout: {
            $sum: { $cond: [{ $gte: ["$potentialScore", TIER_MINS.breakout] }, 1, 0] },
          },
          rising: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ["$potentialScore", TIER_MINS.rising] },
                    { $lt: ["$potentialScore", TIER_MINS.breakout] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          pushedToday: {
            $sum: {
              $cond: [
                {
                  $lte: [
                    {
                      $dateDiff: {
                        startDate: {
                          $ifNull: [{ $toDate: "$pushed_at" }, new Date(0)],
                        },
                        endDate: "$$NOW",
                        unit: "day",
                      },
                    },
                    1,
                  ],
                },
                1,
                0,
              ],
            },
          },
          days: { $addToSet: "$last_run_date" },
        },
      },
      {
        $project: {
          _id: 0,
          total: 1,
          gainingTraction: 1,
          breakout: 1,
          rising: 1,
          pushedToday: 1,
          daysCovered: { $size: "$days" },
        },
      },
    ])
    .toArray();

  const daysCovered = row?.daysCovered ?? 0;

  return {
    total: row?.total ?? 0,
    gainingTraction: row?.gainingTraction ?? 0,
    breakout: row?.breakout ?? 0,
    rising: row?.rising ?? 0,
    pushedToday: row?.pushedToday ?? 0,
    daysCovered,
    // Every repo sharing one run date means any narrower window is empty, so
    // the UI can say so instead of showing a blank grid.
    dateFilterInert: daysCovered <= 1,
  };
}

export async function getRunInfo(): Promise<RunInfo | null> {
  const db = await getDb();
  const run = await db
    .collection("runs")
    .findOne({}, { sort: { started_at: -1 } });
  if (!run) return null;
  return {
    window: run.window,
    status: run.status,
    repos_new: run.repos_new,
    repos_touched: run.repos_touched,
    finished_at: run.finished_at,
    warnings: run.warnings ?? [],
    days_collected: run.days_collected,
  };
}
