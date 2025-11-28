import { Button } from "@kibamail/owly";
import { LogoFullBrown } from "@/app//_components/_icons/logo-full-brown.svg";
import { LogoFullWhite } from "../_icons/logo-full-white.svg";
import { Navigation } from "./navigation";
import { NavArrowRight } from "iconoir-react";

export function Header() {
  return (
    <div className="w-full px-6 xl:px-0">
      <header className="w-full flex items-center h-20 justify-between max-w-7xl mx-auto">
        <LogoFullBrown className="h-8 dark:hidden" />
        <LogoFullWhite className="h-8 hidden dark:inline-block" />

        <Navigation />

        <div className="hidden lg:flex items-center gap-4">
          <Button variant="tertiary">Sign in</Button>
          <Button>
            Get started
            <NavArrowRight />
          </Button>
        </div>
      </header>
    </div>
  );
}
