import * as NavigationMenu from "@radix-ui/react-navigation-menu";
import type { ReactNode } from "react";

export interface NavMenuLinkProps {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
}

export function NavMenuLink({
  href,
  icon,
  title,
  description,
}: NavMenuLinkProps) {
  return (
    <NavigationMenu.Link asChild>
      <a
        href={href}
        className="flex items-center group gap-4 py-1 px-2 rounded-md hover:bg-kb-bg-secondary transition-colors"
      >
        {icon}
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-kb-content-primary">
            {title}
          </span>
          <span className="text-xs text-kb-content-tertiary dark:text-kb-content-secondary leading-relaxed">
            {description}
          </span>
        </div>
      </a>
    </NavigationMenu.Link>
  );
}
