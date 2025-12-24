"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  getActiveSection,
  getNavigationForSection,
  type NavItem,
} from "./docs-navigation";

export function DocsPagination({ slug }: { slug: string }) {
  const pathname = usePathname();
  const activeSection = getActiveSection(pathname);
  const navigation = getNavigationForSection(activeSection);

  // Flatten the navigation for prev/next lookup
  const flatIndex: NavItem[] = navigation.flatMap((section) => section.items);

  const currentPath = pathname;
  const position = flatIndex.findIndex(([, path]) => path === currentPath);

  if (position === -1) return null;

  const prev = position > 0 ? flatIndex[position - 1] : null;
  const next =
    position < flatIndex.length - 1 ? flatIndex[position + 1] : null;

  return (
    <footer className="mt-16 text-sm leading-6">
      <div className="flex items-center justify-between gap-2 text-kb-content-secondary">
        {prev ? (
          <Link
            className="group flex items-center gap-2 hover:text-kb-content-primary"
            href={prev[1]}
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="size-4">
              <path
                fillRule="evenodd"
                d="M9.78 4.22a.75.75 0 0 1 0 1.06L7.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L5.47 8.53a.75.75 0 0 1 0-1.06l3.25-3.25a.75.75 0 0 1 1.06 0Z"
                clipRule="evenodd"
              />
            </svg>
            <span>{prev[0]}</span>
          </Link>
        ) : (
          <div />
        )}

        {next ? (
          <Link
            className="group flex items-center gap-2 hover:text-kb-content-primary"
            href={next[1]}
          >
            <span>{next[0]}</span>
            <svg viewBox="0 0 16 16" fill="currentColor" className="size-4">
              <path
                fillRule="evenodd"
                d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z"
                clipRule="evenodd"
              />
            </svg>
          </Link>
        ) : (
          <div />
        )}
      </div>
    </footer>
  );
}
