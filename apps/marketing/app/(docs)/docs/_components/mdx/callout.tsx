"use client";

import clsx from "clsx";
import { InfoCircle, WarningTriangle, WarningCircle, LightBulb } from "iconoir-react";

type CalloutType = "info" | "warning" | "danger" | "tip";

interface CalloutProps {
  type?: CalloutType;
  title?: string;
  children: React.ReactNode;
}

const calloutStyles: Record<
  CalloutType,
  { container: string; icon: string; title: string }
> = {
  info: {
    container: "bg-blue-50 border-blue-200",
    icon: "text-blue-600",
    title: "text-blue-900",
  },
  warning: {
    container: "bg-amber-50 border-amber-200",
    icon: "text-amber-600",
    title: "text-amber-900",
  },
  danger: {
    container: "bg-red-50 border-red-200",
    icon: "text-red-600",
    title: "text-red-900",
  },
  tip: {
    container: "bg-emerald-50 border-emerald-200",
    icon: "text-emerald-600",
    title: "text-emerald-900",
  },
};

const calloutIcons: Record<CalloutType, React.ComponentType<{ className?: string }>> = {
  info: InfoCircle,
  warning: WarningTriangle,
  danger: WarningCircle,
  tip: LightBulb,
};

const defaultTitles: Record<CalloutType, string> = {
  info: "Note",
  warning: "Warning",
  danger: "Danger",
  tip: "Tip",
};

export function Callout({ type = "info", title, children }: CalloutProps) {
  const styles = calloutStyles[type];
  const Icon = calloutIcons[type];
  const displayTitle = title || defaultTitles[type];

  return (
    <div
      className={clsx(
        "my-6 rounded-lg border p-4",
        styles.container
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className={clsx("size-5 mt-0.5 shrink-0", styles.icon)} />
        <div className="flex-1 min-w-0">
          <p className={clsx("font-semibold text-sm mb-1", styles.title)}>
            {displayTitle}
          </p>
          <div className="text-sm text-gray-700 [&>p]:mb-0 [&>p:last-child]:mb-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
