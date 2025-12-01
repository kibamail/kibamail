import { Button } from "@kibamail/owly";
import { LogoFullBrown } from "@/app/_components/_icons/logo-full-brown.svg";
import { LogoFullWhite } from "@/app/_components/_icons/logo-full-white.svg";
import { Navigation } from "./navigation";
import { NavArrowRight } from "iconoir-react";
import Link from "next/link";

export function Header() {
  return (
    <div className="w-full px-6 xl:px-0">
      <header className="w-full flex items-center h-20 justify-between max-w-7xl mx-auto">
        <Link className="dark:hidden inline-block" href="/">
          <LogoFullBrown className="h-8" />
        </Link>
        <Link href="/" className="hidden dark:inline-block">
          <LogoFullWhite className="h-8" />
        </Link>

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
