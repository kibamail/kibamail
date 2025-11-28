import * as NavigationMenu from "@radix-ui/react-navigation-menu";
import { NavMenuLink } from "./nav-menu-link";
import { resourceLinks } from "./nav-data";

export function ResourcesMenu() {
  return (
    <NavigationMenu.Content className="NavigationMenuContent absolute top-0 left-0 w-full sm:w-auto">
      <div className="flex flex-col gap-1 p-4 min-w-[440px]">
        {resourceLinks.map((link) => (
          <NavMenuLink key={link.href} {...link} />
        ))}
      </div>
    </NavigationMenu.Content>
  );
}
