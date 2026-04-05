import { useEffect, useMemo, useRef, useState } from "react";

interface Heading {
  depth: number;
  slug: string;
  text: string;
}

interface Props {
  headings: Heading[];
}

export default function TableOfContents({ headings }: Props) {
  const filtered = useMemo(
    () => headings.filter((h) => h.depth === 2 || h.depth === 3),
    [headings],
  );
  const [activeSlug, setActiveSlug] = useState<string>("");
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const elements = filtered
      .map((h) => document.getElementById(h.slug))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Find the topmost visible heading
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSlug(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: "0px 0px -80% 0px", threshold: 0 },
    );

    for (const el of elements) {
      observerRef.current.observe(el);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [filtered]);

  if (filtered.length === 0) return null;

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>, slug: string) {
    e.preventDefault();
    const el = document.getElementById(slug);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
      setActiveSlug(slug);
      history.replaceState(null, "", `#${slug}`);
    }
  }

  return (
    <nav className="py-6 pl-4" aria-label="On this page">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-blue-600 dark:text-slate-blue-400">
        On this page
      </h3>
      <ul className="space-y-1 text-sm">
        {filtered.map((heading) => {
          const isActive = activeSlug === heading.slug;
          return (
            <li key={heading.slug}>
              <a
                href={`#${heading.slug}`}
                onClick={(e) => handleClick(e, heading.slug)}
                className={`block border-l-2 py-1 transition-colors ${
                  heading.depth === 3 ? "pl-5" : "pl-3"
                } ${
                  isActive
                    ? "border-slate-blue-500 text-foreground font-medium"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}>
                {heading.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
