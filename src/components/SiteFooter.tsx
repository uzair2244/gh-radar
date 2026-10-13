const PROFILE = {
  name: "Muhammad Uzair Shahid Rao",
  title: "Senior Software Engineer & Ecosystem Architect",
  location: "Lahore, Punjab, Pakistan",
  linkedin: "https://www.linkedin.com/in/muhammad-uzair-shahid-rao/",
  /**
   * A statement of intent rather than a CV. It deliberately avoids job titles
   * and dates, since the LinkedIn link carries the résumé if anyone wants it.
   */
  vision: [
    "I build tools that make other people's work faster, and I ship them in public while I do it.",
    "Most of them started as friction of my own: a component library I needed twice, an automation I was tired of running by hand. They turned out to be useful to people I'll never meet. GH Radar is the same bet. I wanted a way to find what was worth adopting before the noise buried it, so I built one and left it here for anyone else doing the same hunt.",
    "The goal isn't a list of repos. It's a body of open, dependable tools that other developers reach for without thinking twice.",
  ],
  toolkit: [
    "React.js",
    "Next.js",
    "TypeScript",
    "Tailwind CSS",
    "shadcn/ui",
    "Node.js",
    "Python",
    "Cloudflare Workers",
    "GraphQL",
    "WebSockets",
  ],
} as const;

function LinkedInMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05a3.74 3.74 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13zM7.12 20.45H3.55V9h3.57v11.45z" />
    </svg>
  );
}

export function About() {
  return (
    <section aria-labelledby="about-heading" className="panel mt-14 p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0">
          <h2 id="about-heading" className="section-label mb-2">
            Built by
          </h2>
          <p className="font-mono text-lg font-medium text-ink">{PROFILE.name}</p>
          <p className="mt-0.5 text-[0.85rem] text-signal">{PROFILE.title}</p>
          <p className="mt-1 text-[0.78rem] text-ink-faint">{PROFILE.location}</p>
        </div>

        <a
          href={PROFILE.linkedin}
          target="_blank"
          rel="noreferrer noopener"
          className="chip transition-colors hover:border-signal/50 hover:text-signal"
        >
          <LinkedInMark />
          LinkedIn
        </a>
      </div>

      <div className="mt-7 border-l-2 border-signal/30 pl-5">
        <h3 className="section-label mb-3">Vision</h3>
        {PROFILE.vision.map((line, index) => (
          <p
            key={line}
            className={
              index === 0
                ? "mb-3 text-[1.02rem] font-medium leading-relaxed text-ink"
                : "mb-3 max-w-2xl text-[0.85rem] leading-relaxed text-ink-dim last:mb-0"
            }
          >
            {line}
          </p>
        ))}
      </div>

      <div className="mt-7">
        <h3 className="section-label mb-2.5">Toolkit</h3>
        <div className="flex flex-wrap gap-1.5">
          {PROFILE.toolkit.map((item) => (
            <span key={item} className="chip">
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SiteFooter({ totalAll, dbName }: { totalAll: number; dbName: string }) {
  return (
    <footer className="mt-14 border-t border-edge pt-8 font-mono text-[0.68rem] text-ink-faint">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex items-center gap-2">
          <span className="relative flex h-6 w-6 items-center justify-center" aria-hidden="true">
            <span className="absolute inset-0 rounded-full border border-signal/25" />
            <span className="h-1 w-1 rounded-full bg-signal" />
          </span>
          <span className="text-ink-dim">GH·RADAR</span>
        </div>

        <p>
          {totalAll.toLocaleString()} repos indexed · reading{" "}
          <span className="text-ink-dim">{dbName}</span> · unauthenticated
          daily collection
        </p>

        <p className="text-ink-faint">
          Built by{" "}
          <a
            href={PROFILE.linkedin}
            target="_blank"
            rel="noreferrer noopener"
            className="text-ink-dim underline decoration-edge-bright underline-offset-2 transition-colors hover:text-signal"
          >
            {PROFILE.name}
          </a>
        </p>
      </div>
    </footer>
  );
}