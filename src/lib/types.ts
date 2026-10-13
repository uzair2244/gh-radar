export type RepoDoc = {
  repo_id: number;
  node_id?: string;
  full_name: string;
  owner_login: string;
  name: string;
  html_url: string;
  clone_url?: string;
  description?: string;
  topics: string[];
  language?: string;
  languages_count?: number;
  stars: number;
  forks: number;
  watchers?: number;
  open_issues: number;
  size_kb: number;
  is_fork: boolean;
  is_archived: boolean;
  is_disabled: boolean;
  has_wiki?: boolean;
  has_issues?: boolean;
  has_discussions?: boolean;
  default_branch?: string;
  license: { key?: string; spdx_id?: string; name?: string };
  created_at: string;
  pushed_at?: string;
  updated_at?: string;
  matched_topics: string[];
  first_seen_at: string;
  last_seen_at: string;
  last_run_date: string;
  /**
   * Computed at query time by `SCORE_STAGE`, never stored. Present on every
   * document the repository layer returns.
   */
  potentialScore?: number;
};

export type RepoResult = {
  docs: RepoDoc[];
  total: number;
  page: number;
  pages: number;
};

/** Headline figures rendered as the insight band above the results grid. */
export type RadarStats = {
  total: number;
  gainingTraction: number;
  breakout: number;
  rising: number;
  pushedToday: number;
  daysCovered: number;
  /**
   * True when every repo shares one creation date, which makes any
   * narrower date filter return nothing. Drives the hint next to the
   * date inputs rather than silently emptying the grid.
   */
  dateFilterInert: boolean;
};

export type FacetValue = { value: string; label: string; count: number };

export type Facets = {
  languages: FacetValue[];
  licenses: FacetValue[];
  topics: FacetValue[];
  dateRange: { from: string | null; to: string | null };
  maxStars: number;
};

export type RunInfo = {
  window?: string;
  status?: string;
  repos_new?: number;
  repos_touched?: number;
  finished_at?: string;
  warnings?: string[];
  days_collected?: number;
};

/** Normalised view of the query string, ready to hand to the database. */
export type Filters = {
  q: string;
  languages: string[];
  licenses: string[];
  topics: string[];
  minStars: number;
  dateFrom: string;
  dateTo: string;
  sort: "stars" | "newest" | "forks" | "updated" | "potential";
  page: number;
  limit: number;
};
