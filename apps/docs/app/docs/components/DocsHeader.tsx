import { Github, Menu } from "iconoir-react";
import Image from "next/image";

export function DocsHeader() {
  return (
    <div className="fixed inset-x-0 top-0 z-10 border-b border-gray-950/5 dark:border-white/10">
      <div className="bg-white dark:bg-gray-950">
        <div className="flex h-14 items-center justify-between gap-8 px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <a href="/">
              <Image
                src="/logos/full-light.svg"
                width={120}
                height={32}
                className="h-8 w-auto"
                alt="Kibamail Logo"
              />
            </a>
          </div>

          <div className="flex items-center gap-6 max-md:hidden">
            <a className="text-sm/6 text-gray-950 dark:text-white" href="/docs">
              Docs
            </a>
            <a className="text-sm/6 text-gray-950 dark:text-white" href="/blog">
              Blog
            </a>
            <a
              className="text-sm/6 text-gray-950 dark:text-white"
              href="/showcase"
            >
              Showcase
            </a>

            <a
              aria-label="GitHub repository"
              href="https://github.com/tailwindlabs/tailwindcss"
            >
              <Github className="size-5 fill-black/40 dark:fill-gray-400" />
            </a>
          </div>
        </div>

        <div className="flex h-14 items-center border-t border-gray-950/5 bg-white px-4 sm:px-6 lg:hidden dark:border-white/10 dark:bg-gray-950">
          <button
            className="relative inline-grid size-7 place-items-center rounded-md text-gray-950 hover:bg-gray-950/5 dark:text-white dark:hover:bg-white/10 -ml-1.5"
            type="button"
          >
            <span className="absolute top-1/2 left-1/2 size-11 -translate-1/2 pointer-fine:hidden" />
            <Menu className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
