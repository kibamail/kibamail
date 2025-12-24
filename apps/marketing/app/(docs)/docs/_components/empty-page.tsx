import { DocsPagination } from "./pagination";

interface EmptyPageProps {
  title: string;
  description?: string;
  category?: string;
}

export function EmptyPage({ title, description, category }: EmptyPageProps) {
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
        <h1 className="text-3xl font-bold tracking-tight text-kb-content-primary sm:text-4xl">
          {title}
        </h1>

        {/* Description */}
        {description && (
          <p className="mt-4 text-lg text-kb-content-secondary">{description}</p>
        )}

        {/* Empty content placeholder */}
        <div className="mt-10 rounded-lg border border-dashed border-kb-border-secondary bg-kb-bg-inset p-8 text-center">
          <p className="text-sm text-kb-content-tertiary">
            Documentation coming soon.
          </p>
        </div>

        {/* Pagination */}
        <DocsPagination slug="" />
      </article>

      {/* Right sidebar - Table of Contents placeholder */}
      <aside className="hidden lg:block">
        <div className="sticky top-20">
          <p className="text-xs font-medium uppercase tracking-widest text-kb-content-tertiary">
            On this page
          </p>
          <p className="mt-4 text-sm text-kb-content-tertiary">
            No sections yet.
          </p>
        </div>
      </aside>
    </div>
  );
}
