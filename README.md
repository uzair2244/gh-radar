# GH Radar — web

Next.js front end for the [`gh-oss-radar`](../gh-radar-web) collector. Reads
MongoDB **server-side** from React Server Components, so there is no separate
backend to host — `next start` serves both the UI and the data.

## Run it

```sh
npm install
cp .env.example .env.local     # then edit MONGODB_URI
npm run dev                    # http://localhost:3100
```

The port is **3100**, not 3000, because another of your projects
(`mhalt-revDSM-portal-frontend`) already holds 3000 on this machine.

Production:

```sh
npm run build
npm start
```

## Pointing at a live database

Change one value in `.env.local` and restart:

```env
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net
MONGODB_DB=gh_radar
```

Nothing else changes — every query goes through `src/lib/mongodb.ts`. Note
that MongoDB Atlas requires the IP to be in its access list, and that a
connection string with credentials is a secret, so keep it in `.env.local`,
which is gitignored.

## How it queries

`src/lib/queries.ts` owns all database access. `parseFilters` turns the URL
query string into a validated `Filters` object — every value is clamped, so a
hand-edited URL cannot inject an unbounded query.

Filters:

| Param | Meaning |
|---|---|
| `q` | Regex match across `full_name`, `description`, and `topics` |
| `language` | Comma-separated list, `$in` |
| `license` | Comma-separated SPDX ids, `$in` |
| `topic` | Comma-separated list, `$all` (AND semantics) |
| `stars` | Minimum star count |
| `from` / `to` | `YYYY-MM-DD` bounds on `created_at` |
| `sort` | `stars` (default), `newest`, `forks`, `updated` |
| `page`, `limit` | Paging; `limit` is clamped to 1–96 |

Two details worth knowing:

- **Facet counts are computed with their own dimension removed.** Pick a
  topic and the language counts update to reflect that topic, instead of
  collapsing to zero. This is the `skipDim` argument in `buildMatch`.
- **`repo_id` is the sort tiebreaker.** Without it, two repos sharing a star
  count could shuffle between pages and show duplicates.

## JSON endpoint

`GET /api/repos` returns the same data the page renders, so other tools can
consume the radar without scraping HTML.

```sh
curl 'http://localhost:3100/api/repos?topic=mcp&language=Python&stars=50&limit=5'
curl 'http://localhost:3100/api/repos?facets=1'          # include facet counts
```

## Layout

```
src/
├── app/
│   ├── layout.tsx        fonts, ambient background layers
│   ├── page.tsx          async server component; awaits searchParams
│   ├── globals.css       Tailwind v4 theme + radar animations
│   ├── icon.svg          favicon
│   └── api/repos/route.ts
├── components/
│   ├── FilterPanel.tsx   client component; writes filters to the URL
│   └── RepoCard.tsx      server component, zero client JS
└── lib/
    ├── mongodb.ts        cached client (survives dev hot-reload)
    ├── queries.ts        filter parsing, matching, facets
    ├── format.ts         relative time, compact numbers, language colours
    └── types.ts
```

The page is `force-dynamic`, so it is never prerendered — every request hits
MongoDB and reflects the collector's most recent write.
