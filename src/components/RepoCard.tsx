import {
  compactNumber,
  dateOnly,
  languageColor,
  relativeTime,
} from "@/lib/format";
import type { RepoDoc } from "@/lib/types";

function Stars({ value }: { value: number }) {
  return (
    <span
      className="inline-flex items-center gap-1 font-mono tabular-nums"
      style={
        value > 0
          ? { color: "color-mix(in oklab, var(--color-warn) 85%, white)" }
          : { color: "var(--color-ink-faint)" }
      }
      title={`${value} stars`}
    >
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
        <path d="M8 .5l2.2 4.9 5.3.6-3.9 3.6 1 5.2L8 12.3 3.4 14.8l1-5.2L.5 6l5.3-.6L8 .5z" />
      </svg>
      {compactNumber(value)}
      <span className="sr-only"> stars</span>
    </span>
  );
}

export function RepoCard({ repo }: { repo: RepoDoc }) {
  const license = repo.license?.spdx_id ?? "NOASSERTION";

  return (
    <article className="panel panel-hover rise flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <a
            href={repo.html_url}
            target="_blank"
            rel="noreferrer noopener"
            className="group block truncate font-mono text-[0.92rem] font-medium text-ink transition-colors hover:text-signal"
          >
            <span className="text-ink-faint group-hover:text-ink-dim">
              {repo.owner_login}
            </span>
            <span className="text-ink-dim">/</span>
            <span className="text-signal">{repo.name}</span>
          </a>
          <p className="mt-0.5 font-mono text-[0.68rem] text-ink-faint">
            created {dateOnly(repo.created_at)} · seen {relativeTime(repo.last_seen_at)}
          </p>
        </div>

        <span
          className="shrink-0 rounded-md border border-edge px-1.5 py-0.5 font-mono text-[0.62rem] tracking-wide text-ink-dim"
          title={repo.license?.name ?? license}
        >
          {license}
        </span>
      </div>

      <p className="line-clamp-3 min-h-[2.6rem] text-[0.82rem] leading-relaxed text-ink-dim">
        {repo.description?.trim() || <span className="italic text-ink-faint">No description provided.</span>}
      </p>

      {repo.topics.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {repo.topics.slice(0, 6).map((topic) => (
            <span key={topic} className="chip">
              {topic}
            </span>
          ))}
          {repo.topics.length > 6 && (
            <span className="chip text-ink-faint">+{repo.topics.length - 6}</span>
          )}
        </div>
      )}

      <div className="mt-auto flex items-center gap-3 border-t border-edge pt-3 font-mono text-[0.72rem] text-ink-faint">
        <Stars value={repo.stars} />
        <span title={`${repo.forks} forks`}>
          ⑂ {compactNumber(repo.forks)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full ring-1 ring-white/10"
            style={{ background: languageColor(repo.language) }}
            aria-hidden="true"
          />
          {repo.language ?? "Unknown"}
        </span>
        {repo.is_archived && (
          <span className="ml-auto rounded border border-warn/30 px-1.5 py-0.5 text-[0.62rem] text-warn">
            archived
          </span>
        )}
      </div>
    </article>
  );
}
