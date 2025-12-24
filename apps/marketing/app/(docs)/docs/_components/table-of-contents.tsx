"use client";

import { useEffect, useState, useRef } from "react";
import clsx from "clsx";

export interface TOCEntry {
  level: number;
  text: string;
  slug: string;
  children?: TOCEntry[];
}

interface TableOfContentsProps {
  tableOfContents: TOCEntry[];
}

export function TableOfContents({ tableOfContents }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const headings = document.querySelectorAll("h2[id], h3[id]");
    const visibleElements = new Set<Element>();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visibleElements.add(entry.target);
          } else {
            visibleElements.delete(entry.target);
          }
        }

        // Get the first visible heading
        const sortedHeadings = Array.from(headings).filter((h) =>
          visibleElements.has(h)
        );
        if (sortedHeadings.length > 0) {
          setActiveId(sortedHeadings[0].id);
        }
      },
      {
        // Offset for the fixed header
        rootMargin: "-56px 0px -80% 0px",
        threshold: 0,
      }
    );

    for (const heading of headings) {
      observerRef.current.observe(heading);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  if (tableOfContents.length === 0) {
    return null;
  }

  return (
    <nav className="text-sm">
      <h4 className="font-semibold text-kb-content-primary">On this page</h4>
      <ul className="mt-4 space-y-3">
        {tableOfContents.map((entry) => (
          <li key={entry.slug}>
            <a
              href={`#${entry.slug}`}
              aria-current={activeId === entry.slug ? "location" : undefined}
              className={clsx(
                "block text-kb-content-secondary hover:text-kb-content-primary",
                "aria-[current]:font-medium aria-[current]:text-kb-content-primary"
              )}
            >
              {entry.text}
            </a>
            {entry.children && entry.children.length > 0 && (
              <ul className="mt-2 space-y-2 border-l border-kb-border-tertiary pl-4">
                {entry.children.map((child) => (
                  <li key={child.slug}>
                    <a
                      href={`#${child.slug}`}
                      aria-current={
                        activeId === child.slug ? "location" : undefined
                      }
                      className={clsx(
                        "block text-kb-content-tertiary hover:text-kb-content-primary",
                        "aria-[current]:font-medium aria-[current]:text-kb-content-primary"
                      )}
                    >
                      {child.text}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
