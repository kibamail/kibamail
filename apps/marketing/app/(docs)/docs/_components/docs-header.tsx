"use client";

import Link from "next/link";
import { LogoFullBrown } from "@/app/_components/_icons/logo-full-brown.svg";
import { Search, Github } from "iconoir-react";

export function DocsHeader() {
  return (
    <header className="flex h-14 items-center justify-between gap-4 bg-kb-bg-layout px-4 sm:px-6">
      {/* Logo */}
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center">
          <LogoFullBrown className="h-6" />
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden lg:flex items-center gap-6">
          <Link
            href="/docs"
            className="text-sm font-medium text-kb-content-primary"
          >
            Docs
          </Link>
          <Link
            href="/blog"
            className="text-sm text-kb-content-secondary hover:text-kb-content-primary"
          >
            Blog
          </Link>
          <Link
            href="https://github.com/kibamail"
            className="text-sm text-kb-content-secondary hover:text-kb-content-primary"
          >
            GitHub
          </Link>
        </nav>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Search button */}
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg bg-kb-surface-secondary px-3 py-1.5 text-sm text-kb-content-tertiary hover:bg-kb-surface-tertiary"
        >
          <Search className="size-4" />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden rounded bg-kb-bg-primary px-1.5 py-0.5 text-xs font-medium text-kb-content-tertiary shadow-sm ring-1 ring-kb-border-tertiary sm:inline">
            <span className="text-xs">⌘</span>K
          </kbd>
        </button>

        {/* GitHub link */}
        <Link
          href="https://github.com/kibamail"
          className="hidden text-kb-content-secondary hover:text-kb-content-primary sm:block"
        >
          <Github className="size-5" />
        </Link>
      </div>
    </header>
  );
}
