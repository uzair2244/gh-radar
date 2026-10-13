"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { FacetValue, Facets, Filters } from "@/lib/types";

type Props = {
  facets: Facets;
  filters: Filters;
  total: number;
  totalAll: number;
};

const SORTS = [
  { value: "stars", label: "Most stars" },
  { value: "newest", label: "Newest" },
  { value: "forks", label: "Most forks" },
  { value: "updated", label: "Recently updated" },
] as const;

function FacetGroup({
  title,
  options,
  selected,
  onToggle,
  emptyMessage,
}: {
  title: string;
  options: FacetValue[];
  selected: string[];
  onToggle: (value: string) => void;
  emptyMessage?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? options : options.slice(0, 6);

  return (
    <div className="border-b border-edge pb-4 last:border-0">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-ink-faint">
          {title}
          {selected.length > 0 && (
            <span className="ml-1.5 rounded bg-signal/20 px-1.5 py-px text-signal">
              {selected.length}
            </span>
          )}
        </h3>
      </div>

      {options.length === 0 ? (
        <p className="text-[0.72rem] italic text-ink-faint">
          {emptyMessage ?? "Nothing to filter"}
        </p>
      ) : (
        <>
          <div className="space-y-0.5">
            {visible.map((option) => {
              const active = selected.includes(option.value);
              return (
                <button
                  key={option.value || "__none__"}
                  type="button"
                  data-active={active}
                  className="facet-row"
                  aria-pressed={active}
                  onClick={() => onToggle(option.value)}
                >
                  <span
                    className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-colors ${
                      active
                        ? "border-signal bg-signal/25"
                        : "border-edge-bright"
                    }`}
                    aria-hidden="true"
                  >
                    {active && (
                      <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 fill-signal">
                        <path d="M10 1L3 9l-3-3 1.2-1.2L3 6.6 8.8.2 10 1z" />
                      </svg>
                    )}
                  </span>
                  <span className="truncate">{option.label}</span>
                  <span className="facet-count">{option.count}</span>
                </button>
              );
            })}
          </div>

          {options.length > 6 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-1.5 font-mono text-[0.68rem] text-signal/80 hover:text-signal"
            >
              {expanded ? "− show less" : `+ ${options.length - 6} more`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export function FilterPanel({ facets, filters, total, totalAll }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [text, setText] = useState(filters.q);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the box in sync when the URL changes from elsewhere (back button,
  // reset, pagination) without fighting the user mid-keystroke.
  useEffect(() => {
    setText(filters.q);
  }, [filters.q]);

  const push = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      params.delete("page"); // any filter change resets pagination
      startTransition(() => {
        router.push(`${pathname}${params.size ? `?${params}` : ""}`, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  const setParam = useCallback(
    (key: string, value: string | null) => {
      push((params) => {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      });
    },
    [push],
  );

  const toggleMany = useCallback(
    (key: string, value: string) => {
      push((params) => {
        const current = (params.get(key) ?? "").split(",").filter(Boolean);
        const next = current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value];
        if (next.length) params.set(key, next.join(","));
        else params.delete(key);
      });
    },
    [push],
  );

  // Debounce free-text so typing does not fire a query per keystroke.
  const onTextChange = (value: string) => {
    setText(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setParam("q", value.trim() || null);
    }, 400);
  };

  const hasActiveFilters = Boolean(
    filters.q.length > 0 ||
      filters.languages.length > 0 ||
      filters.licenses.length > 0 ||
      filters.topics.length > 0 ||
      filters.minStars > 0 ||
      filters.dateFrom.length > 0 ||
      filters.dateTo.length > 0,
  );

  const reset = () => {
    setText("");
    startTransition(() => router.push(pathname, { scroll: false }));
  };

  const starCeiling = Math.max(facets.maxStars, 50);
  const starStep = starCeiling > 2000 ? 100 : starCeiling > 400 ? 25 : 5;

  const resultLabel = useMemo(() => {
    if (total === totalAll) return `${total.toLocaleString()} repositories`;
    return `${total.toLocaleString()} of ${totalAll.toLocaleString()}`;
  }, [total, totalAll]);

  return (
    <div className="flex flex-col gap-5">
      <div className="relative">
        <svg
          viewBox="0 0 20 20"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 fill-none stroke-ink-faint"
          aria-hidden="true"
        >
          <circle cx="9" cy="9" r="6" strokeWidth="1.6" />
          <path d="M13.5 13.5L17.5 17.5" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={text}
          onChange={(event) => onTextChange(event.target.value)}
          placeholder="Search repos & topics…"
          className="field pl-9"
          aria-label="Search repositories"
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[0.72rem] text-ink-dim">
          {resultLabel}
          {pending && <span className="ml-2 text-signal">updating…</span>}
        </p>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={reset}
            className="font-mono text-[0.7rem] text-danger/80 hover:text-danger"
          >
            clear ✕
          </button>
        )}
      </div>

      <div className="h-px w-full overflow-hidden bg-edge">
        {pending && <div className="scan-line h-px w-full" />}
      </div>

      <FacetGroup
        title="Language"
        options={facets.languages}
        selected={filters.languages}
        onToggle={(value) => toggleMany("language", value)}
      />

      <FacetGroup
        title="License"
        options={facets.licenses}
        selected={filters.licenses}
        onToggle={(value) => toggleMany("license", value)}
      />

      <FacetGroup
        title="Topic"
        options={facets.topics}
        selected={filters.topics}
        onToggle={(value) => toggleMany("topic", value)}
        emptyMessage="No topics match the current filters"
      />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-ink-faint">
            Min stars
          </h3>
          <span className="font-mono text-[0.72rem] tabular-nums text-warn">
            {filters.minStars > 0 ? `≥ ${filters.minStars}` : "any"}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={starCeiling}
          step={starStep}
          value={filters.minStars}
          onChange={(event) => {
            const value = event.target.value;
            push((params) => {
              if (value === "0") params.delete("stars");
              else params.set("stars", value);
            });
          }}
          className="w-full accent-[var(--color-warn)]"
          aria-label="Minimum stars"
        />
      </div>

      <div className="space-y-2">
        <h3 className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-ink-faint">
          Created between
        </h3>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filters.dateFrom}
            min={facets.dateRange.from ?? undefined}
            max={facets.dateRange.to ?? undefined}
            onChange={(event) => setParam("from", event.target.value || null)}
            className="field px-2 font-mono text-[0.72rem]"
            aria-label="Created from"
          />
          <span className="text-ink-faint">→</span>
          <input
            type="date"
            value={filters.dateTo}
            min={facets.dateRange.from ?? undefined}
            max={facets.dateRange.to ?? undefined}
            onChange={(event) => setParam("to", event.target.value || null)}
            className="field px-2 font-mono text-[0.72rem]"
            aria-label="Created to"
          />
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-ink-faint">
          Sort by
        </h3>
        <select
          value={filters.sort}
          onChange={(event) => setParam("sort", event.target.value)}
          className="field"
          aria-label="Sort order"
        >
          {SORTS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
