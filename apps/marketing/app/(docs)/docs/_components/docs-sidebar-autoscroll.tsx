"use client";

import { useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function DocsSidebarAutoscroll({
  children,
}: {
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const activeLink = element.querySelector(
      "[data-autoscroll] [aria-current=page]"
    );
    if (!activeLink) return;

    if ("scrollIntoViewIfNeeded" in activeLink) {
      (activeLink as HTMLElement & { scrollIntoViewIfNeeded: () => void }).scrollIntoViewIfNeeded();
    } else {
      activeLink.scrollIntoView({ block: "nearest" });
    }
  }, [pathname]);

  return <div ref={ref}>{children}</div>;
}
