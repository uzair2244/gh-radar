<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Writing style

Do not use a dash to break a sentence. An em dash between clauses (`—`) reads
as machine-written filler to the people who read this site, so join the clauses
with a comma, a semicolon, or two sentences instead.

This applies to every piece of user-facing copy: the hero, section headings,
explanatory text, tooltips, and empty states. It also applies to comments and
prose inside source files, so the codebase reads consistently.

Hyphens that join words are fine and should stay (`log-scaled`,
`developer-tools`, `read-only`). A literal `—` used as punctuation is what this
rule forbids. Where a placeholder genuinely has no value, `N/A` or `—` in a
`dateOnly` style fallback is acceptable, but prefer a word in prose.
