import * as NavigationMenu from "@radix-ui/react-navigation-menu";
import { NavArrowDown } from "iconoir-react";
import { GithubIcon } from "../../_icons/github.svg";
import { ProductsMenu } from "./products-menu";
import { ResourcesMenu } from "./resources-menu";
import { CommunityMenu } from "./community-menu";

export function Navigation() {
  return (
    <NavigationMenu.Root
      className="relative h-10 p-0.5 box-border rounded-lg flex items-center z-10 backdrop-blur-[20px] bg-kb-bg-brand dark:bg-kb-bg-secondary"
      style={{
        border: "0.75px solid rgba(91, 47, 14, 0.20)",
        boxShadow: "0 1.5px 0 0 rgba(255, 255, 255, 0.50) inset",
      }}
    >
      <NavigationMenu.List className="flex items-center list-none m-0">
        <NavigationMenu.Item>
          <NavigationMenu.Trigger className="flex items-center gap-0.5 rounded-md cursor-pointer h-8 px-4 text-white hover:bg-(--brown-600) dark:hover:bg-(--gray-400) dark:text-kb-content-primary text-sm outline-none select-none">
            Products
            <NavArrowDown className="NavigationMenuCaret w-4 h-4 mt-0.5 transition-transform duration-250 ease-in-out" />
          </NavigationMenu.Trigger>
          <ProductsMenu />
        </NavigationMenu.Item>

        <NavigationMenu.Item>
          <NavigationMenu.Trigger className="flex items-center gap-0.5 rounded-md cursor-pointer h-8 px-4 text-white hover:bg-(--brown-600) dark:hover:bg-(--gray-400) dark:text-kb-content-primary text-sm outline-none select-none">
            Resources
            <NavArrowDown className="NavigationMenuCaret w-4 h-4 mt-0.5 transition-transform duration-250 ease-in-out" />
          </NavigationMenu.Trigger>
          <ResourcesMenu />
        </NavigationMenu.Item>

        <NavigationMenu.Item>
          <NavigationMenu.Trigger className="flex items-center gap-0.5 rounded-md cursor-pointer h-8 px-4 text-white hover:bg-(--brown-600) dark:hover:bg-(--gray-400) dark:text-kb-content-primary text-sm outline-none select-none">
            Community
            <NavArrowDown className="NavigationMenuCaret w-4 h-4 mt-0.5 transition-transform duration-250 ease-in-out" />
          </NavigationMenu.Trigger>
          <CommunityMenu />
        </NavigationMenu.Item>

        <NavigationMenu.Item className="flex items-center rounded-md cursor-pointer h-8 px-4 text-white hover:bg-(--brown-600) dark:hover:bg-(--gray-400) dark:text-kb-content-primary text-sm">
          Pricing
        </NavigationMenu.Item>

        <NavigationMenu.Item
          asChild
          className="flex gap-2 items-center rounded-md cursor-pointer h-8 px-4 text-white hover:bg-(--brown-600) dark:hover:bg-(--gray-400) dark:text-kb-content-primary text-sm"
        >
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://github.com/kibamail/kibamail"
          >
            <GithubIcon className="w-4 h-4" />
            0.7k stars
          </a>
        </NavigationMenu.Item>

        <NavigationMenu.Indicator className="NavigationMenuIndicator z-20 flex items-end justify-center h-2.5 top-full overflow-hidden transition-[width,transform] duration-250 ease-in-out">
          <div className="relative top-[70%] bg-kb-bg-primary w-2.5 h-2.5 rotate-45 rounded-tl-sm shadow-[0_-2px_5px_-2px_rgba(22,23,24,0.1)]" />
        </NavigationMenu.Indicator>
      </NavigationMenu.List>

      <div className="absolute top-full left-0 perspective-[2000px]">
        <NavigationMenu.Viewport className="NavigationMenuViewport relative mt-[7px] w-(--radix-navigation-menu-viewport-width) h-(--radix-navigation-menu-viewport-height) origin-[top_center] bg-kb-bg-primary overflow-hidden rounded-md shadow-[0_10px_38px_-10px_rgba(22,23,24,0.35),0_10px_20px_-15px_rgba(22,23,24,0.2)] transition-[width,height] duration-300 ease-in-out" />
      </div>
    </NavigationMenu.Root>
  );
}
