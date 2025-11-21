export function DocsTableOfContents() {
  return (
    <div className="max-xl:hidden">
      <div className="sticky top-14 max-h-[calc(100svh-3.5rem)] overflow-x-hidden px-6 pt-10 pb-24">
        <div className="flex flex-col gap-3">
          <h3 className="font-mono text-sm/6 font-medium tracking-widest text-gray-500 uppercase sm:text-xs/6 dark:text-gray-400">
            On this page
          </h3>
          <ul className="flex flex-col gap-2 border-l dark:border-[color-mix(in_oklab,_var(--color-gray-950),white_20%)] border-[color-mix(in_oklab,_var(--color-gray-950),white_90%)]">
            <li className="-ml-px flex flex-col items-start gap-2">
              <a
                className="inline-block border-l border-transparent text-base/8 text-gray-600 hover:border-gray-950/25 hover:text-gray-950 sm:text-sm/6 dark:text-gray-300 dark:hover:border-white/25 dark:hover:text-white aria-[current]:border-gray-950 aria-[current]:font-semibold aria-[current]:text-gray-950 dark:aria-[current]:border-white dark:aria-[current]:text-white pl-5 sm:pl-4"
                type="button"
                data-headlessui-state=""
                href="#overview"
              >
                Overview
              </a>
              <ul className="flex flex-col gap-2 border-l dark:border-[color-mix(in_oklab,_var(--color-gray-950),white_20%)] border-transparent">
                <li className="-ml-px flex flex-col items-start gap-2">
                  <a
                    className="inline-block border-l border-transparent text-base/8 text-gray-600 hover:border-gray-950/25 hover:text-gray-950 sm:text-sm/6 dark:text-gray-300 dark:hover:border-white/25 dark:hover:text-white aria-[current]:border-gray-950 aria-[current]:font-semibold aria-[current]:text-gray-950 dark:aria-[current]:border-white dark:aria-[current]:text-white pl-8 sm:pl-7.5"
                    type="button"
                    data-headlessui-state=""
                    href="#why-not-just-use-inline-styles"
                  >
                    Why not just use inline styles?
                  </a>
                </li>
              </ul>
            </li>
            <li className="-ml-px flex flex-col items-start gap-2">
              <a
                className="inline-block border-l border-transparent text-base/8 text-gray-600 hover:border-gray-950/25 hover:text-gray-950 sm:text-sm/6 dark:text-gray-300 dark:hover:border-white/25 dark:hover:text-white aria-[current]:border-gray-950 aria-[current]:font-semibold aria-[current]:text-gray-950 dark:aria-[current]:border-white dark:aria-[current]:text-white pl-5 sm:pl-4"
                type="button"
                data-headlessui-state=""
                href="#thinking-in-utility-classes"
              >
                Thinking in utility classes
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

