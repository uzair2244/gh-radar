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
};

export type RepoResult = {
  docs: RepoDoc[];
  total: number;
  page: number;
  pages: number;
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
  sort: "stars" | "newest" | "forks" | "updated";
  page: number;
  limit: number;
};
