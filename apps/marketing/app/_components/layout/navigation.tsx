import * as NavigationMenu from "@radix-ui/react-navigation-menu";
import {
  NavArrowDown,
  Spark,
  Code,
  GitFork,
  Book,
  GraduationCap,
  X,
  Community,
  Donate,
} from "iconoir-react";
import { Badge } from "@kibamail/owly";
import type { ReactNode } from "react";
import { EngageIcon } from "@/app/_components/_icons/engage.svg";
import { GithubIcon } from "@/app/_components/_icons/github.svg";
import { InboundIcon } from "@/app/_components/_icons/inbound.svg";
import { SendIcon } from "@/app/_components/_icons/send.svg";
import Link from "next/link";

interface NavMenuLinkProps {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
}

function NavMenuLink({ href, icon, title, description }: NavMenuLinkProps) {
  return (
    <NavigationMenu.Link asChild>
      <Link
        href={href}
        className="flex  items-center group gap-4 py-1 px-2 rounded-md hover:bg-kb-bg-secondary transition-colors"
      >
        {icon}
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-sans font-medium text-kb-content-primary">
            {title}
          </span>
          <span className="text-xs font-sans text-kb-content-tertiary dark:text-kb-content-secondary leading-relaxed">
            {description}
          </span>
        </div>
      </Link>
    </NavigationMenu.Link>
  );
}

const productLinks = [
  {
    href: "/products/transactional",
    icon: (
      <div className="w-10 h-10 flex items-center justify-center rounded-md bg-kb-bg-secondary border border-kb-border-tertiary dark:border-transparent group-hover:border-kb-border-tertiary">
        <SendIcon className="w-5 h-5 shrink-0 text-kb-content-negative" />
      </div>
    ),
    title: "Transactional emails",
    description: "Password reset emails, invoices, notifications and more.",
  },
  {
    href: "/products/marketing",
    icon: (
      <div className="w-10 h-10 flex items-center justify-center rounded-md bg-kb-bg-secondary border border-kb-border-tertiary dark:border-transparent group-hover:border-kb-border-tertiary">
        <EngageIcon className="w-5 h-5 shrink-0 text-kb-content-positive" />
      </div>
    ),
    title: "Marketing emails",
    description: "Campaigns, newsletters, and broadcasts that convert.",
  },
  {
    href: "/products/inbound",
    icon: (
      <div className="w-10 h-10 flex items-center justify-center rounded-md bg-kb-bg-secondary border border-kb-border-tertiary dark:border-transparent group-hover:border-kb-border-tertiary">
        <InboundIcon className="w-5 h-5 shrink-0 text-kb-content-brand" />
      </div>
    ),
    title: "Inbound emails",
    description: "Automate user replies, or let ai take care of your inbox.",
  },
];

const resourceLinks = [
  {
    href: "/docs/api",
    icon: (
      <div className="w-10 h-10 flex items-center justify-center rounded-md bg-kb-bg-secondary border border-kb-border-tertiary dark:border-transparent group-hover:border-kb-border-tertiary">
        <Code className="w-5 h-5 shrink-0 text-kb-content-positive" />
      </div>
    ),
    title: "API documentation",
    description: "Integrate Kibamail into your applications.",
  },
  {
    href: "/changelog",
    icon: (
      <div className="w-10 h-10 flex items-center justify-center rounded-md bg-kb-bg-secondary border border-kb-border-tertiary dark:border-transparent group-hover:border-kb-border-tertiary">
        <GitFork className="w-5 h-5 shrink-0 text-kb-content-highlight stroke-current" />
      </div>
    ),
    title: "Changelog",
    description: "Latest updates, features, and improvements.",
  },
  {
    href: "/blog",
    icon: (
      <div className="w-10 h-10 flex items-center justify-center rounded-md bg-kb-bg-secondary border border-kb-border-tertiary dark:border-transparent group-hover:border-kb-border-tertiary">
        <Book className="w-5 h-5 shrink-0 text-kb-content-info" />
      </div>
    ),
    title: "Blog",
    description: "Insights, tips, and email marketing best practices.",
  },
  {
    href: "/tutorials",
    icon: (
      <div className="w-10 h-10 flex items-center justify-center rounded-md bg-kb-bg-secondary border border-kb-border-tertiary dark:border-transparent group-hover:border-kb-border-tertiary">
        <GraduationCap className="w-5 h-5 shrink-0 text-kb-content-notice" />
      </div>
    ),
    title: "Tutorials",
    description: "Step-by-step guides to get the most out of Kibamail.",
  },
];

const communityLinks = [
  {
    href: "https://x.com/kibamail",
    icon: (
      <div className="w-10 h-10 flex items-center justify-center rounded-md bg-kb-bg-secondary border border-kb-border-tertiary dark:border-transparent group-hover:border-kb-border-tertiary">
        <X className="w-5 h-5 shrink-0 text-kb-content-primary" />
      </div>
    ),
    title: "X",
    description: "Follow us for updates and announcements.",
  },
  {
    href: "https://github.com/kibamail/kibamail",
    icon: (
      <div className="w-10 h-10 flex items-center justify-center rounded-md bg-kb-bg-secondary border border-kb-border-tertiary dark:border-transparent group-hover:border-kb-border-tertiary">
        <GithubIcon className="w-5 h-5 shrink-0 text-kb-content-primary" />
      </div>
    ),
    title: "GitHub",
    description: "Star the repo and explore the source code.",
  },
];

export function Navigation() {
  return (
    <NavigationMenu.Root
      className=" hidden xl:flex h-10 p-0.5 box-border rounded-lg items-center z-10 backdrop-blur-[20px] bg-kb-bg-brand dark:bg-kb-bg-secondary absolute left-[50%] translate-x-[-50%]"
      style={{
        border: "0.75px solid rgba(91, 47, 14, 0.20)",
        boxShadow: "0 1.5px 0 0 rgba(255, 255, 255, 0.50) inset",
      }}
    >
      <NavigationMenu.List className="flex items-center list-none m-0">
        <NavigationMenu.Item value="products">
          <NavigationMenu.Trigger className="flex font-sans items-center gap-0.5 rounded-md cursor-pointer h-8 px-4 text-white hover:bg-(--brown-600) dark:hover:bg-(--gray-400) dark:text-kb-content-primary text-sm outline-none select-none">
            Products
            <NavArrowDown className="NavigationMenuCaret w-4 h-4 mt-0.5 transition-transform duration-250 ease-in-out" />
          </NavigationMenu.Trigger>

          <NavigationMenu.Content className="NavigationMenuContent absolute top-0 left-0 w-full sm:w-auto">
            <div className="grid grid-cols-[380px_320px] gap-3 p-4">
              {/* Products List */}
              <div className="flex flex-col gap-1">
                {productLinks.map((link) => (
                  <NavMenuLink key={link.href} {...link} />
                ))}
              </div>

              {/* Automations Card */}
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
                    <h3 className="text-sm font-sans font-semibold text-white dark:text-kb-content-primary mb-1">
                      Automations
                    </h3>
                    <p className="text-xs font-sans text-white dark:ext-kb-content-primary leading-relaxed font-medium">
                      Unlimited email sequences at no additional cost
                    </p>
                  </div>
                </a>
              </NavigationMenu.Link>
            </div>
          </NavigationMenu.Content>
        </NavigationMenu.Item>

        <NavigationMenu.Item value="community">
          <NavigationMenu.Trigger className="flex font-sans items-center gap-0.5 rounded-md cursor-pointer h-8 px-4 text-white hover:bg-(--brown-600) dark:hover:bg-(--gray-400) dark:text-kb-content-primary text-sm outline-none select-none">
            Community
            <NavArrowDown className="NavigationMenuCaret w-4 h-4 mt-0.5 transition-transform duration-250 ease-in-out" />
          </NavigationMenu.Trigger>

          <NavigationMenu.Content className="NavigationMenuContent absolute top-0 left-0 w-full sm:w-auto">
            <div className="flex flex-col gap-3 p-4 min-w-[400px]">
              {/* Two vertical cards */}
              <div className="grid grid-cols-2 gap-3">
                <NavigationMenu.Link asChild>
                  <a
                    href="/community/forum"
                    className="flex flex-col items-center justify-center gap-3 py-7 px-5 rounded-lg bg-kb-bg-secondary hover:bg-kb-bg-hover border border-kb-border-tertiary dark:border-transparent transition-colors text-center"
                  >
                    <div className="w-12 h-12 flex items-center justify-center rounded-full bg-kb-bg-primary">
                      <Community className="w-6 h-6 text-kb-content-highlight" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-sans font-semibold text-kb-content-primary">
                        Visit the open forum
                      </span>
                      <span className="text-xs font-sans text-kb-content-tertiary dark:text-kb-content-secondary">
                        Ask questions, share ideas
                      </span>
                    </div>
                  </a>
                </NavigationMenu.Link>

                <NavigationMenu.Link asChild>
                  <a
                    href="/community/contribute"
                    className="flex flex-col items-center justify-center gap-3 px-5 py-7 rounded-lg bg-kb-bg-secondary hover:bg-kb-bg-hover border border-kb-border-tertiary dark:border-transparent transition-colors text-center"
                  >
                    <div className="w-12 h-12 flex items-center justify-center rounded-full bg-kb-bg-primary">
                      <Donate className="w-6 h-6 text-kb-content-positive" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-sans font-semibold text-kb-content-primary">
                        Become a contributor
                      </span>
                      <span className="text-xs font-sans text-kb-content-tertiary dark:text-kb-content-secondary">
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
        </NavigationMenu.Item>
        <NavigationMenu.Item value="resources">
          <NavigationMenu.Trigger className="flex font-sans items-center gap-0.5 rounded-md cursor-pointer h-8 px-4 text-white hover:bg-(--brown-600) dark:hover:bg-(--gray-400) dark:text-kb-content-primary text-sm outline-none select-none">
            Resources
            <NavArrowDown className="NavigationMenuCaret w-4 h-4 mt-0.5 transition-transform duration-250 ease-in-out" />
          </NavigationMenu.Trigger>

          <NavigationMenu.Content className="NavigationMenuContent absolute top-0 left-0 w-full sm:w-auto">
            <div className="flex flex-col gap-3 p-4 min-w-[400px]">
              {resourceLinks.map((link) => (
                <NavMenuLink key={link.href} {...link} />
              ))}
            </div>
          </NavigationMenu.Content>
        </NavigationMenu.Item>

        <NavigationMenu.Item
          asChild
          className="flex font-sans items-center rounded-md cursor-pointer h-8 px-4 text-white hover:bg-(--brown-600) dark:hover:bg-(--gray-400) dark:text-kb-content-primary text-sm"
        >
          <Link href="/pricing">Pricing</Link>
        </NavigationMenu.Item>
        <NavigationMenu.Item
          asChild
          className="flex font-sans gap-2 items-center rounded-md cursor-pointer h-8 px-4 text-white hover:bg-(--brown-600) dark:hover:bg-(--gray-400) dark:text-kb-content-primary text-sm"
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
