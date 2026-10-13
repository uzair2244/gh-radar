const LANGUAGE_COLORS: Record<string, string> = {
  Python: "#3b82f6",
  TypeScript: "#3178c6",
  JavaScript: "#eab308",
  Rust: "#f97316",
  Go: "#22d3ee",
  Shell: "#84cc16",
  Java: "#f59e0b",
  "C++": "#a855f7",
  "C#": "#ec4899",
  Ruby: "#fb7185",
  PHP: "#818cf8",
  Swift: "#fb923c",
  Kotlin: "#a855f7",
  Dart: "#38bdf8",
  HTML: "#f97316",
  CSS: "#38bdf8",
  Vue: "#22c55e",
  Svelte: "#fb923c",
  Elixir: "#a78bfa",
  Zig: "#facc15",
};

export function languageColor(language?: string): string {
  if (!language) return "#5b6b83";
  return LANGUAGE_COLORS[language] ?? "#64748b";
}

export function compactNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(value);
}

export function relativeTime(iso?: string): string {
  if (!iso) return "unknown";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "unknown";

  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.round(months / 12)}y ago`;
}

export function dateOnly(iso?: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toISOString().slice(0, 10);
}
