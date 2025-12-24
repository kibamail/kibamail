import React from "react";
import { DocsHeader } from "./_components/docs-header";
import { DocsSidebar } from "./_components/docs-sidebar";
import { DocsSidebarAutoscroll } from "./_components/docs-sidebar-autoscroll";
import { MobileDocsNav } from "./_components/mobile-docs-nav";
import { DocsFooterSitemap, DocsFooterMeta } from "./_components/docs-footer";

export default async function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-kb-bg-layout">
      {/* Fixed header */}
      <div className="fixed inset-x-0 top-0 z-10 border-b border-kb-border-tertiary">
        <DocsHeader />
        <MobileDocsNav>
          <DocsSidebar />
        </MobileDocsNav>
      </div>

      {/* Main grid layout */}
      <div className="grid min-h-dvh grid-cols-1 grid-rows-[1fr_1px_auto_1px_auto] pt-[6.5rem] lg:grid-cols-[16.25rem_2.5rem_minmax(0,1fr)_2.5rem] lg:pt-14">
        {/* Sidebar - desktop only */}
        <div className="relative col-start-1 row-span-full row-start-1 max-lg:hidden">
          <div className="absolute inset-0">
            <div className="sticky top-14 bottom-0 left-0 h-full max-h-[calc(100dvh-3.5rem)] w-[16.25rem] overflow-y-auto p-6">
              <DocsSidebarAutoscroll>
                <DocsSidebar />
              </DocsSidebarAutoscroll>
            </div>
          </div>
        </div>

        {/* Left decorative border - candy cane pattern */}
        <div className="col-start-2 row-span-5 row-start-1 border-x border-x-kb-border-tertiary bg-[image:repeating-linear-gradient(315deg,_var(--color-kb-border-tertiary)_0,_var(--color-kb-border-tertiary)_1px,_transparent_0,_transparent_50%)] bg-[size:10px_10px] bg-fixed max-lg:hidden" />

        {/* Main content area */}
        <div className="relative row-start-1 grid grid-cols-subgrid lg:col-start-3">
          {children}
        </div>

        {/* Right decorative border - candy cane pattern */}
        <div className="col-start-4 row-span-5 row-start-1 border-x border-x-kb-border-tertiary bg-[image:repeating-linear-gradient(315deg,_var(--color-kb-border-tertiary)_0,_var(--color-kb-border-tertiary)_1px,_transparent_0,_transparent_50%)] bg-[size:10px_10px] bg-fixed max-lg:hidden" />

        {/* Footer divider */}
        <div className="col-span-full col-start-2 row-start-2 h-px bg-kb-border-tertiary" />

        {/* Footer sitemap */}
        <div className="row-start-3 lg:col-start-3">
          <DocsFooterSitemap className="max-w-2xl lg:max-w-5xl" />
        </div>

        {/* Footer meta divider */}
        <div className="col-span-full col-start-2 row-start-4 h-px bg-kb-border-tertiary" />

        {/* Footer meta */}
        <div className="row-start-5 grid lg:col-start-3">
          <DocsFooterMeta className="max-w-2xl lg:max-w-5xl" />
        </div>
      </div>
    </div>
  );
}
