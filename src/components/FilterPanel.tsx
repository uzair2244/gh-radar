"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { FacetValue, Facets, Filters } from "@/lib/types";

type Props = {
  facets: Facets;
  filters: Filters;
  total: number;
  totalAll: number;
  /** True while the collection only covers a single day. */
  dateFilterInert: boolean;
};

const SORTS = [
  { value: "stars", label: "Most stars" },
  { value: "potential", label: "Potential" },
  { value: "newest", label: "Newest" },
  { value: "forks", label: "Most forks" },
  { value: "updated", label: "Recently updated" },
] as const;

const SORT_LABEL: Record<string, string> = Object.fromEntries(
  SORTS.map((s) => [s.value, s.label]),
);

const STAR_PRESETS = [0, 10, 50, 100, 500];

/**
 * A single labelled date input with its own clear affordance. The native
 * picker is kept, since it is keyboard and screen-reader friendly, but it is
 * given a visible label and an explicit reset instead of being wedged next to
 * a sibling field in a narrow sidebar.
 */
function DateField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: string;
  min?: string;
  max?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <span className="mb-1 block font-mono text-[0.6rem] uppercase tracking-[0.14em] text-ink-faint">
        {label}
      </span>
      <div className="relative">
        <input
          type="date"
          value={value}
          min={min}
          max={max}
          onChange={(event) => onChange(event.target.value)}
          aria-label={`Created ${label.toLowerCase()}`}
          className="field px-2.5 py-1.5 pr-8 font-mono text-[0.75rem] [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:transition-opacity hover:[&::-webkit-calendar-picker-indicator]:opacity-90"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label={`Clear ${label.toLowerCase()} date`}
            className="absolute right-1.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-white/5 hover:text-danger"
          >
            <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 fill-current" aria-hidden="true">
              <path d="M3.2 2.4l4.8 4.8 4.8-4.8 1.2 1.2L9.2 8.4l4.8 4.8-1.2 1.2L8 9.2l-4.8 4.8L2 12.8l4.8-4.8L2 3.2l1.2-.8z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

function FacetGroup({
  title,
  options,
  selected,
  onToggle,
  emptyMessage,
  searchable = false,
  defaultExpanded = true,
  open,
  onToggleOpen,
}: {
  title: string;
  options: FacetValue[];
  selected: string[];
  onToggle: (value: string) => void;
  emptyMessage?: string;
  searchable?: boolean;
  defaultExpanded?: boolean;
  open?: boolean;
  onToggleOpen?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const isOpen = open ?? defaultExpanded;

  // Narrowing is client-side only: the facet list is already bounded by the
  // database, and this never touches the result set or the URL.
  const matches = useMemo(() => {
    if (!query.trim()) return options;
    const needle = query.trim().toLowerCase();
    return options.filter((option) => option.label.toLowerCase().includes(needle));
  }, [options, query]);

  const visible = expanded ? matches : matches.slice(0, 6);
  const heading = (
    <h3 className="section-label">
      {title}
      {selected.length > 0 && (
        <span className="ml-1.5 rounded bg-signal/20 px-1.5 py-px text-signal">
          {selected.length}
        </span>
      )}
    </h3>
  );

  const body = (
    <>
      {options.length === 0 ? (
        <p className="text-[0.72rem] italic text-ink-faint">
          {emptyMessage ?? "Nothing to filter"}
        </p>
      ) : (
        <>
          {searchable && (
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Filter ${title.toLowerCase()}…`}
              className="field mb-1.5 px-2 py-1 font-mono text-[0.72rem]"
              aria-label={`Filter ${title} options`}
            />
          )}

          {matches.length === 0 ? (
            <p className="text-[0.72rem] italic text-ink-faint">
              No {title.toLowerCase()} match “{query.trim()}”
            </p>
          ) : (
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
          )}

          {matches.length > 6 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-1.5 font-mono text-[0.68rem] text-signal/80 hover:text-signal"
            >
              {expanded ? "− show less" : `+ ${matches.length - 6} more`}
            </button>
          )}
        </>
      )}
    </>
  );

  // Collapsible when the parent controls it; otherwise always open.
  if (onToggleOpen) {
    return (
      <div className="border-b border-edge pb-4 last:border-0">
        <button
          type="button"
          className="disclosure mb-2"
          aria-expanded={isOpen}
          onClick={onToggleOpen}
        >
          {heading}
          <svg
            viewBox="0 0 12 12"
            className={`h-3 w-3 shrink-0 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M2.5 4.5L6 8l3.5-3.5" />
          </svg>
        </button>
        {isOpen && body}
      </div>
    );
  }

  return (
    <div className="border-b border-edge pb-4 last:border-0">
      <div className="mb-2">{heading}</div>
      {body}
    </div>
  );
}

type ActiveChip = { key: string; label: string; remove: () => void };

export function FilterPanel({
  facets,
  filters,
  total,
  totalAll,
  dateFilterInert,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [text, setText] = useState(filters.q);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    topic: true,
    language: true,
    license: false,
  });
  const [mobileOpen, setMobileOpen] = useState(false);
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

  // One chip per active filter, so the current query set is readable at a
  // glance instead of only being implied by the controls.
  const chips = useMemo<ActiveChip[]>(() => {
    const out: ActiveChip[] = [];
    if (filters.q) out.push({ key: "q", label: `“${filters.q}”`, remove: () => { setText(""); setParam("q", null); } });
    for (const value of filters.topics) out.push({ key: `topic:${value}`, label: `#${value}`, remove: () => toggleMany("topic", value) });
    for (const value of filters.languages) out.push({ key: `language:${value}`, label: value, remove: () => toggleMany("language", value) });
    for (const value of filters.licenses) out.push({ key: `license:${value}`, label: value, remove: () => toggleMany("license", value) });
    if (filters.minStars > 0) out.push({ key: "stars", label: `≥ ${filters.minStars} stars`, remove: () => setParam("stars", null) });
    if (filters.dateFrom) out.push({ key: "from", label: `from ${filters.dateFrom}`, remove: () => setParam("from", null) });
    if (filters.dateTo) out.push({ key: "to", label: `to ${filters.dateTo}`, remove: () => setParam("to", null) });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, searchParams]);

  const toggleSection = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const panel = (
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

      <div className="space-y-1.5">
        <label className="section-label block" htmlFor="sort">
          Sort by
        </label>
        <select
          id="sort"
          value={filters.sort}
          onChange={(event) => setParam("sort", event.target.value)}
          className="field"
        >
          {SORTS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
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

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5" aria-label="Active filters">
          {chips.map((chip) => (
            <span key={chip.key} className="filter-chip">
              <span>{chip.label}</span>
              <button type="button" onClick={chip.remove} aria-label={`Remove ${chip.label}`}>
                <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 fill-current" aria-hidden="true">
                  <path d="M3.2 2.4l4.8 4.8 4.8-4.8 1.2 1.2L9.2 8.4l4.8 4.8-1.2 1.2L8 9.2l-4.8 4.8L2 12.8l4.8-4.8L2 3.2l1.2-.8z" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="h-px w-full overflow-hidden bg-edge">
        {pending && <div className="scan-line h-px w-full" />}
      </div>

      <FacetGroup
        title="Topic"
        options={facets.topics}
        selected={filters.topics}
        onToggle={(value) => toggleMany("topic", value)}
        emptyMessage="No topics match the current filters"
        searchable
        open={openSections.topic}
        onToggleOpen={() => toggleSection("topic")}
      />

      <FacetGroup
        title="Language"
        options={facets.languages}
        selected={filters.languages}
        onToggle={(value) => toggleMany("language", value)}
        searchable
        open={openSections.language}
        onToggleOpen={() => toggleSection("language")}
      />

      <FacetGroup
        title="License"
        options={facets.licenses}
        selected={filters.licenses}
        onToggle={(value) => toggleMany("license", value)}
        open={openSections.license}
        onToggleOpen={() => toggleSection("license")}
      />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="section-label">Min stars</h3>
          <span className="font-mono text-[0.72rem] tabular-nums text-warn">
            {filters.minStars > 0 ? `≥ ${filters.minStars}` : "any"}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STAR_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              data-active={filters.minStars === preset}
              className="preset-pill"
              onClick={() => setParam("stars", preset === 0 ? null : String(preset))}
            >
              {preset === 0 ? "any" : `≥ ${preset}`}
            </button>
          ))}
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

      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="section-label">Created between</h3>
          {(filters.dateFrom || filters.dateTo) && (
            <button
              type="button"
              onClick={() => {
                setParam("from", null);
                setParam("to", null);
              }}
              className="font-mono text-[0.66rem] text-ink-faint transition-colors hover:text-danger"
            >
              reset
            </button>
          )}
        </div>

        {dateFilterInert && (
          <p className="hint">
            <span aria-hidden="true">ⓘ</span>
            <span>
              Every indexed repo was created on the same day, so narrowing this
              range returns nothing. It becomes useful once the collector covers
              more days.
            </span>
          </p>
        )}

        <div className="space-y-2">
          <DateField
            label="From"
            value={filters.dateFrom}
            min={facets.dateRange.from ?? undefined}
            max={facets.dateRange.to ?? undefined}
            onChange={(value) => setParam("from", value || null)}
          />
          <DateField
            label="To"
            value={filters.dateTo}
            min={facets.dateRange.from ?? undefined}
            max={facets.dateRange.to ?? undefined}
            onChange={(value) => setParam("to", value || null)}
          />
        </div>

        {facets.dateRange.from && facets.dateRange.to && (
          <p className="font-mono text-[0.64rem] text-ink-faint">
            Indexed {dateFilterInert ? "window" : "range"}:{" "}
            <span className="text-ink-dim">
              {facets.dateRange.from} to {facets.dateRange.to}
            </span>
          </p>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile: the panel collapses behind a trigger instead of stacking
          above the results and pushing them off screen. */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="field flex items-center justify-between text-left"
          aria-expanded={mobileOpen}
        >
          <span className="flex items-center gap-2">
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 stroke-ink-dim" fill="none" strokeWidth="1.5" aria-hidden="true">
              <path d="M2 4h12M4 8h8M6 12h4" strokeLinecap="round" />
            </svg>
            <span className="font-mono text-[0.75rem]">
              Filters{hasActiveFilters ? ` (${chips.length})` : ""}
            </span>
          </span>
          <span className="font-mono text-[0.7rem] text-ink-faint">{SORT_LABEL[filters.sort]}</span>
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <button
            type="button"
            className="absolute inset-0 bg-void/80 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Close filters"
          />
          <div className="panel absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="section-label">Filters</span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="font-mono text-[0.72rem] text-ink-dim hover:text-ink"
              >
                done ✕
              </button>
            </div>
            {panel}
          </div>
        </div>
      )}

      <aside className="panel hidden h-fit p-5 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:block lg:overflow-y-auto lg:overscroll-contain">
        {panel}
      </aside>
    </>
  );
}