"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function MobileDocsNav({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <div className="flex h-14 items-center border-t border-gray-950/5 bg-white px-4 sm:px-6 lg:hidden dark:border-white/10 dark:bg-gray-950">
      {/* Menu toggle button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="-ml-1.5 flex size-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-950/5 hover:text-gray-950 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
        aria-label="Open navigation menu"
      >
        <svg viewBox="0 0 16 16" fill="currentColor" className="size-4">
          <path
            fillRule="evenodd"
            d="M2 4.75A.75.75 0 0 1 2.75 4h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75Zm0 6.5a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Breadcrumb placeholder */}
      <div className="ml-4 flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
        <span>Docs</span>
      </div>

      {/* Mobile menu dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-gray-950/50 dark:bg-gray-950/80"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu panel */}
          <div className="fixed inset-y-0 left-0 flex w-full max-w-xs flex-col bg-white shadow-xl dark:bg-gray-950">
            {/* Header with close button */}
            <div className="flex h-14 items-center justify-between border-b border-gray-950/5 px-4 dark:border-white/10">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="-ml-1.5 flex size-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-950/5 hover:text-gray-950 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
                aria-label="Close navigation menu"
              >
                <svg viewBox="0 0 16 16" fill="currentColor" className="size-4">
                  <path
                    fillRule="evenodd"
                    d="M4.28 3.22a.75.75 0 0 0-1.06 1.06L6.94 8l-3.72 3.72a.75.75 0 1 0 1.06 1.06L8 9.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L9.06 8l3.72-3.72a.75.75 0 0 0-1.06-1.06L8 6.94 4.28 3.22Z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {/* Escape key hint */}
              <span className="rounded bg-gray-950/5 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-white/10 dark:text-gray-400">
                esc
              </span>
            </div>

            {/* Scrollable navigation content */}
            <div className="flex-1 overflow-y-auto p-6">{children}</div>
          </div>
        </div>
      )}
    </div>
  );
}
