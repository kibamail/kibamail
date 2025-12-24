"use client";

import clsx from "clsx";
import Link from "next/link";

export function NavList({ children }: React.PropsWithChildren) {
  return <div className="flex flex-col gap-3">{children}</div>;
}

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export function NavListHeading({
  children,
  level = 3,
}: React.PropsWithChildren<{ level?: HeadingLevel }>) {
  const Element: `h${HeadingLevel}` = `h${level}`;
  return (
    <Element className="font-mono text-sm/6 font-medium tracking-widest text-kb-content-tertiary uppercase sm:text-xs/6">
      {children}
    </Element>
  );
}

export function NavListItems({
  children,
  nested = false,
}: React.PropsWithChildren<{ nested?: boolean }>) {
  return (
    <ul
      className={clsx(
        "flex flex-col gap-2 border-l",
        nested ? "border-transparent" : "border-kb-border-tertiary"
      )}
    >
      {children}
    </ul>
  );
}

export function NavListItem({ children }: React.PropsWithChildren) {
  return <li className="-ml-px flex flex-col items-start gap-2">{children}</li>;
}

const methodColors: Record<string, string> = {
  GET: "text-emerald-600",
  POST: "text-blue-600",
  PUT: "text-amber-600",
  PATCH: "text-orange-600",
  DELETE: "text-red-600",
};

export function NavListLink({
  href,
  children,
  nested = false,
  isActive = false,
  method,
}: React.PropsWithChildren<{
  href: string;
  nested?: boolean;
  isActive?: boolean;
  method?: string;
}>) {
  return (
    <Link
      className={clsx(
        "flex w-full items-center justify-between border-l border-transparent text-base/8 text-kb-content-secondary hover:border-kb-content-tertiary hover:text-kb-content-primary sm:text-sm/6",
        "aria-[current]:border-kb-content-brand aria-[current]:font-semibold aria-[current]:text-kb-content-primary font-sans!",
        nested ? "pl-8 pr-2 sm:pl-7.5" : "pl-5 pr-2 sm:pl-4"
      )}
      href={href}
      aria-current={isActive ? "page" : undefined}
    >
      <span className="truncate">{children}</span>
      {method && (
        <span
          className={clsx(
            "ml-2 shrink-0 font-mono text-[10px] font-semibold uppercase",
            methodColors[method] || "text-kb-content-tertiary"
          )}
        >
          {method}
        </span>
      )}
    </Link>
  );
}
