import type { Document } from "mongodb";

/**
 * Single definition of the "potential" signal, shared by the database query
 * and the UI. The aggregation stage below and `TIERS` must stay in step: the
 * sort uses the expression, the badges read the thresholds.
 *
 * The score deliberately avoids age-normalising stars-per-day. Every repo in
 * the collection is currently the same age, so velocity would collapse into a
 * raw star count and carry no extra information. Log-scaling instead keeps the
 * long tail (786 stars) from flattening everything below it, while forks get
 * their own weight so a young repo with adoption surfaces ahead of a more
 * popular one that nobody has built on yet.
 *
 * Flat bonuses (activity, health, richness) raise the floor to roughly 2.0.
 * `TIERS` is written against that floor so tier thresholds read as "signal
 * above baseline" rather than absolute numbers.
 */
export const SCORE_STAGE: Document = {
  $addFields: {
    potentialScore: {
      $add: [
        // Adoption, compressed so the 786-star outlier cannot dominate.
        { $multiply: [2.0, { $ln: { $add: [1, { $ifNull: ["$stars", 0] }] } }] },
        // Forks weighted separately: adoption that people actually build on.
        { $multiply: [1.2, { $ln: { $add: [1, { $ifNull: ["$forks", 0] }] } }] },
        // Pushed within the last day. Epoch fallback keeps a missing
        // pushed_at from making $dateDiff throw.
        {
          $cond: [
            {
              $lte: [
                {
                  $dateDiff: {
                    startDate: { $ifNull: [{ $toDate: "$pushed_at" }, new Date(0)] },
                    endDate: "$$NOW",
                    unit: "day",
                  },
                },
                1,
              ],
            },
            1.0,
            0,
          ],
        },
        // Forks and archives are not original work, so they forfeit health.
        { $cond: [{ $or: ["$is_fork", "is_archived"] }, 0, 0.6] },
        { $cond: [{ $ifNull: ["$description", ""] }, 0.4, 0] },
        { $multiply: [0.2, { $min: [{ $size: { $ifNull: ["$matched_topics", []] } }, 5] }] },
      ],
    },
  },
};

export type SignalTier = "breakout" | "rising" | "signal" | "baseline";

/** Lower bound of each tier, highest first. */
export const TIERS: ReadonlyArray<{ min: number; tier: SignalTier }> = [
  { min: 10, tier: "breakout" },
  { min: 5, tier: "rising" },
  { min: 3, tier: "signal" },
];

/** Tier thresholds used by `getStats`, kept in one place with `tierFor`. */
export const TIER_MINS = Object.fromEntries(
  TIERS.map((entry) => [entry.tier, entry.min]),
) as Record<Exclude<SignalTier, "baseline">, number>;

export function tierFor(score: number | null | undefined): SignalTier {
  if (typeof score !== "number" || Number.isNaN(score)) return "baseline";
  for (const { min, tier } of TIERS) {
    if (score >= min) return tier;
  }
  return "baseline";
}

export const TIER_LABEL: Record<SignalTier, string> = {
  breakout: "Breakout",
  rising: "Rising",
  signal: "Signal",
  baseline: "",
};