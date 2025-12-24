import clsx from "clsx";

const methodColors: Record<string, string> = {
  GET: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20",
  POST: "bg-blue-500/10 text-blue-600 ring-blue-500/20",
  PUT: "bg-amber-500/10 text-amber-600 ring-amber-500/20",
  PATCH: "bg-orange-500/10 text-orange-600 ring-orange-500/20",
  DELETE: "bg-red-500/10 text-red-600 ring-red-500/20",
};

interface MethodBadgeProps {
  method: string;
  size?: "sm" | "md" | "lg";
}

export function MethodBadge({ method, size = "md" }: MethodBadgeProps) {
  const colors = methodColors[method] || "bg-gray-500/10 text-gray-600 ring-gray-500/20";

  return (
    <span
      className={clsx(
        "inline-flex items-center font-mono font-semibold uppercase ring-1 ring-inset",
        colors,
        size === "sm" && "rounded px-1.5 py-0.5 text-[10px]",
        size === "md" && "rounded-md px-2 py-1 text-xs",
        size === "lg" && "rounded-md px-2.5 py-1.5 text-sm"
      )}
    >
      {method}
    </span>
  );
}
