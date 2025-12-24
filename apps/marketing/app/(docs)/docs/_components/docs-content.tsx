import { TableOfContents, TOCEntry } from "./table-of-contents";
import { DocsPagination } from "./pagination";

interface DocsContentProps {
  title: string;
  description?: string;
  category?: string;
  tableOfContents?: TOCEntry[];
  slug?: string;
  children: React.ReactNode;
}

export function DocsContent({
  title,
  description,
  category,
  tableOfContents = [],
  slug = "",
  children,
}: DocsContentProps) {
  return (
    <div className="mx-auto grid w-full max-w-2xl grid-cols-1 gap-10 px-4 pt-10 pb-24 lg:max-w-5xl lg:grid-cols-[minmax(0,1fr)_14rem] xl:px-0">
      {/* Main content */}
      <article>
        {/* Category label */}
        {category && (
          <p className="mb-2 font-mono text-xs/6 font-medium tracking-widest text-kb-content-tertiary uppercase">
            {category}
          </p>
        )}

        {/* Title */}
        <h1 className="text-3xl font-sans! font-bold tracking-tight text-kb-content-primary sm:text-4xl">
          {title}
        </h1>

        {/* Description */}
        {description && (
          <p className="mt-4 text-lg text-kb-content-secondary font-sans!">
            {description}
          </p>
        )}

        {/* Content */}
        <div className="kb-docs-content mt-10 font-sans!">{children}</div>

        {/* Pagination */}
        <DocsPagination slug={slug} />
      </article>

      {/* Right sidebar - Table of Contents */}
      <aside className="hidden lg:block">
        <div className="sticky top-20 max-h-[calc(100vh-5rem)] overflow-y-auto">
          <TableOfContents tableOfContents={tableOfContents} />
        </div>
      </aside>
    </div>
  );
}
