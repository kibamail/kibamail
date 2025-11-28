import * as NavigationMenu from "@radix-ui/react-navigation-menu";
import { Community, Donate } from "iconoir-react";
import { NavMenuLink } from "./nav-menu-link";
import { communityLinks } from "./nav-data";

export function CommunityMenu() {
  return (
    <NavigationMenu.Content className="NavigationMenuContent absolute top-0 left-0 w-full sm:w-auto">
      <div className="flex flex-col gap-3 p-4 min-w-[400px]">
        <div className="grid grid-cols-2 gap-3">
          <NavigationMenu.Link asChild>
            <a
              href="/community/forum"
              className="flex flex-col group hover:border-kb-border-tertiary items-center justify-center gap-3 py-7 px-5 rounded-lg bg-kb-bg-secondary hover:bg-kb-bg-hover border border-transparent transition-colors text-center"
            >
              <div className="w-12 h-12 flex items-center justify-center rounded-full bg-kb-bg-primary border border-transparent group-hover:border-kb-border-tertiary">
                <Community className="w-6 h-6 text-kb-content-highlight" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-kb-content-primary">
                  Visit the open forum
                </span>
                <span className="text-xs text-kb-content-tertiary dark:text-kb-content-secondary">
                  Ask questions, share ideas
                </span>
              </div>
            </a>
          </NavigationMenu.Link>

          <NavigationMenu.Link asChild>
            <a
              href="/community/contribute"
              className="flex flex-col group hover:border-kb-border-tertiary items-center justify-center gap-3 px-5 py-7 rounded-lg bg-kb-bg-secondary hover:bg-kb-bg-hover border border-transparent transition-colors text-center"
            >
              <div className="w-12 h-12 flex items-center justify-center rounded-full bg-kb-bg-primary border border-transparent group-hover:border-kb-border-tertiary">
                <Donate className="w-6 h-6 text-kb-content-positive" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-kb-content-primary">
                  Become a contributor
                </span>
                <span className="text-xs text-kb-content-tertiary dark:text-kb-content-secondary">
                  Help shape kibamail
                </span>
              </div>
            </a>
          </NavigationMenu.Link>
        </div>

        <div className="flex flex-col gap-1">
          {communityLinks.map((link) => (
            <NavMenuLink key={link.href} {...link} />
          ))}
        </div>
      </div>
    </NavigationMenu.Content>
  );
}
