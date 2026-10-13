import {
  compactNumber,
  dateOnly,
  languageColor,
  relativeTime,
} from "@/lib/format";
import { TIER_LABEL, tierFor } from "@/lib/scoring";
import type { RepoDoc } from "@/lib/types";

/** Upper bound used to normalise the meter, just above the current max. */
const SCORE_CEILING = 24;

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
  const tier = tierFor(repo.potentialScore);
  const score = repo.potentialScore ?? 0;
  const meter = Math.max(0, Math.min(100, (score / SCORE_CEILING) * 100));

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

        <div className="flex shrink-0 flex-col items-end gap-1">
          {tier !== "baseline" && (
            <span className={`tier-badge tier-${tier}`}>{TIER_LABEL[tier]}</span>
          )}
          <span
            className="rounded-md border border-edge px-1.5 py-0.5 font-mono text-[0.62rem] tracking-wide text-ink-dim"
            title={repo.license?.name ?? license}
          >
            {license}
          </span>
        </div>
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

      <div className="mt-auto space-y-2.5 border-t border-edge pt-3">
        <div className="flex items-center gap-3 font-mono text-[0.72rem] text-ink-faint">
          <Stars value={repo.stars} />
          <span title={`${repo.forks} forks`}>
            ⑂ {compactNumber(repo.forks)}
          </span>
          <span title={`${repo.open_issues} open issues`}>
            ◔ {compactNumber(repo.open_issues)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full ring-1 ring-white/10"
              style={{ background: languageColor(repo.language) }}
              aria-hidden="true"
            />
            {repo.language ?? "Unknown"}
          </span>
          {repo.is_fork && (
            <span
              className="rounded border border-edge px-1.5 py-0.5 text-[0.62rem]"
              title="This is a fork, not original work"
            >
              fork
            </span>
          )}
          {repo.is_archived && (
            <span
              className="rounded border border-warn/30 px-1.5 py-0.5 text-[0.62rem] text-warn"
              title="No longer maintained upstream"
            >
              archived
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-ink-faint">
            signal
          </span>
          <span className="score-meter" role="img" aria-label={`Potential score ${score.toFixed(1)} of ${SCORE_CEILING}`}>
            <span style={{ width: `${meter}%` }} />
          </span>
          <span className="font-mono text-[0.62rem] tabular-nums text-ink-faint">
            {score.toFixed(1)}
          </span>
        </div>
      </div>
    </article>
  );
}