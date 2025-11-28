import type { ReactNode } from "react";

interface NavIconWrapperProps {
  children: ReactNode;
}

export function NavIconWrapper({ children }: NavIconWrapperProps) {
  return (
    <div className="w-10 h-10 flex items-center justify-center rounded-md bg-kb-bg-secondary border border-kb-border-tertiary dark:border-transparent group-hover:border-kb-border-tertiary">
      {children}
    </div>
  );
}
