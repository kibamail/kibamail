import { NavArrowLeft, NavArrowRight } from "iconoir-react";

interface DocsContentAreaProps {
  children: React.ReactNode;
}

export function DocsContentArea({ children }: DocsContentAreaProps) {
  return (
    <div className="px-4 pt-10 pb-24 sm:px-6 xl:pr-0">
      <p className="flex items-center gap-2 font-mono text-xs/6 font-medium tracking-widest text-gray-600 uppercase dark:text-gray-400">
        Core concepts
      </p>

      <h1 className="mt-2 text-3xl font-medium tracking-tight text-gray-950 dark:text-white">
        Styling the best paragraphs
      </h1>

      <p className="mt-6 text-base/7 text-gray-700 dark:text-gray-400">
        Building complex components from a constrained set of primitive
        utilities.
      </p>

      <div className="prose mt-10">{children}</div>

      <footer className="mt-16 text-sm leading-6">
        <div className="flex items-center justify-between gap-2 text-gray-700 dark:text-gray-200">
          <a
            className="group flex items-center gap-2 hover:text-gray-900 dark:hover:text-white"
            href="/docs/upgrade-guide"
          >
            <NavArrowLeft className="size-4" />
            <span>Upgrade guide</span>
          </a>

          <a
            className="group flex items-center gap-2 hover:text-gray-900 dark:hover:text-white"
            href="/docs/hover-focus-states"
          >
            <span>Hover, focus, and other states</span>
            <NavArrowRight className="size-4" />
          </a>
        </div>
      </footer>
    </div>
  );
}
