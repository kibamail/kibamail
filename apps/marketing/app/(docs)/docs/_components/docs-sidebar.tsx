"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Book, Code, Rocket, Settings, Group, Building } from "iconoir-react";

import {
  NavList,
  NavListHeading,
  NavListItem,
  NavListItems,
  NavListLink,
} from "./nav-list";
import {
  getActiveSection,
  getNavigationForSection,
  topLevelSections,
  type SectionId,
  type SectionNavigation,
} from "./docs-navigation";

const sectionIcons: Record<SectionId, React.ComponentType<{ className?: string }>> = {
  docs: Book,
  api: Code,
  sdks: Settings,
  guides: Rocket,
  community: Group,
  company: Building,
};

function TopNavLink({
  href,
  isActive,
  children,
  icon: Icon,
}: {
  href: string;
  isActive?: boolean;
  children: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "group flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors font-sans!",
        isActive
          ? "bg-kb-surface-tertiary text-kb-content-primary"
          : "text-kb-content-secondary hover:bg-kb-surface-secondary hover:text-kb-content-primary"
      )}
    >
      <Icon
        className={clsx(
          "size-4",
          isActive
            ? "text-kb-content-primary"
            : "text-kb-content-tertiary group-hover:text-kb-content-secondary"
        )}
      />
      {children}
    </Link>
  );
}

function TopNav({ activeSection }: { activeSection: string }) {
  return (
    <nav className="flex flex-col gap-1">
      {topLevelSections.map((section) => {
        const Icon = sectionIcons[section.id];
        return (
          <TopNavLink
            key={section.id}
            href={section.href}
            icon={Icon}
            isActive={activeSection === section.id}
          >
            {section.label}
          </TopNavLink>
        );
      })}
    </nav>
  );
}

function SectionNavList({
  navigation,
  pathname,
}: {
  navigation: SectionNavigation;
  pathname: string;
}) {
  return (
    <>
      {navigation.map((section) => (
        <NavList key={section.title}>
          <NavListHeading>{section.title}</NavListHeading>
          <NavListItems>
            {section.items.map(([title, href, method]) => (
              <NavListItem key={href}>
                <NavListLink href={href} isActive={pathname === href} method={method}>
                  {title}
                </NavListLink>
              </NavListItem>
            ))}
          </NavListItems>
        </NavList>
      ))}
    </>
  );
}

export function DocsSidebar() {
  const pathname = usePathname();
  const activeSection = getActiveSection(pathname);
  const navigation = getNavigationForSection(activeSection);

  const [displayedNav, setDisplayedNav] = useState(navigation);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const prevSectionRef = useRef<SectionId>(activeSection);

  useEffect(() => {
    if (activeSection !== prevSectionRef.current) {
      // Section changed - start transition
      setIsTransitioning(true);

      // After fade out, update the content
      const fadeOutTimer = setTimeout(() => {
        setDisplayedNav(navigation);
      }, 150);

      // After content update, fade back in
      const fadeInTimer = setTimeout(() => {
        setIsTransitioning(false);
      }, 170);

      prevSectionRef.current = activeSection;

      return () => {
        clearTimeout(fadeOutTimer);
        clearTimeout(fadeInTimer);
      };
    }
    // Update navigation for same section (e.g., navigating within docs)
    setDisplayedNav(navigation);
  }, [activeSection, navigation]);

  return (
    <div className="flex flex-col gap-8" data-autoscroll>
      <TopNav activeSection={activeSection} />

      <div className="h-px bg-kb-border-tertiary" />

      <div
        className={clsx(
          "flex flex-col gap-8 transition-all duration-150 ease-in-out",
          isTransitioning
            ? "opacity-0 translate-x-2"
            : "opacity-100 translate-x-0"
        )}
      >
        <SectionNavList navigation={displayedNav} pathname={pathname} />
      </div>
    </div>
  );
}
