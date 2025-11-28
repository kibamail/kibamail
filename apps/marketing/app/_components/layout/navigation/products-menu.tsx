import * as NavigationMenu from "@radix-ui/react-navigation-menu";
import { Spark } from "iconoir-react";
import { Badge } from "@kibamail/owly";
import { NavMenuLink } from "./nav-menu-link";
import { productLinks } from "./nav-data";

export function ProductsMenu() {
  return (
    <NavigationMenu.Content className="NavigationMenuContent absolute top-0 left-0 w-full sm:w-auto">
      <div className="grid grid-cols-[380px_320px] gap-3 p-4">
        <div className="flex flex-col gap-1">
          {productLinks.map((link) => (
            <NavMenuLink key={link.href} {...link} />
          ))}
        </div>

        <NavigationMenu.Link asChild>
          <a
            href="/features/automations"
            className="relative flex flex-col justify-end p-4 h-full min-h-[200px] rounded-lg bg-kb-bg-secondary bg-cover bg-center overflow-hidden group"
            style={{
              backgroundImage: "url('/images/automations.webp')",
            }}
          >
            <Badge
              className="absolute top-3 dark:hidden"
              size="sm"
              variant="neutral"
            >
              Try it now
              <Spark />
            </Badge>
            <Badge
              className="absolute top-3 hidden dark:inline-block"
              size="sm"
              variant="info"
            >
              Try it now
              <Spark />
            </Badge>
            <div className="relative z-10">
              <h3 className="text-sm font-semibold text-white dark:text-kb-content-primary mb-1">
                Automations
              </h3>
              <p className="text-xs text-white dark:ext-kb-content-primary leading-relaxed font-medium">
                Unlimited email sequences at no additional cost
              </p>
            </div>
          </a>
        </NavigationMenu.Link>
      </div>
    </NavigationMenu.Content>
  );
}
