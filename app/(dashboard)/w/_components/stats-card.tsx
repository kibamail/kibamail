"use client";

import clsx from "clsx";
import type { PropsWithChildren } from "react";

interface StatsCardProps extends PropsWithChildren {
  className?: string;
}

interface StatsCardItemProps extends PropsWithChildren {
  className?: string;
}

/**
 * StatsCard Container
 * 
 * A card component for displaying statistics with rounded corners,
 * padding, and tertiary border styling.
 */
export function StatsCard({ children, className }: StatsCardProps) {
  return (
    <div
      className={clsx(
        "w-full rounded-3xl border border-kb-border-tertiary bg-kb-surface-primary overflow-hidden",
        className
      )}
    >
      <div className="flex divide-x divide-kb-border-tertiary h-full">
        {children}
      </div>
    </div>
  );
}

/**
 * StatsCardItem
 * 
 * Individual stat item within a StatsCard. Items are automatically
 * separated by vertical borders using CSS divide utilities.
 */
export function StatsCardItem({ children, className }: StatsCardItemProps) {
  return (
    <div
      className={clsx(
        "flex-1 p-6",
        className
      )}
    >
      {children}
    </div>
  );
}
